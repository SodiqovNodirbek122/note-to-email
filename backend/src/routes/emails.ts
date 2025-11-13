import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { emailSendLimiter } from '../middleware/rateLimiter';
import { AuthRequest, SendEmailRequest } from '../types';
import { TemplateEngine } from '../services/templateEngine';
import { EmailService } from '../services/emailService';
import { NylasEmailService } from '../services/nylasEmailService';

const router = express.Router();
const templateEngine = new TemplateEngine();
const emailService = new EmailService();
const nylasService = new NylasEmailService();

// Send email
router.post('/send', authenticateToken, emailSendLimiter, async (req: AuthRequest, res) => {
  try {
    const { note_id, template_id, recipients, idempotency_key }: SendEmailRequest = req.body;

    if (!note_id || !template_id || !recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Note ID, template ID, and recipients are required'
      });
    }

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotency_key || uuidv4();

    // Check for existing email with same idempotency key
    const existingEmail = await pool.query(
      'SELECT * FROM sent_emails WHERE idempotency_key = $1',
      [finalIdempotencyKey]
    );

    if (existingEmail.rows.length > 0) {
      const existing = existingEmail.rows[0];
      return res.json({
        success: true,
        data: {
          id: existing.id,
          status: existing.status,
          message: 'Email already processed (idempotent)',
          sent_at: existing.sent_at
        }
      });
    }

    // Get template
    const templateResult = await pool.query(
      'SELECT * FROM email_templates WHERE id = $1 AND user_id = $2 AND is_active = true',
      [template_id, req.user!.id]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Get note
    const noteResult = await pool.query(
      'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
      [note_id, req.user!.id]
    );

    if (noteResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const template = templateResult.rows[0];
    const note = noteResult.rows[0];

    // Render template with note data
    const rendered = templateEngine.renderTemplate(template, note);

    // Create sent email record
    const sentEmailResult = await pool.query(
      `INSERT INTO sent_emails (user_id, note_id, template_id, template_version, idempotency_key, recipients, subject, body_html, body_text, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING *`,
      [
        req.user!.id,
        note_id,
        template_id,
        template.version,
        finalIdempotencyKey,
        recipients,
        rendered.subject,
        rendered.body_html,
        rendered.body_text
      ]
    );

    const sentEmail = sentEmailResult.rows[0];

    try {
      // Check if user has Nylas auth first, fallback to Gmail
      const userResult = await pool.query(
        'SELECT nylas_access_token, has_nylas_auth, gmail_access_token, gmail_refresh_token FROM users WHERE id = $1',
        [req.user!.id]
      );
      
      const userData = userResult.rows[0];
      let sendResult;

      if (userData.has_nylas_auth && userData.nylas_access_token) {
        // Use Nylas for sending
        sendResult = await nylasService.sendEmail(
          userData.nylas_access_token, // This is the grantId
          recipients,
          rendered.subject,
          rendered.body_html,
          rendered.body_text
        );
      } else if (userData.gmail_access_token || userData.gmail_refresh_token) {
        // Fallback to Gmail
        sendResult = await emailService.sendEmail(
          req.user!,
          recipients,
          rendered.subject,
          rendered.body_html,
          rendered.body_text
        );
      } else {
        throw new Error('No email service configured. Please authorize Nylas or Gmail.');
      }

      if (sendResult.success) {
        // Update status to sent
        await emailService.updateSentEmailStatus(
          sentEmail.id,
          'sent',
          sendResult.messageId
        );

        res.json({
          success: true,
          data: {
            id: sentEmail.id,
            status: 'sent',
            message: 'Email sent successfully',
            message_id: sendResult.messageId
          }
        });
      } else {
        // Update status to failed
        await emailService.updateSentEmailStatus(
          sentEmail.id,
          'failed',
          undefined,
          sendResult.error
        );

        res.status(500).json({
          success: false,
          error: 'Failed to send email',
          details: sendResult.error
        });
      }
    } catch (sendError) {
      // Update status to failed
      await emailService.updateSentEmailStatus(
        sentEmail.id,
        'failed',
        undefined,
        sendError instanceof Error ? sendError.message : 'Unknown error'
      );

      throw sendError;
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// Get sent emails history
router.get('/sent', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT se.*, n.title as note_title, et.name as template_name
       FROM sent_emails se
       JOIN notes n ON se.note_id = n.id
       JOIN email_templates et ON se.template_id = et.id
       WHERE se.user_id = $1
       ORDER BY se.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM sent_emails WHERE user_id = $1',
      [req.user!.id]
    );

    res.json({
      success: true,
      data: {
        emails: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sent emails' });
  }
});

// Get single sent email
router.get('/sent/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT se.*, n.title as note_title, n.content as note_content, et.name as template_name
       FROM sent_emails se
       JOIN notes n ON se.note_id = n.id
       JOIN email_templates et ON se.template_id = et.id
       WHERE se.id = $1 AND se.user_id = $2`,
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Sent email not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get sent email error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sent email' });
  }
});

// Retry failed email
router.post('/sent/:id/retry', authenticateToken, emailSendLimiter, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Get sent email record
    const sentEmailResult = await pool.query(
      'SELECT * FROM sent_emails WHERE id = $1 AND user_id = $2 AND status = $3',
      [id, req.user!.id, 'failed']
    );

    if (sentEmailResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Failed email not found' });
    }

    const sentEmail = sentEmailResult.rows[0];

    try {
      // Retry sending
      const sendResult = await emailService.sendEmail(
        req.user!,
        sentEmail.recipients,
        sentEmail.subject,
        sentEmail.body_html,
        sentEmail.body_text
      );

      if (sendResult.success) {
        // Update status to sent
        await emailService.updateSentEmailStatus(
          sentEmail.id,
          'sent',
          sendResult.messageId
        );

        res.json({
          success: true,
          data: {
            id: sentEmail.id,
            status: 'sent',
            message: 'Email sent successfully',
            message_id: sendResult.messageId
          }
        });
      } else {
        // Update error message
        await emailService.updateSentEmailStatus(
          sentEmail.id,
          'failed',
          undefined,
          sendResult.error
        );

        res.status(500).json({
          success: false,
          error: 'Failed to send email',
          details: sendResult.error
        });
      }
    } catch (sendError) {
      // Update error message
      await emailService.updateSentEmailStatus(
        sentEmail.id,
        'failed',
        undefined,
        sendError instanceof Error ? sendError.message : 'Unknown error'
      );

      throw sendError;
    }
  } catch (error) {
    console.error('Retry email error:', error);
    res.status(500).json({ success: false, error: 'Failed to retry email' });
  }
});

// Get messages from Nylas (like your curl example)
router.get('/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { limit = 5, unread = false } = req.query;
    
    // Get user's Nylas token
    const userResult = await pool.query(
      'SELECT nylas_access_token, has_nylas_auth FROM users WHERE id = $1',
      [req.user!.id]
    );
    
    const userData = userResult.rows[0];
    
    if (!userData.has_nylas_auth || !userData.nylas_access_token) {
      return res.status(400).json({
        success: false,
        error: 'Nylas authorization required'
      });
    }

    // Get messages using Nylas
    const messages = await nylasService.getMessages(
      userData.nylas_access_token,
      parseInt(limit as string),
      unread === 'true'
    );

    res.json({
      success: true,
      data: messages
    });

  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get messages'
    });
  }
});

export default router;

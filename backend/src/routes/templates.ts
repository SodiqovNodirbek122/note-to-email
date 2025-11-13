import express from 'express';
import pool from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest, EmailTemplate } from '../types';
import { TemplateEngine } from '../services/templateEngine';

const router = express.Router();
const templateEngine = new TemplateEngine();

// Get all templates for user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM email_templates WHERE user_id = $1 AND is_active = true ORDER BY updated_at DESC',
      [req.user!.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM email_templates WHERE id = $1 AND user_id = $2 AND is_active = true',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
});

// Create template
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, subject, body } = req.body;

    if (!name || !subject || !body) {
      return res.status(400).json({ success: false, error: 'Name, subject, and body are required' });
    }

    // Validate template syntax
    const validation = templateEngine.validateTemplate(subject, body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Template validation failed',
        details: validation.errors
      });
    }

    // Extract variables from template
    const variables = templateEngine.extractTemplateVariables(subject, body);

    const result = await pool.query(
      'INSERT INTO email_templates (user_id, name, subject, body, variables) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user!.id, name, subject, body, JSON.stringify(variables)]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body } = req.body;

    if (!name || !subject || !body) {
      return res.status(400).json({ success: false, error: 'Name, subject, and body are required' });
    }

    // Validate template syntax
    const validation = templateEngine.validateTemplate(subject, body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Template validation failed',
        details: validation.errors
      });
    }

    // Extract variables from template
    const variables = templateEngine.extractTemplateVariables(subject, body);

    const result = await pool.query(
      'UPDATE email_templates SET name = $1, subject = $2, body = $3, variables = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 AND is_active = true RETURNING *',
      [name, subject, body, JSON.stringify(variables), id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

// Delete template (soft delete)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE email_templates SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND is_active = true RETURNING id',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

// Preview template with note data
router.post('/:templateId/preview/:noteId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { templateId, noteId } = req.params;

    // Get template
    const templateResult = await pool.query(
      'SELECT * FROM email_templates WHERE id = $1 AND user_id = $2 AND is_active = true',
      [templateId, req.user!.id]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Get note
    const noteResult = await pool.query(
      'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
      [noteId, req.user!.id]
    );

    if (noteResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const template = templateResult.rows[0];
    const note = noteResult.rows[0];

    // Render template with note data
    const rendered = templateEngine.renderTemplate(template, note);

    res.json({
      success: true,
      data: rendered
    });
  } catch (error) {
    console.error('Template preview error:', error);
    res.status(500).json({ success: false, error: 'Failed to preview template' });
  }
});

export default router;

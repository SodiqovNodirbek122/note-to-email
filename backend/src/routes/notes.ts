import express from 'express';
import pool from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest, Note } from '../types';

const router = express.Router();

// Get all notes for user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user!.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notes' });
  }
});

// Get single note
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch note' });
  }
});

// Create note
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const result = await pool.query(
      'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user!.id, title, content]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ success: false, error: 'Failed to create note' });
  }
});

// Update note
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const result = await pool.query(
      'UPDATE notes SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
      [title, content, id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ success: false, error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete note' });
  }
});

export default router;

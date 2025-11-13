import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../database/connection';
import { User, AuthRequest } from '../types';

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = result.rows[0] as User;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid token' });
  }
};

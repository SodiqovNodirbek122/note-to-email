import rateLimit from 'express-rate-limit';

export const emailSendLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'), // 10 emails per window
  message: {
    success: false,
    error: 'Too many email requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for development
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

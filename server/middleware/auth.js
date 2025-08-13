// server/middleware/auth.js
import { verifyAccessToken } from '../config/jwt.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyAccessToken(token);
      
      // Check if token has valid structure
      if (!decoded.userId) {
        return res.status(401).json({ message: 'Invalid token structure' });
      }
      
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'User not found or inactive' });
      }

      req.user = user;
      next();
    } catch (tokenError) {
      // Handle specific JWT errors
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired', 
          error: 'TOKEN_EXPIRED',
          expiredAt: tokenError.expiredAt 
        });
      } else if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Invalid token', 
          error: 'INVALID_TOKEN' 
        });
      }
      
      throw tokenError;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};
// server/config/jwt.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const generateAccessToken = (payload) => {
  // Remove iat from options - it's automatically added by jwt.sign
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m'
  });
  
  console.log('Generated access token expires in:', process.env.JWT_EXPIRE || '15m');
  return token;
};

export const generateRefreshToken = (payload) => {
  // Remove iat from options - it's automatically added by jwt.sign
  const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });
  
  console.log('Generated refresh token expires in:', process.env.JWT_REFRESH_EXPIRE || '7d');
  return token;
};

export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      // Add clock tolerance for slight time differences
      clockTolerance: 10 // 10 seconds tolerance
    });
    return decoded;
  } catch (error) {
    console.error('Access token verification error:', error.message);
    throw error;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      // Add clock tolerance for slight time differences
      clockTolerance: 10 // 10 seconds tolerance
    });
    return decoded;
  } catch (error) {
    console.error('Refresh token verification error:', error.message);
    throw error;
  }
};
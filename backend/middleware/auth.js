const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { executeQuery } = require('../config/database');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Hash password
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Middleware to authenticate requests
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);
    
    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user is admin in database
    const query = 'SELECT * FROM admins WHERE id = ? AND is_active = 1';
    const result = await executeQuery(query, [req.user.userId]);
    
    if (!result.success || result.data.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    req.admin = result.data[0];
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying admin status'
    });
  }
};

// Middleware to check if user is authorized voter
const requireVoter = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user is authorized voter
    const query = 'SELECT * FROM voters WHERE id = ? AND is_authorized = 1';
    const result = await executeQuery(query, [req.user.userId]);
    
    if (!result.success || result.data.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Voter authorization required'
      });
    }
    
    req.voter = result.data[0];
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying voter status'
    });
  }
};

// Middleware to check if user is either admin or authorized voter
const requireAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user is admin
    const adminQuery = 'SELECT *, "admin" as user_type FROM admins WHERE id = ? AND is_active = 1';
    const adminResult = await executeQuery(adminQuery, [req.user.userId]);
    
    if (adminResult.success && adminResult.data.length > 0) {
      req.userInfo = adminResult.data[0];
      return next();
    }
    
    // Check if user is voter
    const voterQuery = 'SELECT *, "voter" as user_type FROM voters WHERE id = ? AND is_authorized = 1';
    const voterResult = await executeQuery(voterQuery, [req.user.userId]);
    
    if (voterResult.success && voterResult.data.length > 0) {
      req.userInfo = voterResult.data[0];
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'User not authorized'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying user authorization'
    });
  }
};

// Login rate limiting data
const loginAttempts = new Map();

// Rate limiting for login attempts
const loginRateLimit = (req, res, next) => {
  const identifier = req.ip + (req.body.email || req.body.matricNumber || '');
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  // Clean old attempts
  const attempts = loginAttempts.get(identifier) || [];
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
      retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000)
    });
  }
  
  // Add current attempt
  recentAttempts.push(now);
  loginAttempts.set(identifier, recentAttempts);
  
  next();
};

// Validate matriculation number format
const validateMatricNumber = (matricNumber) => {
  // Format: DE.YYYY/NNNN (e.g., DE.2021/4001)
  const matricRegex = /^[A-Z]{2}\.\d{4}\/\d{4}$/;
  return matricRegex.test(matricNumber);
};

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

// Generate session token for voter
const generateSessionToken = (voterId, sessionType = 'voting') => {
  const payload = {
    voterId,
    sessionType,
    timestamp: Date.now()
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
};

// Verify session token
const verifySessionToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update last login
const updateLastLogin = async (userType, userId) => {
  try {
    const table = userType === 'admin' ? 'admins' : 'voters';
    const query = `UPDATE ${table} SET last_login = NOW() WHERE id = ?`;
    await executeQuery(query, [userId]);
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

// Log authentication events
const logAuthEvent = async (userType, userId, event, ipAddress, userAgent) => {
  try {
    const query = `
      INSERT INTO audit_logs (user_type, user_id, action, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    await executeQuery(query, [userType, userId, event, ipAddress, userAgent]);
  } catch (error) {
    console.error('Error logging auth event:', error);
  }
};

// Clear login attempts after successful login
const clearLoginAttempts = (identifier) => {
  loginAttempts.delete(identifier);
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  authenticate,
  requireAdmin,
  requireVoter,
  requireAuth,
  loginRateLimit,
  validateMatricNumber,
  validateEmail,
  validatePassword,
  generateSessionToken,
  verifySessionToken,
  updateLastLogin,
  logAuthEvent,
  clearLoginAttempts
};

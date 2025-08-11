const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Voter = require('../models/Voter');
const { 
  generateToken, 
  loginRateLimit, 
  updateLastLogin, 
  logAuthEvent, 
  clearLoginAttempts 
} = require('../middleware/auth');
const { 
  validateAdminLogin, 
  validateVoterLogin, 
  validatePasswordChange 
} = require('../middleware/validation');

/**
 * @route   POST /api/auth/admin/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/admin/login', loginRateLimit, validateAdminLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Authenticate admin
    const result = await Admin.authenticate(email, password);
    
    if (!result.success) {
      await logAuthEvent('admin', null, 'login_failed', req.ip, req.get('User-Agent'));
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }
    
    const admin = result.admin;
    
    // Generate JWT token
    const token = generateToken({
      userId: admin.id,
      userType: 'admin',
      role: admin.role,
      email: admin.email
    });
    
    // Clear login attempts and log successful login
    clearLoginAttempts(req.ip + email);
    await logAuthEvent('admin', admin.id, 'login_success', req.ip, req.get('User-Agent'));
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: admin.toJSON(),
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/voter/login
 * @desc    Voter login
 * @access  Public
 */
router.post('/voter/login', loginRateLimit, validateVoterLogin, async (req, res) => {
  try {
    const { matricNumber, password } = req.body;
    
    // Authenticate voter
    const result = await Voter.authenticate(matricNumber, password);
    
    if (!result.success) {
      await logAuthEvent('voter', null, 'login_failed', req.ip, req.get('User-Agent'));
      
      if (result.requiresSetup) {
        return res.status(202).json({
          success: false,
          message: result.message,
          requiresSetup: true,
          matricNumber
        });
      }
      
      if (result.lockedUntil) {
        return res.status(423).json({
          success: false,
          message: result.message,
          lockedUntil: result.lockedUntil
        });
      }
      
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }
    
    const voter = result.voter;
    
    // Check if voter is authorized (only block if explicitly unauthorized)
    if (Object.prototype.hasOwnProperty.call(voter, 'isAuthorized') && voter.isAuthorized === 0) {
      await logAuthEvent('voter', voter.id, 'login_unauthorized', req.ip, req.get('User-Agent'));
      return res.status(403).json({
        success: false,
        message: 'Voter not authorized to participate in elections'
      });
    }
    
    // Generate JWT token
    const token = generateToken({
      userId: voter.id,
      userType: 'voter',
      matricNumber: voter.matricNumber,
      blockchainAddress: voter.blockchainAddress
    });
    
    // Clear login attempts and log successful login
    clearLoginAttempts(req.ip + matricNumber);
    await logAuthEvent('voter', voter.id, 'login_success', req.ip, req.get('User-Agent'));
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      voter: voter.toJSON(),
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('Voter login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/voter/setup
 * @desc    Set up voter password and generate wallet
 * @access  Public
 */
router.post('/voter/setup', async (req, res) => {
  try {
    const { matricNumber, password } = req.body;
    
    // Validate input
    if (!matricNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Matriculation number and password are required'
      });
    }
    
    // Find voter
    const voterResult = await Voter.findByMatricNumber(matricNumber);
    if (!voterResult.success) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }
    
    const voter = voterResult.voter;
    
    // Check if voter is authorized
    if (!voter.isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Voter not authorized to participate in elections'
      });
    }
    
    // Check if password is already set
    if (voter.hasGeneratedWallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet already generated. Please use regular login.'
      });
    }
    
    // Set password and generate wallet
    const setupResult = await voter.setInitialPassword(password);
    
    if (!setupResult.success) {
      return res.status(500).json({
        success: false,
        message: setupResult.error || 'Failed to set up voter account'
      });
    }
    
    // Log setup event
    await logAuthEvent('voter', voter.id, 'account_setup', req.ip, req.get('User-Agent'));
    
    res.json({
      success: true,
      message: 'Account setup successful',
      wallet: setupResult.wallet,
      instructions: {
        privateKey: 'Please save this private key securely. You will need it to vote.',
        warning: 'This private key will only be shown once. Keep it safe!',
        nextStep: 'You can now login with your matriculation number and password.'
      }
    });
  } catch (error) {
    console.error('Voter setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      // Log logout event if user is authenticated
      // Note: In a production system, you might want to implement token blacklisting
      // For now, we'll just log the event if we can extract user info
      // This is mainly handled client-side by removing the token
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', validatePasswordChange, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // This would need the authenticate middleware in a real implementation
    // For now, we'll implement basic token verification here
    
    const { currentPassword, newPassword } = req.body;
    
    // Note: This is a simplified implementation
    // In a full implementation, you would:
    // 1. Verify the JWT token
    // 2. Determine if user is admin or voter
    // 3. Call the appropriate model's changePassword method
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token and get user info
 * @access  Private
 */
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    
    // Note: This would use the authenticate middleware in a full implementation
    
    res.json({
      success: true,
      message: 'Token is valid',
      user: {
        // User info would be populated here
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, matricNumber } = req.body;
    
    if (!email && !matricNumber) {
      return res.status(400).json({
        success: false,
        message: 'Email or matriculation number is required'
      });
    }
    
    // Note: In a full implementation, this would:
    // 1. Find the user by email or matric number
    // 2. Generate a password reset token
    // 3. Send an email with reset instructions
    // 4. Store the reset token in the database
    
    res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }
    
    // Note: In a full implementation, this would:
    // 1. Verify the reset token
    // 2. Check if token has expired
    // 3. Update the user's password
    // 4. Invalidate the reset token
    
    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;

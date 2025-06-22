const express = require('express');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');
const { 
  authenticateToken, 
  authRateLimit, 
  logRequest,
  corsOptions 
} = require('../middleware/auth');

const router = express.Router();

// Apply rate limiting to auth routes
const authLimiter = rateLimit(authRateLimit);

// Apply logging middleware
router.use(logRequest);

// Register new user
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'All fields are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
        code: 'USER_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login user
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message.includes('Invalid email or password')) {
      return res.status(401).json({
        error: error.message,
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (error.message.includes('verify your email')) {
      return res.status(401).json({
        error: error.message,
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    if (error.message.includes('deactivated')) {
      return res.status(401).json({
        error: error.message,
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const result = await authService.refreshToken(refreshToken);
    res.json(result);
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.message.includes('Invalid refresh token')) {
      return res.status(401).json({
        error: error.message,
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

// Forgot password
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        code: 'EMAIL_MISSING'
      });
    }

    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Password reset request failed',
      code: 'FORGOT_PASSWORD_ERROR'
    });
  }
});

// Reset password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token and new password are required',
        code: 'MISSING_RESET_DATA'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.message.includes('Invalid or expired reset token')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_RESET_TOKEN'
      });
    }

    res.status(500).json({
      error: 'Password reset failed',
      code: 'RESET_PASSWORD_ERROR'
    });
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required',
        code: 'VERIFICATION_TOKEN_MISSING'
      });
    }

    const result = await authService.verifyEmail(token);
    res.json(result);
  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error.message.includes('Invalid or expired verification token')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_VERIFICATION_TOKEN'
      });
    }

    res.status(500).json({
      error: 'Email verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// Resend verification email
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        code: 'EMAIL_MISSING'
      });
    }

    const result = await authService.resendVerification(email);
    res.json(result);
  } catch (error) {
    console.error('Resend verification error:', error);
    
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      });
    }

    if (error.message.includes('already verified')) {
      return res.status(400).json({
        error: error.message,
        code: 'EMAIL_ALREADY_VERIFIED'
      });
    }

    res.status(500).json({
      error: 'Resend verification failed',
      code: 'RESEND_VERIFICATION_ERROR'
    });
  }
});

// Get user profile (authenticated)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(500).json({
      error: 'Failed to get profile',
      code: 'GET_PROFILE_ERROR'
    });
  }
});

// Update user profile (authenticated)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(500).json({
      error: 'Failed to update profile',
      code: 'UPDATE_PROFILE_ERROR'
    });
  }
});

// Change password (authenticated)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORD_DATA'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error.message.includes('Current password is incorrect')) {
      return res.status(400).json({
        error: error.message,
        code: 'INCORRECT_CURRENT_PASSWORD'
      });
    }

    if (error.message.includes('User not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(500).json({
      error: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
});

// Delete account (authenticated)
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password is required to delete account',
        code: 'PASSWORD_REQUIRED'
      });
    }

    const result = await authService.deleteAccount(req.user.id, password);
    res.json(result);
  } catch (error) {
    console.error('Delete account error:', error);
    
    if (error.message.includes('Password is incorrect')) {
      return res.status(400).json({
        error: error.message,
        code: 'INCORRECT_PASSWORD'
      });
    }

    if (error.message.includes('User not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(500).json({
      error: 'Failed to delete account',
      code: 'DELETE_ACCOUNT_ERROR'
    });
  }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    try {
      const token = authService.generateToken(req.user);
      const refreshToken = authService.generateRefreshToken(req.user);
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
    }
  }
);

// Microsoft OAuth routes
router.get('/microsoft', passport.authenticate('microsoft', { 
  scope: ['user.read', 'files.read', 'files.read.all'] 
}));

router.get('/microsoft/callback', 
  passport.authenticate('microsoft', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    try {
      const token = authService.generateToken(req.user);
      const refreshToken = authService.generateRefreshToken(req.user);
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Microsoft OAuth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
    }
  }
);

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  // In a real implementation, you might want to blacklist the token
  // For now, we'll just return success and let the client remove the token
  res.json({ message: 'Logged out successfully' });
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'auth-service'
  });
});

module.exports = router; 
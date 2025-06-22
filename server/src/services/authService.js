const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const LocalStrategy = require('passport-local').Strategy;

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
    
    this.setupPassport();
  }

  setupPassport() {
    // Local Strategy
    passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        const user = await User.findByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.isActive) {
          return done(null, false, { message: 'Account is deactivated' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Update login history
        user.loginHistory.push({
          timestamp: new Date(),
          ip: '127.0.0.1', // Will be set from request
          userAgent: 'Unknown', // Will be set from request
          success: true
        });
        user.lastLogin = new Date();
        user.loginCount += 1;
        await user.save();

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));

    // Google Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
        scope: ['profile', 'email']
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findBySocialId('google', profile.id);
          
          if (!user) {
            // Create new user
            user = new User({
              email: profile.emails[0].value,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              displayName: profile.displayName,
              avatar: profile.photos[0]?.value,
              socialLogin: {
                provider: 'google',
                socialId: profile.id,
                accessToken,
                refreshToken
              },
              emailVerified: true
            });
            await user.save();
          } else {
            // Update existing user's social login info
            user.socialLogin.accessToken = accessToken;
            user.socialLogin.refreshToken = refreshToken;
            user.lastLogin = new Date();
            user.loginCount += 1;
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }));
    }

    // Microsoft Strategy
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      passport.use(new MicrosoftStrategy({
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/microsoft/callback`,
        scope: ['user.read', 'files.read', 'files.read.all']
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findBySocialId('microsoft', profile.id);
          
          if (!user) {
            // Create new user
            user = new User({
              email: profile.emails[0].value,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              displayName: profile.displayName,
              avatar: profile.photos[0]?.value,
              socialLogin: {
                provider: 'microsoft',
                socialId: profile.id,
                accessToken,
                refreshToken
              },
              emailVerified: true
            });
            await user.save();
          } else {
            // Update existing user's social login info
            user.socialLogin.accessToken = accessToken;
            user.socialLogin.refreshToken = refreshToken;
            user.lastLogin = new Date();
            user.loginCount += 1;
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }));
    }

    // Serialize user for session
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await User.findById(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
  }

  // Generate JWT token
  generateToken(user) {
    const payload = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      subscription: user.subscription.tier,
      isAdmin: user.isAdmin
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  // Generate refresh token
  generateRefreshToken(user) {
    const refreshToken = crypto.randomBytes(40).toString('hex');
    return refreshToken;
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Register new user
  async register(userData) {
    const { email, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry
    });

    await user.save();

    // Send verification email (implement email service)
    // await this.sendVerificationEmail(user.email, verificationToken);

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified
      },
      message: 'Registration successful. Please check your email to verify your account.'
    };
  }

  // Login user
  async login(email, password) {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    if (!user.emailVerified) {
      throw new Error('Please verify your email before logging in');
    }

    // Update login history
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatar: user.avatar,
        subscription: user.subscription,
        preferences: user.preferences,
        emailVerified: user.emailVerified
      },
      token,
      refreshToken
    };
  }

  // Refresh token
  async refreshToken(refreshToken) {
    // In a real implementation, you'd store refresh tokens in a separate collection
    // and validate them against the stored tokens
    // For now, we'll just generate a new token if the refresh token is valid
    
    // This is a simplified implementation
    const user = await User.findById(refreshToken); // Assuming refresh token is user ID for now
    if (!user) {
      throw new Error('Invalid refresh token');
    }

    const newToken = this.generateToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    return {
      token: newToken,
      refreshToken: newRefreshToken
    };
  }

  // Forgot password
  async forgotPassword(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If an account with this email exists, a password reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpiry = resetExpiry;
    await user.save();

    // Send password reset email (implement email service)
    // await this.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If an account with this email exists, a password reset link has been sent.' };
  }

  // Reset password
  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    return { message: 'Password has been reset successfully' };
  }

  // Verify email
  async verifyEmail(token) {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiry: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    return { message: 'Email verified successfully' };
  }

  // Resend verification email
  async resendVerification(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiry = verificationExpiry;
    await user.save();

    // Send verification email (implement email service)
    // await this.sendVerificationEmail(user.email, verificationToken);

    return { message: 'Verification email sent successfully' };
  }

  // Get user profile
  async getUserProfile(userId) {
    const user = await User.findById(userId).select('-password -emailVerificationToken -passwordResetToken');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    const allowedFields = ['firstName', 'lastName', 'displayName', 'preferences'];
    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    const user = await User.findByIdAndUpdate(
      userId,
      filteredData,
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  // Delete account
  async deleteAccount(userId, password) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Password is incorrect');
    }

    await User.findByIdAndDelete(userId);
    return { message: 'Account deleted successfully' };
  }
}

module.exports = new AuthService(); 
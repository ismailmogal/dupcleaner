// User Model for Phase 1 features
// This is separate from existing authentication to avoid breaking changes

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() { return !this.socialLogin; },
    minlength: [8, 'Password must be at least 8 characters long']
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [100, 'Display name cannot exceed 100 characters']
  },
  avatar: {
    type: String,
    default: null
  },

  // Authentication
  socialLogin: {
    provider: {
      type: String,
      enum: ['google', 'microsoft', null],
      default: null
    },
    socialId: {
      type: String,
      sparse: true
    },
    accessToken: String,
    refreshToken: String,
    tokenExpiry: Date
  },

  // Email Verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpiry: Date,

  // Password Reset
  passwordResetToken: String,
  passwordResetExpiry: Date,

  // Subscription & Billing
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'unpaid'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    trialEndsAt: Date
  },

  // Usage Tracking
  usage: {
    filesScanned: {
      type: Number,
      default: 0
    },
    duplicatesFound: {
      type: Number,
      default: 0
    },
    storageSaved: {
      type: Number,
      default: 0
    },
    lastScanDate: Date,
    monthlyScans: {
      type: Number,
      default: 0
    },
    monthlyLimit: {
      type: Number,
      default: 100 // Free tier limit
    }
  },

  // Cloud Providers
  cloudProviders: [{
    provider: {
      type: String,
      enum: ['onedrive', 'google-drive', 'dropbox', 'box'],
      required: true
    },
    name: String,
    accessToken: String,
    refreshToken: String,
    tokenExpiry: Date,
    accountId: String,
    accountEmail: String,
    isActive: {
      type: Boolean,
      default: true
    },
    lastSync: Date,
    storageQuota: {
      used: Number,
      total: Number
    }
  }],

  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    autoScan: {
      type: Boolean,
      default: false
    },
    scanFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    }
  },

  // Security
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ip: String,
    userAgent: String,
    location: String,
    success: Boolean
  }],

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'socialLogin.socialId': 1 });
userSchema.index({ 'subscription.tier': 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for subscription status
userSchema.virtual('isPremium').get(function() {
  return this.subscription.tier !== 'free' && this.subscription.status === 'active';
});

// Virtual for trial status
userSchema.virtual('isInTrial').get(function() {
  return this.subscription.trialEndsAt && this.subscription.trialEndsAt > new Date();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check usage limits
userSchema.methods.canPerformScan = function() {
  if (this.subscription.tier === 'enterprise') return true;
  if (this.subscription.tier === 'premium') return this.usage.monthlyScans < 1000;
  return this.usage.monthlyScans < this.usage.monthlyLimit;
};

// Instance method to increment usage
userSchema.methods.incrementUsage = function(filesScanned, duplicatesFound, storageSaved) {
  this.usage.filesScanned += filesScanned || 0;
  this.usage.duplicatesFound += duplicatesFound || 0;
  this.usage.storageSaved += storageSaved || 0;
  this.usage.monthlyScans += 1;
  this.usage.lastScanDate = new Date();
};

// Instance method to get active cloud providers
userSchema.methods.getActiveProviders = function() {
  return this.cloudProviders.filter(provider => provider.isActive);
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by social ID
userSchema.statics.findBySocialId = function(provider, socialId) {
  return this.findOne({
    'socialLogin.provider': provider,
    'socialLogin.socialId': socialId
  });
};

module.exports = mongoose.model('User', userSchema); 
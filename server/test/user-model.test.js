const User = require('../src/models/User');

describe('User Model', () => {
  beforeEach(() => {
    // Clear user data before each test
    User.users.clear();
    User.usage.clear();
  });

  describe('User Creation and Management', () => {
    test('should create a new user with default free tier', async () => {
      const user = await User.createUser('test-user-1', 'test@example.com');
      
      expect(user.id).toBe('test-user-1');
      expect(user.email).toBe('test@example.com');
      expect(user.subscriptionTier).toBe('free');
      expect(user.features).toContain('basic_scan');
      expect(user.features).toContain('single_folder');
      expect(user.usageCount).toBe(0);
    });

    test('should create a user with specified tier', async () => {
      const user = await User.createUser('test-user-2', 'premium@example.com', 'premium');
      
      expect(user.subscriptionTier).toBe('premium');
      expect(user.features).toContain('ai_detection');
      expect(user.features).toContain('multi_folder');
    });

    test('should get existing user', async () => {
      await User.createUser('test-user-3', 'test@example.com');
      const user = await User.getUser('test-user-3');
      
      expect(user).toBeTruthy();
      expect(user.id).toBe('test-user-3');
    });

    test('should return null for non-existent user', async () => {
      const user = await User.getUser('non-existent');
      expect(user).toBeNull();
    });
  });

  describe('Usage Tracking', () => {
    test('should track usage by operation type', async () => {
      const user = await User.createUser('test-user-4', 'test@example.com');
      
      await User.updateUsage('test-user-4', 'enhanced_ai_scan');
      await User.updateUsage('test-user-4', 'multi_folder_scan');
      await User.updateUsage('test-user-4', 'enhanced_ai_scan');
      
      const usage = await User.getUserUsage('test-user-4');
      
      expect(usage.enhanced_ai_scan).toBe(2);
      expect(usage.multi_folder_scan).toBe(1);
      expect(usage.bulk_actions || 0).toBe(0);
    });

    test('should update user usage count', async () => {
      const user = await User.createUser('test-user-5', 'test@example.com');
      
      await User.updateUsage('test-user-5', 'scan');
      const updatedUser = await User.getUser('test-user-5');
      
      expect(updatedUser.usageCount).toBe(1);
    });
  });

  describe('Feature Access Control', () => {
    test('should allow free users to access ai_detection (temporary override)', async () => {
      const user = await User.createUser('test-user-6', 'test@example.com', 'free');
      
      const canUse = await User.canUseFeature('test-user-6', 'ai_detection');
      expect(canUse).toBe(true);
    });

    test('should enforce multi-folder scan limits for free users', async () => {
      const user = await User.createUser('test-user-7', 'test@example.com', 'free');
      
      // Free users get 3 multi-folder scans
      const canUse1 = await User.canUseFeature('test-user-7', 'multi_folder');
      expect(canUse1).toBe(true);
      
      // Simulate using all 3 scans
      await User.updateUsage('test-user-7', 'multi_folder_scan');
      await User.updateUsage('test-user-7', 'multi_folder_scan');
      await User.updateUsage('test-user-7', 'multi_folder_scan');
      
      const canUse2 = await User.canUseFeature('test-user-7', 'multi_folder');
      expect(canUse2).toBe(false);
    });

    test('should allow premium users unlimited access', async () => {
      const user = await User.createUser('test-user-8', 'test@example.com', 'premium');
      
      const canUseMulti = await User.canUseFeature('test-user-8', 'multi_folder');
      const canUseBulk = await User.canUseFeature('test-user-8', 'bulk_actions');
      
      expect(canUseMulti).toBe(true);
      expect(canUseBulk).toBe(true);
    });

    test('should return false for non-existent user', async () => {
      const canUse = await User.canUseFeature('non-existent', 'ai_detection');
      expect(canUse).toBe(false);
    });
  });

  describe('Subscription Management', () => {
    test('should update subscription tier', async () => {
      const user = await User.createUser('test-user-9', 'test@example.com', 'free');
      
      const updatedUser = await User.updateSubscription('test-user-9', 'premium');
      
      expect(updatedUser.subscriptionTier).toBe('premium');
      expect(updatedUser.features).toContain('ai_detection');
      expect(updatedUser.features).toContain('multi_folder');
    });

    test('should return null for non-existent user update', async () => {
      const result = await User.updateSubscription('non-existent', 'premium');
      expect(result).toBeNull();
    });
  });

  describe('Subscription Limits', () => {
    test('should return correct limits for free tier', () => {
      const limits = User.getSubscriptionLimits('free');
      
      expect(limits.aiScans).toBe(5);
      expect(limits.multiFolderScans).toBe(3);
      expect(limits.bulkActions).toBe(0);
      expect(limits.maxFiles).toBe(100);
    });

    test('should return unlimited limits for premium tier', () => {
      const limits = User.getSubscriptionLimits('premium');
      
      expect(limits.aiScans).toBe(-1);
      expect(limits.multiFolderScans).toBe(-1);
      expect(limits.bulkActions).toBe(-1);
      expect(limits.maxFiles).toBe(-1);
    });

    test('should return unlimited limits for enterprise tier', () => {
      const limits = User.getSubscriptionLimits('enterprise');
      
      expect(limits.aiScans).toBe(-1);
      expect(limits.multiFolderScans).toBe(-1);
      expect(limits.bulkActions).toBe(-1);
      expect(limits.maxFiles).toBe(-1);
    });

    test('should return free limits for unknown tier', () => {
      const limits = User.getSubscriptionLimits('unknown');
      
      expect(limits.aiScans).toBe(5);
      expect(limits.multiFolderScans).toBe(3);
    });
  });

  describe('Feature Lists', () => {
    test('should return correct features for free tier', () => {
      const features = User.getDefaultFeatures('free');
      
      expect(features).toContain('basic_scan');
      expect(features).toContain('single_folder');
      expect(features).not.toContain('ai_detection');
      expect(features).not.toContain('multi_folder');
    });

    test('should return correct features for premium tier', () => {
      const features = User.getDefaultFeatures('premium');
      
      expect(features).toContain('basic_scan');
      expect(features).toContain('single_folder');
      expect(features).toContain('ai_detection');
      expect(features).toContain('multi_folder');
      expect(features).toContain('bulk_actions');
    });

    test('should return correct features for enterprise tier', () => {
      const features = User.getDefaultFeatures('enterprise');
      
      expect(features).toContain('basic_scan');
      expect(features).toContain('single_folder');
      expect(features).toContain('ai_detection');
      expect(features).toContain('multi_folder');
      expect(features).toContain('bulk_actions');
      expect(features).toContain('analytics');
      expect(features).toContain('team_collaboration');
    });
  });
}); 
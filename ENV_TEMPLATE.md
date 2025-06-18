# Environment Configuration Template

## 📝 Production Environment Setup

Create a `client/.env.production` file with the following configuration:

```env
# Microsoft Graph API Configuration (Required)
# Get these from Azure Portal > App Registrations > Your App
VITE_CLIENT_ID=your_azure_app_client_id_here
VITE_TENANT_ID=your_azure_tenant_id_here
VITE_REDIRECT_URI=https://yourdomain.com

# Optional: Google Analytics (Recommended for production)
# Get this from Google Analytics > Admin > Property Settings
VITE_GA_TRACKING_ID=G-XXXXXXXXXX

# Optional: Feature Flags
# Set to true/false to enable/disable features
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_TEAM_FEATURES=true
VITE_ENABLE_ANALYTICS=true

# Optional: Sentry Error Tracking (Recommended for production)
# Get this from Sentry > Settings > Projects > Your Project
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Optional: App Configuration
VITE_APP_NAME="OneDrive Duplicate Finder"
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production

# Optional: API Configuration
VITE_API_TIMEOUT=30000
VITE_MAX_FILE_SIZE=1000000000  # 1GB in bytes

# Optional: UI Configuration
VITE_DEFAULT_THEME=auto
VITE_ENABLE_ANIMATIONS=true
VITE_ENABLE_KEYBOARD_SHORTCUTS=true
```

---

## 🔧 How to Get Required Values

### 1. **Azure App Registration**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Create new registration or select existing
4. Copy **Application (client) ID** → `VITE_CLIENT_ID`
5. Copy **Directory (tenant) ID** → `VITE_TENANT_ID`

### 2. **Google Analytics**
1. Go to [Google Analytics](https://analytics.google.com)
2. Create new property or select existing
3. Go to **Admin** > **Property Settings**
4. Copy **Measurement ID** → `VITE_GA_TRACKING_ID`

### 3. **Sentry Error Tracking**
1. Go to [Sentry](https://sentry.io)
2. Create new project or select existing
3. Go to **Settings** > **Projects** > **Your Project**
4. Copy **DSN** → `VITE_SENTRY_DSN`

---

## 🚨 Important Notes

### Security
- **Never commit** `.env.production` to version control
- Add `.env.production` to `.gitignore`
- Use environment variables in hosting provider dashboard

### Domain Configuration
- Update `VITE_REDIRECT_URI` with your actual domain
- Configure Azure App Registration with same domain
- Ensure HTTPS is enabled

### Feature Flags
- Set `VITE_ENABLE_AI_FEATURES=true` for AI-powered detection
- Set `VITE_ENABLE_TEAM_FEATURES=true` for collaboration features
- Set `VITE_ENABLE_ANALYTICS=true` for user analytics

---

## 📋 Quick Setup Checklist

- [ ] Create `client/.env.production` file
- [ ] Add Azure Client ID and Tenant ID
- [ ] Set redirect URI to your domain
- [ ] Add Google Analytics ID (optional)
- [ ] Add Sentry DSN (optional)
- [ ] Configure feature flags
- [ ] Test build: `./deploy.sh build`
- [ ] Deploy: `./deploy.sh deploy vercel --prod`

---

*For more details, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)* 
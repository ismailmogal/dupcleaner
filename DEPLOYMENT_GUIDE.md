# Deployment Guide - OneDrive Duplicate Finder

## 🚀 Overview

This guide covers deploying your OneDrive Duplicate Finder app to various hosting providers. The app is a React-based SPA (Single Page Application) built with Vite that can be deployed to any static hosting service.

---

## ⚡ Quick Deployment (Recommended)

### For Immediate Deployment with Vercel:

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to project root
cd /Users/ismogal/OD-Dup

# 3. Deploy with one command
vercel --prod
```

**What happens:**
- Vercel detects your Vite project automatically
- Builds the app using `npm run build`
- Deploys to a production URL
- Provides HTTPS automatically

### For Custom Domain (dupcleaner.ai):
1. **Add domain** in Vercel dashboard
2. **Update DNS** to point to Vercel
3. **Configure Azure App Registration** with new domain

---

## 📋 Prerequisites

### Required Accounts
- **Microsoft Azure** - For OneDrive API access
- **Domain Registrar** - For your custom domain (e.g., dupcleaner.ai)
- **Hosting Provider** - Choose from options below

### Required Files
- Built application files (from `npm run build`)
- Environment configuration
- Domain SSL certificate

---

## 🏗️ Build Preparation

### 1. Build the Application

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Build for production
npm run build
```

The build creates a `dist/` folder with optimized static files.

### 2. Environment Configuration

Create a `.env.production` file in the client directory:

```env
# Microsoft Graph API Configuration
VITE_CLIENT_ID=your_azure_app_client_id
VITE_TENANT_ID=your_azure_tenant_id
VITE_REDIRECT_URI=https://yourdomain.com

# Optional: Analytics
VITE_GA_TRACKING_ID=your_google_analytics_id

# Optional: Feature flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_TEAM_FEATURES=true
```

### 3. Azure App Registration Setup

1. **Register your app** in Azure Portal
2. **Configure redirect URIs**:
   - `https://yourdomain.com`
   - `https://yourdomain.com/auth`
3. **Set required permissions**:
   - `Files.Read`
   - `Files.ReadWrite`
   - `User.Read`
   - `offline_access`

---

## 🌐 Hosting Provider Options

### 1. **Vercel** (Recommended for React Apps)

#### Setup
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Configuration
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### Advantages
- ✅ Automatic deployments from Git
- ✅ Built-in CDN and edge functions
- ✅ Free tier available
- ✅ Excellent React support
- ✅ Automatic HTTPS

#### Pricing
- **Free**: 100GB bandwidth/month
- **Pro**: $20/month, unlimited bandwidth

---

### 2. **Netlify**

#### Setup
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### Configuration
Create `netlify.toml`:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Advantages
- ✅ Easy deployment
- ✅ Form handling
- ✅ Free tier available
- ✅ Good CDN

#### Pricing
- **Free**: 100GB bandwidth/month
- **Pro**: $19/month, unlimited bandwidth

---

### 3. **GitHub Pages**

#### Setup
1. **Add GitHub Pages** to your repository
2. **Configure GitHub Actions**:

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd client
        npm install
        
    - name: Build
      run: |
        cd client
        npm run build
        
    - name: Deploy
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./client/dist
```

#### Advantages
- ✅ Free hosting
- ✅ Integrated with GitHub
- ✅ Automatic deployments

#### Disadvantages
- ❌ Limited to public repositories (free tier)
- ❌ No server-side features

---

### 4. **AWS S3 + CloudFront**

#### Setup
1. **Create S3 bucket**:
```bash
aws s3 mb s3://your-app-bucket
aws s3 website s3://your-app-bucket --index-document index.html --error-document index.html
```

2. **Upload files**:
```bash
aws s3 sync dist/ s3://your-app-bucket --delete
```

3. **Configure CloudFront** for CDN and HTTPS

#### Advantages
- ✅ Highly scalable
- ✅ Global CDN
- ✅ Enterprise-grade reliability

#### Pricing
- **S3**: ~$0.023/GB/month
- **CloudFront**: ~$0.085/GB transfer

---

### 5. **Firebase Hosting**

#### Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase
firebase init hosting

# Deploy
firebase deploy
```

#### Configuration
Create `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### Advantages
- ✅ Google's infrastructure
- ✅ Free tier available
- ✅ Easy SSL setup
- ✅ Good performance

#### Pricing
- **Free**: 10GB storage, 360MB/day transfer
- **Blaze**: Pay-as-you-go

---

## 🔧 Domain Configuration

### 1. **Custom Domain Setup**

#### For Vercel/Netlify:
1. **Add custom domain** in hosting dashboard
2. **Update DNS records**:
   ```
   Type: CNAME
   Name: @
   Value: your-app.vercel.app (or netlify.app)
   ```

#### For AWS CloudFront:
1. **Request SSL certificate** in AWS Certificate Manager
2. **Add domain** to CloudFront distribution
3. **Update DNS** to point to CloudFront

### 2. **SSL Certificate**

Most hosting providers provide **automatic SSL certificates**:
- ✅ Vercel: Automatic
- ✅ Netlify: Automatic
- ✅ GitHub Pages: Automatic
- ✅ Firebase: Automatic
- ✅ AWS: Manual setup required

### 3. **DNS Configuration**

Update your domain's DNS settings:
```
Type: CNAME
Name: @
Value: [your-hosting-provider-url]

Type: CNAME
Name: www
Value: [your-hosting-provider-url]
```

---

## 🔒 Security Configuration

### 1. **Environment Variables**

**Never commit sensitive data** to your repository:
```bash
# Add to .gitignore
.env
.env.local
.env.production
```

### 2. **CORS Configuration**

Configure Azure App Registration:
- **Allowed origins**: `https://yourdomain.com`
- **Allowed redirect URIs**: `https://yourdomain.com/auth`

### 3. **Content Security Policy**

Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://login.microsoftonline.com;
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               connect-src 'self' https://graph.microsoft.com https://login.microsoftonline.com;">
```

---

## 📊 Monitoring & Analytics

### 1. **Google Analytics**

Add to your app:
```javascript
// In your main App component
import { analytics } from './components/Analytics';

// Track page views
analytics.trackPageView(window.location.pathname);
```

### 2. **Error Monitoring**

Consider adding:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Google Analytics** for user behavior

### 3. **Performance Monitoring**

- **Web Vitals** tracking
- **Core Web Vitals** monitoring
- **Lighthouse** audits

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Build application successfully
- [ ] Test all features locally
- [ ] Configure environment variables
- [ ] Set up Azure App Registration
- [ ] Choose hosting provider
- [ ] Register domain name

### Deployment
- [ ] Upload build files
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Test authentication flow
- [ ] Verify all features work
- [ ] Check mobile responsiveness

### Post-Deployment
- [ ] Set up monitoring
- [ ] Configure analytics
- [ ] Test error handling
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation update

---

## 🔧 Troubleshooting

### Common Issues

#### 1. **Authentication Errors**
- **Problem**: "Invalid redirect URI"
- **Solution**: Update Azure App Registration with correct domain

#### 2. **CORS Errors**
- **Problem**: "Cross-origin request blocked"
- **Solution**: Configure CORS in Azure App Registration

#### 3. **Build Failures**
- **Problem**: Build errors in production
- **Solution**: Check environment variables and dependencies

#### 4. **Routing Issues**
- **Problem**: 404 errors on refresh
- **Solution**: Configure SPA routing in hosting provider

### Performance Optimization

#### 1. **Bundle Optimization**
- Enable code splitting
- Optimize images
- Use CDN for static assets

#### 2. **Caching Strategy**
- Set appropriate cache headers
- Use service workers for offline support
- Implement lazy loading

---

## 📈 Scaling Considerations

### 1. **Traffic Scaling**
- **CDN**: Use CloudFront or similar
- **Caching**: Implement proper caching strategies
- **Monitoring**: Set up alerts for high traffic

### 2. **Feature Scaling**
- **API Limits**: Monitor Microsoft Graph API usage
- **Storage**: Consider database for user preferences
- **Performance**: Optimize for large file sets

### 3. **Cost Optimization**
- **Bandwidth**: Monitor usage and optimize
- **Storage**: Clean up unused assets
- **CDN**: Choose appropriate pricing tier

---

## 🎯 Recommended Deployment Strategy

### For Production Launch:
1. **Start with Vercel** (easiest setup)
2. **Use dupcleaner.ai** domain
3. **Set up monitoring** with Google Analytics
4. **Configure error tracking** with Sentry
5. **Implement performance monitoring**

### For Enterprise:
1. **Use AWS S3 + CloudFront**
2. **Implement custom monitoring**
3. **Set up CI/CD pipeline**
4. **Add security scanning**
5. **Configure backup strategies**

---

## 📞 Support Resources

### Documentation
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [React Deployment](https://create-react-app.dev/docs/deployment/)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)

### Community
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Netlify Community](https://community.netlify.com/)
- [React Community](https://reactjs.org/community/support.html)

---

*Last updated: December 2024*
*For the latest updates, check the hosting provider's documentation* 
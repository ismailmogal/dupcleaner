# Quick Deployment Guide

## 🚀 One-Command Deployment

### For Immediate Production Deployment:

```bash
# Deploy to Vercel (Recommended)
./deploy.sh deploy vercel --prod

# Deploy to Netlify
./deploy.sh deploy netlify --prod

# Deploy to Firebase
./deploy.sh deploy firebase

# Deploy to AWS S3 (replace with your bucket name)
./deploy.sh deploy aws-s3 your-bucket-name
```

---

## 📋 Prerequisites

### 1. **Azure App Registration**
- Register your app in Azure Portal
- Get Client ID and Tenant ID
- Configure redirect URIs for your domain

### 2. **Environment Variables**
Create `client/.env.production`:
```env
VITE_CLIENT_ID=your_azure_client_id
VITE_TENANT_ID=your_azure_tenant_id
VITE_REDIRECT_URI=https://yourdomain.com
```

### 3. **Domain Setup**
- Register your domain (e.g., dupcleaner.ai)
- Point DNS to your hosting provider

---

## 🎯 Recommended Deployment Flow

### Step 1: Quick Deploy to Vercel
```bash
./deploy.sh deploy vercel --prod
```

### Step 2: Configure Custom Domain
1. Go to Vercel dashboard
2. Add your domain (e.g., dupcleaner.ai)
3. Update DNS records

### Step 3: Update Azure Configuration
1. Update redirect URIs in Azure App Registration
2. Add your production domain to allowed origins

### Step 4: Test Everything
- Test authentication flow
- Test duplicate detection
- Test all features

---

## 🔧 Available Commands

```bash
# Build only
./deploy.sh build

# Deploy to different providers
./deploy.sh deploy vercel [--prod]
./deploy.sh deploy netlify [--prod]
./deploy.sh deploy firebase
./deploy.sh deploy aws-s3 [bucket-name]
./deploy.sh deploy github-pages

# Get help
./deploy.sh help
```

---

## 🌐 Hosting Provider Comparison

| Provider | Setup Time | Free Tier | Custom Domain | SSL | CDN |
|----------|------------|-----------|---------------|-----|-----|
| **Vercel** | ⚡ 2 min | ✅ 100GB | ✅ Auto | ✅ Auto | ✅ |
| **Netlify** | ⚡ 3 min | ✅ 100GB | ✅ Auto | ✅ Auto | ✅ |
| **Firebase** | ⚡ 5 min | ✅ 10GB | ✅ Manual | ✅ Auto | ✅ |
| **GitHub Pages** | ⚡ 10 min | ✅ Unlimited | ✅ Manual | ✅ Auto | ❌ |
| **AWS S3** | ⚡ 15 min | ❌ | ✅ Manual | ❌ Manual | ✅ |

---

## 🚨 Common Issues & Solutions

### Authentication Errors
```bash
# Problem: "Invalid redirect URI"
# Solution: Update Azure App Registration with correct domain
```

### Build Failures
```bash
# Problem: Build errors
# Solution: Check environment variables and dependencies
./deploy.sh build  # Test build first
```

### Domain Issues
```bash
# Problem: Domain not working
# Solution: Check DNS configuration and SSL certificate
```

---

## 📊 Post-Deployment Checklist

- [ ] ✅ App loads correctly
- [ ] ✅ Authentication works
- [ ] ✅ All features functional
- [ ] ✅ Mobile responsive
- [ ] ✅ SSL certificate active
- [ ] ✅ Analytics configured
- [ ] ✅ Error monitoring set up

---

## 🎯 Production Ready in 10 Minutes

1. **Deploy** (2 min): `./deploy.sh deploy vercel --prod`
2. **Configure Domain** (3 min): Add domain in Vercel dashboard
3. **Update Azure** (2 min): Update redirect URIs
4. **Test** (3 min): Verify all features work

**Total Time: ~10 minutes**

---

*For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)* 
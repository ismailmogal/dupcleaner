# Netlify Environment Variables Setup

## Issue
Your app is showing a blank page because the required environment variables are not set in Netlify.

## Required Environment Variables

You need to set these environment variables in your Netlify dashboard:

### 1. Go to Netlify Dashboard
- Visit: https://app.netlify.com/projects/jocular-gingersnap-56da5f
- Go to **Site settings** → **Environment variables**

### 2. Add These Variables

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_CLIENT_ID` | `2f66fc90-a927-48bf-b117-8c79da6df8bc` | Your Azure AD App Client ID |
| `VITE_TENANT_ID` | `common` | Azure AD Tenant ID |
| `VITE_REDIRECT_URI` | `https://jocular-gingersnap-56da5f.netlify.app` | Your Netlify URL |
| `VITE_DEBUG` | `false` | Debug logging (optional) |

### 3. Update Azure AD App Configuration

You also need to update your Azure AD app registration:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app (Client ID: `2f66fc90-a927-48bf-b117-8c79da6df8bc`)
4. Go to **Authentication**
5. Add these redirect URIs:
   - `https://jocular-gingersnap-56da5f.netlify.app`
   - `https://jocular-gingersnap-56da5f.netlify.app/`
   - `https://jocular-gingersnap-56da5f.netlify.app/callback`

### 4. Redeploy

After setting the environment variables:
1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** → **Deploy site**
3. Or push a new commit to trigger auto-deploy

## Alternative: Use Netlify CLI

You can also set environment variables using the Netlify CLI:

```bash
# Set environment variables
netlify env:set VITE_CLIENT_ID "2f66fc90-a927-48bf-b117-8c79da6df8bc"
netlify env:set VITE_TENANT_ID "common"
netlify env:set VITE_REDIRECT_URI "https://jocular-gingersnap-56da5f.netlify.app"
netlify env:set VITE_DEBUG "false"

# Redeploy
netlify deploy --prod
```

## Expected Result

After setting these environment variables and updating Azure AD, your app should:
1. Load properly without blank page
2. Show the login button for non-authenticated users
3. Allow proper authentication flow
4. Display the beautiful home page we created 
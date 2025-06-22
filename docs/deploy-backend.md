# Backend Deployment Guide

## Issue
The frontend is trying to call `localhost:3001` which doesn't work in production. The backend needs to be deployed to a cloud service.

## Quick Deployment Options

### Option 1: Railway (Recommended - Free Tier)
1. Go to [Railway](https://railway.app/)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Set environment variables:
   - `CLIENT_URL`: `https://jocular-gingersnap-56da5f.netlify.app`
   - `PORT`: `3001`
   - `DEBUG`: `false`
6. Deploy

### Option 2: Render (Free Tier)
1. Go to [Render](https://render.com/)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your repository
5. Set build command: `npm install`
6. Set start command: `npm start`
7. Set environment variables:
   - `CLIENT_URL`: `https://jocular-gingersnap-56da5f.netlify.app`
   - `PORT`: `3001`
   - `DEBUG`: `false`

### Option 3: Heroku (Paid)
1. Go to [Heroku](https://heroku.com/)
2. Create new app
3. Connect GitHub repository
4. Set environment variables
5. Deploy

## After Backend Deployment

1. Get the backend URL (e.g., `https://your-app.railway.app`)
2. Set the environment variable in Netlify:
   ```bash
   netlify env:set VITE_BFF_URL "https://your-app.railway.app"
   ```
3. Redeploy the frontend:
   ```bash
   netlify deploy --prod
   ```

## Alternative: Mock API (Temporary)

If you want to deploy the backend later, you can temporarily modify the frontend to use mock data:

1. Update `src/services/bffApi.js` to return mock data when API calls fail
2. This will allow the UI to work without the backend

## Expected Result

After deploying the backend and setting `VITE_BFF_URL`, the app should:
- Load without API errors
- Show proper file browsing (if authenticated)
- Allow duplicate detection
- Enable file operations 
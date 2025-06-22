# 🧪 Phase 1 Authentication System Testing Guide

## ✅ **Component Tests Completed**
- ✅ Password hashing with bcrypt
- ✅ Password verification
- ✅ JWT token generation
- ✅ JWT token verification
- ✅ Invalid token rejection

## 🚀 **Testing Setup Options**

### **Option 1: Local MongoDB Setup (Recommended)**
```bash
# Install MongoDB on macOS
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify MongoDB is running
mongosh
```

### **Option 2: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Add to your `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/onedrive-duplicate-finder
   ```

### **Option 3: Docker MongoDB**
```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Stop when done
docker stop mongodb
docker rm mongodb
```

## 🧪 **Testing Steps**

### **Step 1: Start the Backend Server**
```bash
cd server
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3001
📊 Health check: http://localhost:3001/api/health
🔐 Auth endpoints: http://localhost:3001/api/auth
✅ Connected to MongoDB (if MongoDB is running)
```

### **Step 2: Test API Endpoints**

#### **Health Check**
```bash
curl http://localhost:3001/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-XX...",
  "services": {
    "microsoftGraph": "configured",
    "duplicateDetector": "ready",
    "database": "connected"
  }
}
```

#### **User Registration**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "emailVerified": false
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

#### **User Login**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "subscription": {
      "tier": "free",
      "status": "active"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "..."
}
```

#### **Protected Endpoint Test**
```bash
# Use the token from login response
curl -X GET http://localhost:3001/api/user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### **Step 3: Start the Frontend**
```bash
cd client
npm run dev
```

**Expected Output:**
```
  VITE v6.3.5  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### **Step 4: Test Frontend Features**

#### **Manual Testing Checklist**

1. **Home Page**
   - [ ] Loads without errors
   - [ ] Shows "Sign In" and "Sign Up" buttons
   - [ ] Responsive design works

2. **Authentication Modal**
   - [ ] Opens when clicking "Sign In" or "Sign Up"
   - [ ] Form validation works
   - [ ] Error messages display correctly
   - [ ] Social login buttons are present

3. **Registration Flow**
   - [ ] Fill out registration form
   - [ ] Submit and verify success message
   - [ ] Check if user can login after registration

4. **Login Flow**
   - [ ] Fill out login form
   - [ ] Submit and verify successful login
   - [ ] Check if user info appears in header

5. **Protected Pages**
   - [ ] Navigate to /browse (should require login)
   - [ ] Navigate to /multi-compare (should require login)
   - [ ] Navigate to /smart-organizer (should require login)

6. **User Profile**
   - [ ] Click user info in header
   - [ ] Verify subscription tier display
   - [ ] Test logout functionality

## 🔧 **Troubleshooting**

### **Common Issues**

#### **MongoDB Connection Failed**
```
❌ MongoDB connection error: connect ECONNREFUSED
```
**Solution:** Start MongoDB or use MongoDB Atlas

#### **Server Won't Start**
```
Error: Cannot find module 'express'
```
**Solution:** Run `npm install` in the server directory

#### **Frontend Build Errors**
```
Error: Cannot resolve 'react'
```
**Solution:** Run `npm install` in the client directory

#### **CORS Errors**
```
Access to fetch at 'http://localhost:3001/api/auth/login' from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Solution:** Check that the server is running and CORS is properly configured

### **Environment Variables**

Create a `.env` file in the server directory:
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/onedrive-duplicate-finder
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
SESSION_SECRET=your-super-secret-session-key-change-in-production
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
DEBUG=true
```

## 📊 **Test Results Template**

```
🧪 Authentication System Test Results

Backend Tests:
- [ ] Health check endpoint
- [ ] User registration
- [ ] User login
- [ ] Protected endpoints
- [ ] Token refresh
- [ ] Logout

Frontend Tests:
- [ ] Authentication modal
- [ ] Registration flow
- [ ] Login flow
- [ ] Protected routes
- [ ] User profile display
- [ ] Logout functionality

Database Tests:
- [ ] User creation
- [ ] User retrieval
- [ ] Password hashing
- [ ] Token storage

Overall Status: ✅ PASSED / ❌ FAILED
```

## 🎯 **Success Criteria**

The Phase 1 authentication system is working correctly when:

1. ✅ Users can register with email/password
2. ✅ Users can login with email/password
3. ✅ JWT tokens are generated and validated
4. ✅ Protected routes require authentication
5. ✅ User information is displayed correctly
6. ✅ Logout functionality works
7. ✅ Error handling works properly
8. ✅ Responsive design works on mobile/desktop

## 🚀 **Next Steps After Testing**

Once testing is complete and successful:

1. **Phase 2**: Multi-Cloud Provider Integration
2. **Phase 3**: Professional UI/UX Redesign
3. **Production Deployment**: Set up production environment
4. **Monitoring**: Add logging and analytics
5. **Security Audit**: Review security measures

---

**Need Help?** Check the console logs for detailed error messages and refer to the troubleshooting section above. 
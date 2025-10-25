# 🚀 Setup Guide - Hostel Mess Management System

Complete guide to set up and run the Hostel Mess Management System.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Running the Application](#running-the-application)
5. [Testing the Setup](#testing-the-setup)
6. [Default Credentials](#default-credentials)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **MongoDB** >= 6.0 ([Download](https://www.mongodb.com/try/download/community))
- **npm** >= 9.0.0 (comes with Node.js)
- **Git** (for cloning the repository)

### Check Versions

```bash
node --version   # Should be v18.0.0 or higher
npm --version    # Should be 9.0.0 or higher
mongod --version # Should be 6.0 or higher
```

---

## Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd hostel-mess-system
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

**Expected output:**
```
added 150+ packages in ~30s
```

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install --legacy-peer-deps
```

**Note:** The `--legacy-peer-deps` flag is required for React 18 compatibility.

**Expected output:**
```
added 1500+ packages in ~2m
```

---

## Database Setup

### Step 1: Start MongoDB

**Windows:**
```bash
net start MongoDB
```

**macOS:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
sudo systemctl status mongod
```

**Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 2: Verify MongoDB is Running

```bash
mongosh
```

If you see the MongoDB shell prompt, MongoDB is running correctly.

```
> show dbs
> exit
```

### Step 3: Configure Environment Variables

Create `.env.development` file in `backend` directory:

```bash
cd backend
cp .env.example .env.development
```

Edit `.env.development`:

```env
# Development Environment
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/hostel_mess_dev

# JWT Secrets (change these in production)
JWT_SECRET=your-dev-jwt-secret-key
JWT_REFRESH_SECRET=your-dev-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
SERVER_URL=http://localhost:5000
CORS_ORIGIN=http://localhost:3001

# Optional: Email (for testing password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@hosteleats.com
```

### Step 4: Seed the Database

**Option A: Development Data (Recommended for testing)**

This creates 2 messes, 13 users, subscriptions, menus, and sample attendance:

```bash
cd backend
npm run db:seed
```

**Expected output:**
```
[INFO] Connected to MongoDB for seeding
[INFO] Cleared existing data
[INFO] Created 2 sample messes
[INFO] Created super admin user
[INFO] Created mess admin users
[INFO] Created 10 test users (distributed across messes)
[INFO] Created 10 subscriptions
[INFO] Created weekly menus for both messes
[INFO] Created notifications
[INFO] Created sample attendance records
[INFO] Database seeding completed successfully!

=== TEST CREDENTIALS ===
Super Admin: superadmin@hosteleats.com / admin123
Mess A Admin: admin-a@hosteleats.com / admin123
Mess B Admin: admin-b@hosteleats.com / admin123
Test User: user1@example.com / user123
```

**Option B: Production Data (Only admin user)**

For production deployment:

```bash
NODE_ENV=production npm run db:seed:production
```

### Step 5: Verify Database Setup

Run the verification script to ensure everything is configured correctly:

```bash
npm run db:verify
```

**Expected output:**
```
=================================
DATABASE SETUP VERIFICATION
=================================

✓ Connected to MongoDB successfully

--- Checking Collections ---
✓ Collection 'messes' exists
✓ Collection 'users' exists
✓ Collection 'subscriptions' exists
... (more collections)

--- Checking Messes ---
✓ Found 2 mess(es)
  • Hostel A Mess (MESS-A)
  • Hostel B Mess (MESS-B)

--- Checking Users ---
✓ Total Users: 13
  • Super Admins: 1
  • Mess Admins: 2
  • Subscribers: 10

🎉 Database setup is complete and ready!
```

---

## Running the Application

### Backend Server

**Development mode (with auto-reload):**

```bash
cd backend
npm run dev
```

**Expected output:**
```
MongoDB connected successfully
Server running on port 5000 in development mode
Database: MongoDB
```

**Production mode:**

```bash
npm start
```

### Frontend Server

In a **new terminal**:

```bash
cd frontend
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in 500 ms

➜  Local:   http://localhost:3001/
➜  Network: http://192.168.x.x:3001/
```

### Access the Application

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:5000
- **API Health Check:** http://localhost:5000/api/v1/health

---

## Testing the Setup

### 1. Test Backend API

```bash
curl http://localhost:5000/api/v1/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-25T...",
  "database": "connected"
}
```

### 2. Test Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@hosteleats.com",
    "password": "admin123"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "...",
      "full_name": "Super Administrator",
      "email": "superadmin@hosteleats.com",
      "role": "super_admin"
    },
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc..."
  }
}
```

### 3. Test Frontend

1. Open browser: http://localhost:3001
2. Click "Login"
3. Enter credentials:
   - Email: `superadmin@hosteleats.com`
   - Password: `admin123`
4. You should see the admin dashboard

### 4. Test QR Scanner (Mobile/HTTPS)

**Note:** Camera access requires HTTPS or localhost.

1. Login as a test user
2. Navigate to "Scan QR"
3. Allow camera permission
4. Camera should open and detect QR codes

---

## Default Credentials

### Development (After `npm run db:seed`)

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Super Admin** | superadmin@hosteleats.com | admin123 | All messes |
| **Mess A Admin** | admin-a@hosteleats.com | admin123 | Hostel A only |
| **Mess B Admin** | admin-b@hosteleats.com | admin123 | Hostel B only |
| **Test User 1** | user1@example.com | user123 | Hostel A |
| **Test User 2** | user2@example.com | user123 | Hostel B |
| **Test Users 3-10** | user3-10@example.com | user123 | Alternating |

### Production (After `npm run db:seed:production`)

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | admin@hosteleats.com | ChangeMe@2024 |

**⚠️ IMPORTANT:** Change the default password immediately after first login in production!

---

## Database Commands Reference

| Command | Description |
|---------|-------------|
| `npm run db:seed` | Create test data (2 messes, 13 users, subscriptions, menus) |
| `npm run db:seed:production` | Create admin user only (for production) |
| `npm run db:drop` | **⚠️ Delete all data** (use with caution) |
| `npm run db:verify` | Verify database setup and show statistics |

---

## Troubleshooting

### Problem: MongoDB Connection Failed

**Error:**
```
MongoServerError: connect ECONNREFUSED
```

**Solution:**
1. Check if MongoDB is running:
   ```bash
   # Windows
   net start MongoDB

   # macOS/Linux
   sudo systemctl status mongod
   ```

2. Verify MongoDB URI in `.env.development`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/hostel_mess_dev
   ```

3. Test connection:
   ```bash
   mongosh mongodb://localhost:27017
   ```

### Problem: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**
1. Find process using port:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F

   # macOS/Linux
   lsof -i :5000
   kill -9 <PID>
   ```

2. Or change port in `.env.development`:
   ```env
   PORT=5001
   ```

### Problem: Cannot Install Dependencies

**Error:**
```
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Problem: QR Scanner Camera Not Working

**Symptoms:**
- Camera permission denied
- Black screen
- No QR detection

**Solution:**
1. Use HTTPS or localhost (required for camera access)
2. Check browser permissions:
   - Chrome: chrome://settings/content/camera
   - Firefox: about:preferences#privacy
3. Try different browser (Chrome recommended)
4. Check if camera is not being used by another app

### Problem: Frontend Shows "Network Error"

**Error in browser console:**
```
Network Error: Failed to fetch
```

**Solution:**
1. Ensure backend is running:
   ```bash
   curl http://localhost:5000/api/v1/health
   ```

2. Check CORS settings in backend `.env.development`:
   ```env
   CORS_ORIGIN=http://localhost:3001
   ```

3. Check frontend API URL in `frontend/src/services/api.js`:
   ```javascript
   baseURL: 'http://localhost:5000/api/v1'
   ```

### Problem: Database Seed Fails

**Error:**
```
ValidationError: User validation failed: mess_id required
```

**Solution:**
```bash
# Drop and re-seed database
npm run db:drop
npm run db:seed

# Verify setup
npm run db:verify
```

### Problem: Login Fails with "Invalid credentials"

**Solution:**
1. Verify credentials (case-sensitive)
2. Check if user exists in database:
   ```bash
   mongosh
   use hostel_mess_dev
   db.users.findOne({ email: "superadmin@hosteleats.com" })
   ```

3. Re-seed database if needed:
   ```bash
   npm run db:drop
   npm run db:seed
   ```

---

## Next Steps

After successful setup:

1. **Explore the Admin Dashboard**
   - Login as super admin
   - Navigate to Mess Management
   - View users, subscriptions, attendance

2. **Create a New Mess**
   - Go to Admin → Mess Management
   - Click "Create New Mess"
   - Fill in details with your actual location coordinates

3. **Test QR Attendance**
   - Login as a test user
   - Go to "Scan QR"
   - Scan the QR code displayed in Admin → QR Code Management

4. **Customize Settings**
   - Update mess coordinates for accurate geofencing
   - Configure meal times
   - Set QR code validity duration

5. **Read Documentation**
   - See [README.md](README.md) for complete feature list
   - Check API documentation for integration

---

## Quick Command Reference

```bash
# Backend
cd backend
npm install                  # Install dependencies
npm run dev                  # Start development server
npm run db:seed              # Seed test data
npm run db:verify            # Verify setup
npm run db:drop              # Drop database (careful!)
npm start                    # Start production server

# Frontend
cd frontend
npm install --legacy-peer-deps  # Install dependencies
npm run dev                  # Start development server
npm run build                # Build for production

# MongoDB
mongosh                      # Connect to MongoDB
use hostel_mess_dev          # Switch to database
show collections             # List collections
db.users.find().pretty()     # View users
```

---

## Support

If you encounter issues not covered in this guide:

1. Check the [README.md](README.md) Troubleshooting section
2. Review MongoDB logs: `backend/logs/`
3. Check browser console for frontend errors (F12)
4. Verify all environment variables are set correctly

---

**🎉 Congratulations! Your Hostel Mess Management System is ready to use!**

**Version:** 3.0.0
**Last Updated:** January 25, 2025

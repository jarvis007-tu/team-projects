@echo off
echo ==============================================
echo Hostel Mess Management System - Setup Script
echo ==============================================
echo.

echo Step 1: Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo Error installing backend dependencies!
    pause
    exit /b 1
)
echo Backend dependencies installed successfully!
echo.

echo Step 2: Setting up MongoDB database...
echo Please ensure MongoDB is running on localhost:27017
echo Or update MONGODB_URI in .env.development for MongoDB Atlas
echo.
echo Checking MongoDB connection...

where mongosh >nul 2>&1
if %errorlevel% equ 0 (
    mongosh --eval "db.version()" >nul 2>&1
    if errorlevel 1 (
        echo Warning: Cannot connect to MongoDB. Please start MongoDB:
        echo   - Windows: net start MongoDB
        echo   - Or start MongoDB Compass
        echo.
        echo Press any key to continue anyway...
        pause > nul
    ) else (
        echo MongoDB is running!
    )
) else (
    echo Warning: mongosh not found. Please ensure MongoDB is installed and running.
    echo Press any key to continue...
    pause > nul
)
echo.

echo Seeding MongoDB database with test data...
call npm run db:seed
if errorlevel 1 (
    echo Error seeding database!
    echo Make sure MongoDB is running and MONGODB_URI is correct in .env.development
    pause
    exit /b 1
)
echo Database setup completed!
echo.

echo Step 3: Installing frontend dependencies...
cd ../frontend
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo Error installing frontend dependencies!
    pause
    exit /b 1
)
echo Frontend dependencies installed successfully!
echo.

echo ==============================================
echo Setup completed successfully!
echo ==============================================
echo.
echo Database: MongoDB (NoSQL)
echo Collections: users, subscriptions, attendance_logs, weekly_menus, notifications, meal_confirmations
echo.
echo To start the application:
echo 1. Ensure MongoDB is running (mongosh to verify)
echo 2. Backend: cd backend ^&^& npm run dev
echo 3. Frontend: cd frontend ^&^& npm run dev
echo.
echo Application URLs:
echo - Backend API: http://localhost:5000
echo - Frontend: http://localhost:3001
echo.
echo Default credentials:
echo Admin: admin@hosteleats.com / admin123
echo User: user1@example.com / user123
echo.
echo MongoDB Management:
echo - View data: mongosh -^> use hostel_mess_dev -^> db.users.find()
echo - Reseed: cd backend ^&^& npm run db:seed
echo - Drop DB: cd backend ^&^& npm run db:drop
echo.
pause

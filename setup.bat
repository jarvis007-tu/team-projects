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

echo Step 2: Setting up database...
echo Please ensure MySQL is running and update .env file with your database credentials
echo Press any key to continue after updating .env file...
pause > nul

echo Creating database and running migrations...
call npm run db:create
if errorlevel 1 (
    echo Database may already exist, continuing...
)

call npm run db:migrate
if errorlevel 1 (
    echo Error running migrations!
    pause
    exit /b 1
)

call npm run db:seed
if errorlevel 1 (
    echo Error seeding database!
    pause
    exit /b 1
)
echo Database setup completed!
echo.

echo Step 3: Installing frontend dependencies...
cd ../frontend
call npm install
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
echo To start the application:
echo 1. Backend: cd backend && npm run dev
echo 2. Frontend: cd frontend && npm run dev
echo.
echo Default credentials:
echo Admin: admin@hosteleats.com / admin123
echo User: user@hosteleats.com / user123
echo.
pause
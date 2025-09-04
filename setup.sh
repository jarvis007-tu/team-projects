#!/bin/bash

echo "=============================================="
echo "Hostel Mess Management System - Setup Script"
echo "=============================================="
echo ""

echo "Step 1: Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "Error installing backend dependencies!"
    exit 1
fi
echo "Backend dependencies installed successfully!"
echo ""

echo "Step 2: Setting up database..."
echo "Please ensure MySQL is running and update .env file with your database credentials"
echo "Press Enter to continue after updating .env file..."
read

echo "Creating database and running migrations..."
npm run db:create || echo "Database may already exist, continuing..."
npm run db:migrate
if [ $? -ne 0 ]; then
    echo "Error running migrations!"
    exit 1
fi

npm run db:seed
if [ $? -ne 0 ]; then
    echo "Error seeding database!"
    exit 1
fi
echo "Database setup completed!"
echo ""

echo "Step 3: Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "Error installing frontend dependencies!"
    exit 1
fi
echo "Frontend dependencies installed successfully!"
echo ""

echo "=============================================="
echo "Setup completed successfully!"
echo "=============================================="
echo ""
echo "To start the application:"
echo "1. Backend: cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "Default credentials:"
echo "Admin: admin@hosteleats.com / admin123"
echo "User: user@hosteleats.com / user123"
echo ""
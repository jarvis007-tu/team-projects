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

echo "Step 2: Setting up MongoDB database..."
echo "Please ensure MongoDB is running on localhost:27017"
echo "Or update MONGODB_URI in .env.development for MongoDB Atlas"
echo ""
echo "Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    mongosh --eval "db.version()" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ MongoDB is running!"
    else
        echo "⚠ Warning: Cannot connect to MongoDB. Please start MongoDB:"
        echo "  - Windows: net start MongoDB"
        echo "  - macOS: brew services start mongodb-community"
        echo "  - Linux: sudo systemctl start mongod"
        echo ""
        echo "Press Enter to continue anyway..."
        read
    fi
else
    echo "⚠ mongosh not found. Please ensure MongoDB is installed and running."
    echo "Press Enter to continue..."
    read
fi
echo ""

echo "Seeding MongoDB database with test data..."
npm run db:seed
if [ $? -ne 0 ]; then
    echo "Error seeding database!"
    echo "Make sure MongoDB is running and MONGODB_URI is correct in .env.development"
    exit 1
fi
echo "Database setup completed!"
echo ""

echo "Step 3: Installing frontend dependencies..."
cd ../frontend
npm install --legacy-peer-deps
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
echo "Database: MongoDB (NoSQL)"
echo "Collections: users, subscriptions, attendance_logs, weekly_menus, notifications, meal_confirmations"
echo ""
echo "To start the application:"
echo "1. Ensure MongoDB is running (mongosh to verify)"
echo "2. Backend: cd backend && npm run dev"
echo "3. Frontend: cd frontend && npm run dev"
echo ""
echo "Application URLs:"
echo "- Backend API: http://localhost:5000"
echo "- Frontend: http://localhost:3001"
echo ""
echo "Default credentials:"
echo "Admin: admin@hosteleats.com / admin123"
echo "User: user1@example.com / user123"
echo ""
echo "MongoDB Management:"
echo "- View data: mongosh → use hostel_mess_dev → db.users.find()"
echo "- Reseed: cd backend && npm run db:seed"
echo "- Drop DB: cd backend && npm run db:drop"
echo ""

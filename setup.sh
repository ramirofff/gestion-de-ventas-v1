#!/bin/bash

# Setup script for Sales Management System
echo "🚀 Setting up Sales Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📄 Creating .env.local from template..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local with your actual environment variables"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create uploads directory if it doesn't exist
mkdir -p public/uploads

# Check if database schema needs to be imported
echo "🗄️  Database setup:"
echo "   1. Create a new Supabase project"
echo "   2. Run the SQL commands from database-complete-schema.sql"
echo "   3. Update your .env.local with the Supabase credentials"

echo "✅ Setup complete!"
echo "🏃 Run 'npm run dev' to start the development server"

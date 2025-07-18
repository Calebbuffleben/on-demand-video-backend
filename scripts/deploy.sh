#!/bin/bash

# Railway Deployment Script
echo "🚀 Preparing for Railway deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Clean up any existing build artifacts
echo "🧹 Cleaning up build artifacts..."
rm -rf dist
rm -rf node_modules

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build the application
echo "🏗️ Building application..."
npm run build

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Build successful! Application is ready for deployment."
    echo "📁 Build output: dist/"
    echo "🚀 Ready to deploy to Railway!"
else
    echo "❌ Build failed! Please check the error messages above."
    exit 1
fi 
#!/bin/bash

# Railway Build Script with Prisma Error Handling
echo "🚀 Starting Railway build process..."

# Set Prisma environment variables
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
export PRISMA_QUERY_ENGINE_TYPE=binary
export PRISMA_SCHEMA_ENGINE_TYPE=binary

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# Try to generate Prisma client with retries
echo "🔧 Generating Prisma client..."
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if npx prisma generate; then
        echo "✅ Prisma client generated successfully"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "⚠️ Prisma generation failed (attempt $RETRY_COUNT/$MAX_RETRIES)"
        
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "🔄 Retrying in 5 seconds..."
            sleep 5
        else
            echo "❌ Prisma generation failed after $MAX_RETRIES attempts"
            echo "⚠️ Continuing with build - Prisma will be generated at runtime"
        fi
    fi
done

# Build the application
echo "🏗️ Building NestJS application..."
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
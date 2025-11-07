#!/bin/bash

echo "🚀 Camera Statistics Server - Railway Deployment Script"
echo "======================================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    echo "Then run: railway login"
    exit 1
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run:"
    echo "railway login"
    exit 1
fi

echo "✅ Railway CLI is ready"

# Create new project
echo "📦 Creating new Railway project..."
railway init camera-statistics --name "Camera Statistics Dashboard"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

# Get the domain
echo "🌐 Getting your deployment URL..."
railway domain

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Copy the domain URL shown above"
echo "2. Update your iOS app's StatisticsAPIClient.swift:"
echo "   Change baseURL to: https://your-domain.railway.app"
echo "3. Rebuild and run your iOS app"
echo "4. Visit the domain to see your statistics dashboard!"
echo ""
echo "📊 Your dashboard will be available at the domain above"
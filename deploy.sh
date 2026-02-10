#!/bin/bash

echo "🚀 GyanDhara - Fast Vercel Deployment"
echo "======================================"

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build frontend first
echo "🏗️  Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "⚠️  IMPORTANT: Add these environment variables in Vercel Dashboard:"
echo "   SUPABASE_URL"
echo "   SUPABASE_KEY"
echo "   SUPABASE_SERVICE_KEY"
echo "   JWT_SECRET"
echo "   GEMINI_API_KEY"
echo "   CORS_ORIGIN (your-app.vercel.app)"
echo ""
echo "📝 Go to: https://vercel.com/[your-username]/[project-name]/settings/environment-variables"

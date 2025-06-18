#!/bin/bash

# OneDrive Duplicate Finder - Deployment Script
# This script automates deployment to various hosting providers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to build the application
build_app() {
    print_status "Building application..."
    
    if [ ! -d "client" ]; then
        print_error "Client directory not found. Make sure you're in the project root."
        exit 1
    fi
    
    cd client
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in client directory."
        exit 1
    fi
    
    print_status "Installing dependencies..."
    npm install
    
    print_status "Building for production..."
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not created."
        exit 1
    fi
    
    print_success "Build completed successfully!"
    cd ..
}

# Function to deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    if ! command_exists vercel; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    cd client
    
    if [ "$1" = "--prod" ]; then
        print_status "Deploying to production..."
        vercel --prod
    else
        print_status "Deploying to preview..."
        vercel
    fi
    
    cd ..
    print_success "Vercel deployment completed!"
}

# Function to deploy to Netlify
deploy_netlify() {
    print_status "Deploying to Netlify..."
    
    if ! command_exists netlify; then
        print_status "Installing Netlify CLI..."
        npm install -g netlify-cli
    fi
    
    cd client
    
    # Create netlify.toml if it doesn't exist
    if [ ! -f "netlify.toml" ]; then
        print_status "Creating netlify.toml configuration..."
        cat > netlify.toml << EOF
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF
    fi
    
    if [ "$1" = "--prod" ]; then
        print_status "Deploying to production..."
        netlify deploy --prod --dir=dist
    else
        print_status "Deploying to preview..."
        netlify deploy --dir=dist
    fi
    
    cd ..
    print_success "Netlify deployment completed!"
}

# Function to deploy to GitHub Pages
deploy_github_pages() {
    print_status "Deploying to GitHub Pages..."
    
    if [ ! -d ".git" ]; then
        print_error "Not a git repository. Please initialize git first."
        exit 1
    fi
    
    # Check if GitHub Actions workflow exists
    if [ ! -f ".github/workflows/deploy.yml" ]; then
        print_status "Creating GitHub Actions workflow..."
        mkdir -p .github/workflows
        cat > .github/workflows/deploy.yml << EOF
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd client
        npm install
        
    - name: Build
      run: |
        cd client
        npm run build
        
    - name: Deploy
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: \${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./client/dist
EOF
        print_status "GitHub Actions workflow created. Push to main branch to deploy."
    else
        print_status "GitHub Actions workflow already exists."
    fi
    
    print_success "GitHub Pages deployment configured!"
}

# Function to deploy to Firebase
deploy_firebase() {
    print_status "Deploying to Firebase..."
    
    if ! command_exists firebase; then
        print_status "Installing Firebase CLI..."
        npm install -g firebase-tools
    fi
    
    cd client
    
    # Initialize Firebase if not already done
    if [ ! -f "firebase.json" ]; then
        print_status "Initializing Firebase project..."
        firebase init hosting --public dist --single-page-app true --yes
    fi
    
    print_status "Deploying to Firebase..."
    firebase deploy --only hosting
    
    cd ..
    print_success "Firebase deployment completed!"
}

# Function to deploy to AWS S3
deploy_aws_s3() {
    print_status "Deploying to AWS S3..."
    
    if ! command_exists aws; then
        print_error "AWS CLI not found. Please install it first: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # Check if bucket name is provided
    if [ -z "$1" ]; then
        print_error "Please provide S3 bucket name: ./deploy.sh aws-s3 your-bucket-name"
        exit 1
    fi
    
    BUCKET_NAME=$1
    
    print_status "Creating S3 bucket if it doesn't exist..."
    aws s3 mb s3://$BUCKET_NAME --region us-east-1 2>/dev/null || true
    
    print_status "Configuring S3 bucket for static website hosting..."
    aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html
    
    print_status "Uploading files to S3..."
    aws s3 sync client/dist/ s3://$BUCKET_NAME --delete
    
    print_success "AWS S3 deployment completed!"
    print_status "Website URL: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
}

# Function to show help
show_help() {
    echo "OneDrive Duplicate Finder - Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [OPTION] [PROVIDER] [ARGS...]"
    echo ""
    echo "Options:"
    echo "  build                    Build the application only"
    echo "  deploy [PROVIDER]        Deploy to specified provider"
    echo "  help                     Show this help message"
    echo ""
    echo "Providers:"
    echo "  vercel [--prod]          Deploy to Vercel (preview/production)"
    echo "  netlify [--prod]         Deploy to Netlify (preview/production)"
    echo "  github-pages             Configure GitHub Pages deployment"
    echo "  firebase                 Deploy to Firebase Hosting"
    echo "  aws-s3 [BUCKET_NAME]     Deploy to AWS S3"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh build"
    echo "  ./deploy.sh deploy vercel --prod"
    echo "  ./deploy.sh deploy netlify"
    echo "  ./deploy.sh deploy aws-s3 my-app-bucket"
    echo ""
}

# Main script logic
case "$1" in
    "build")
        build_app
        ;;
    "deploy")
        case "$2" in
            "vercel")
                build_app
                deploy_vercel "$3"
                ;;
            "netlify")
                build_app
                deploy_netlify "$3"
                ;;
            "github-pages")
                build_app
                deploy_github_pages
                ;;
            "firebase")
                build_app
                deploy_firebase
                ;;
            "aws-s3")
                build_app
                deploy_aws_s3 "$3"
                ;;
            *)
                print_error "Unknown provider: $2"
                echo "Available providers: vercel, netlify, github-pages, firebase, aws-s3"
                exit 1
                ;;
        esac
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use './deploy.sh help' for usage information."
        exit 1
        ;;
esac 
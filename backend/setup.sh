#!/bin/bash

# BuildEstate Backend Quick Setup Script
# This script helps you set up the BuildEstate backend quickly

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

# Header
print_header "🏠 BuildEstate Backend Setup"
print_header "============================"
echo ""

# Check operating system
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

print_info "Detected OS: ${MACHINE}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js (v22+) from https://nodejs.org/"
    echo ""
    print_info "Installation options:"
    echo "  • macOS: brew install node"
    echo "  • Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "  • Windows: Download from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    print_error "Node.js version 22 or higher is required. Current version: $(node --version)"
    print_info "Please update Node.js to version 22 or higher"
    exit 1
fi

print_status "Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

print_status "npm $(npm --version) detected"

# Check if Git is installed (optional but recommended)
if command -v git &> /dev/null; then
    print_status "Git $(git --version | cut -d' ' -f3) detected"
else
    print_warning "Git is not installed. It's recommended for version control."
fi

echo ""

# Navigate to backend directory if we're in the root
if [ -d "backend" ]; then
    print_info "📁 Navigating to backend directory..."
    cd backend
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Make sure you're in the backend directory."
    print_info "Current directory: $(pwd)"
    exit 1
fi

print_status "Found package.json in $(pwd)"

# Clear npm cache (helps with potential issues)
print_info "🧹 Clearing npm cache..."
npm cache clean --force > /dev/null 2>&1

# Install dependencies
print_info "📦 Installing dependencies..."
if npm install; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    print_info "Try running: npm cache clean --force && npm install"
    exit 1
fi

echo ""

# Set up environment file
if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        print_info "📝 Creating .env.local from .env.example..."
        cp .env.example .env.local
        print_status ".env.local created successfully"
        echo ""
        print_warning "IMPORTANT: Please edit .env.local and add your actual configuration values:"
        echo "   - MongoDB connection string (MONGO_URI)"
        echo "   - JWT secret (JWT_SECRET)"
        echo "   - Email configuration (BREVO_API_KEY, EMAIL_USER)"
        echo "   - AI service API keys (NVIDIA_API_KEY; Firecrawl keys are supplied by users)"
        echo "   - Other API keys as needed"
        echo ""
    else
        print_warning ".env.example not found. Creating basic .env.local template..."
        cat > .env.local << EOF
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/buildestate?replicaSet=rs0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Email Configuration (Brevo/Sendinblue)
BREVO_API_KEY=your-brevo-api-key
EMAIL_USER=your-verified-sender@example.com

# AI Services (Optional)
NVIDIA_API_KEY=your-nvidia-api-key
FIRECRAWL_API_KEY=your-firecrawl-api-key

# Environment
NODE_ENV=development
PORT=4000

# Frontend URLs (for CORS)
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
EOF
        print_status "Basic .env.local template created"
        echo ""
        print_warning "Please edit .env.local with your actual configuration values!"
    fi
else
    print_status ".env.local already exists"
    
    # Check if required variables are set
    print_info "🔍 Checking environment configuration..."
    
    if grep -q "MONGO_URI=" .env.local && ! grep -q "MONGO_URI=$" .env.local; then
        print_status "MongoDB URI configured"
    else
        print_warning "MongoDB URI not configured in .env.local"
    fi
    
    if grep -q "JWT_SECRET=" .env.local && ! grep -q "JWT_SECRET=$" .env.local; then
        print_status "JWT Secret configured"
    else
        print_warning "JWT Secret not configured in .env.local"
    fi
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    print_info "📁 Creating uploads directory..."
    mkdir -p uploads
    print_status "Uploads directory created"
else
    print_status "Uploads directory already exists"
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    print_info "📁 Creating logs directory..."
    mkdir -p logs
    print_status "Logs directory created"
else
    print_status "Logs directory already exists"
fi

echo ""
print_header "🎉 Setup completed successfully!"
echo ""

print_header "📋 Next steps:"
echo "   1. Edit .env.local with your configuration"
echo "   2. Ensure MongoDB is a replica set (local rs0 or Atlas)"
echo "   3. Run 'npm run dev' to start the development server"
echo "   4. Server will be available at http://localhost:4000"
echo ""

print_header "🔧 Available commands:"
echo "   npm run dev      - Start development server with auto-reload"
echo "   npm start        - Start production server"
echo "   npm run build    - Build for production"
echo "   npm test         - Run isolated regression tests"
echo ""

print_header "� Health Check URLs:"
echo "   http://localhost:4000/status  - Basic status check"
echo "   http://localhost:4000/health  - Detailed health check"
echo ""

print_header "📚 Documentation:"
echo "   • Backend: BACKEND_DOCUMENTATION.md"
echo "   • API: API_TESTING_GUIDE.md"
echo "   • Setup: COMPLETE_PROJECT_SETUP_GUIDE.md"
echo ""

# Check if MongoDB is running locally (optional check)
if command -v mongod &> /dev/null; then
    if pgrep mongod > /dev/null; then
        print_status "MongoDB is running locally"
    elif command -v mongo &> /dev/null; then
        if mongo --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; then
            print_status "MongoDB is accessible"
        else
            print_warning "MongoDB is not running locally (you may be using Atlas)"
        fi
    else
        print_warning "MongoDB is not running locally (you may be using Atlas)"
    fi
elif command -v docker &> /dev/null; then
    if docker ps | grep -q mongo; then
        print_status "MongoDB is running in Docker"
    else
        print_info "Use MongoDB Atlas or a local MongoDB replica set (standalone MongoDB is unsupported)"
    fi
fi

# Check if ports are available
if command -v lsof &> /dev/null; then
    if lsof -i :4000 > /dev/null 2>&1; then
        print_warning "Port 4000 is already in use"
    else
        print_status "Port 4000 is available"
    fi
fi

echo ""
print_header "🚀 Happy coding! 🚀"

# Optional: Ask if user wants to start the development server
read -p "Would you like to start the development server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting development server..."
    npm run dev
fi

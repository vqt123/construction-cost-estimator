#!/bin/bash

echo "🏠 Setting up Homewyse integration..."
echo "======================================"

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "📄 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
else
    echo "⚠️  No .env file found. Make sure to set GITHUB_USERNAME and GITHUB_TOKEN environment variables."
fi

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Checking prerequisites..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

print_success "Docker is running"

# Check if services are up
print_status "Checking if database and Ollama services are running..."

if ! docker compose ps | grep -q "estimation-postgres.*Up"; then
    print_warning "PostgreSQL service is not running. Starting services..."
    docker compose up -d postgres ollama
    
    print_status "Waiting for services to be ready..."
    sleep 10
fi

print_success "Services are running"

# Repository access configuration
echo ""
echo "🔐 Repository Access Configuration"
echo "=================================="
echo ""

# Check for required environment variables
if [ -z "$GITHUB_USERNAME" ]; then
    print_error "GITHUB_USERNAME environment variable is required"
    print_status "Please set it in your .env file or export it: export GITHUB_USERNAME=your_username"
    exit 1
else
    print_status "Using GitHub username from environment: $GITHUB_USERNAME"
fi

if [ -z "$GITHUB_TOKEN" ]; then
    print_error "GITHUB_TOKEN environment variable is required"
    print_status "Please set it in your .env file or export it: export GITHUB_TOKEN=your_token"
    print_status "See ENVIRONMENT.md for instructions on creating a GitHub token"
    exit 1
else
    print_success "Using GitHub token from environment variable"
fi

if [ -z "$HOMEWYSE_REPO_URL" ]; then
    export HOMEWYSE_REPO_URL="https://github.com/$GITHUB_USERNAME/homewyse-scraper.git"
    print_status "Using default repository URL: $HOMEWYSE_REPO_URL"
fi

print_success "GitHub credentials configured"
print_status "Repository: $HOMEWYSE_REPO_URL"
print_status "Username: $GITHUB_USERNAME"
print_status "Token: ${GITHUB_TOKEN:0:20}..."

# Build and run the data processor
echo ""
print_status "Building and running homewyse data processor..."

# Use the existing docker-compose.override.yml which already has the credentials
COMPOSE_FILES="-f docker-compose.yaml -f docker-compose.override.yml"

# Build the data processor
print_status "Building data processor container..."
docker compose $COMPOSE_FILES build data-processor

# Run the data processor
print_status "Running homewyse data import..."
docker compose $COMPOSE_FILES run --rm data-processor

# Check if import was successful
if [ $? -eq 0 ]; then
    print_success "Homewyse data import completed successfully!"
    
    # Generate embeddings
    echo ""
    print_status "Generating embeddings for homewyse data..."
    pnpm homewyse:embeddings
    
    if [ $? -eq 0 ]; then
        print_success "Homewyse setup completed successfully!"
        echo ""
        echo "🎉 Your homewyse data is now integrated and ready to use!"
        echo ""
        echo "Next steps:"
        echo "- Start your frontend: pnpm start:frontend"
        echo "- Test queries like: 'How much for flooring installation?'"
        echo "- Check the database for homewyse data in the cost_docs table"
    else
        print_error "Embedding generation failed"
        exit 1
    fi
else
    print_error "Homewyse data import failed"
    echo ""
    echo "Troubleshooting:"
    echo "- Check Docker logs: docker compose logs data-processor"
    echo "- Verify repository access and credentials"
    echo "- Ensure the repository has the expected structure: actual-processed/level1/"
    echo ""
    echo "Repository status check:"
    echo "- Repository URL: $HOMEWYSE_REPO_URL"
    echo "- Username: $GITHUB_USERNAME"
    echo "- Token: ${GITHUB_TOKEN:0:20}..."
    exit 1
fi

echo ""
print_success "Homewyse integration setup complete!" 
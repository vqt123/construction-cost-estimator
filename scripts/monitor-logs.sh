#!/bin/bash

echo "🔍 Construction Cost Estimator - Log Monitor"
echo "============================================"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "📊 System Status:"
echo "=================="

# Check Docker services
echo "🐳 Docker Services:"
docker compose ps

echo ""
echo "🏥 Health Check:"
echo "================"

# Try to hit the health endpoint
if command_exists curl; then
    echo "Testing health endpoint..."
    curl -s http://localhost:5173/api/health | jq '.' 2>/dev/null || echo "Health endpoint not responding or jq not installed"
else
    echo "curl not available - install curl to test health endpoint"
fi

echo ""
echo "📋 Available Log Commands:"
echo "=========================="
echo "1. View PostgreSQL logs:     docker compose logs -f postgres"
echo "2. View Ollama logs:         docker compose logs -f ollama"
echo "3. View all Docker logs:     docker compose logs -f"
echo "4. View SvelteKit dev logs:  cd apps/frontend && pnpm dev"
echo ""

# Ask user what they want to monitor
echo "What would you like to monitor?"
echo "1) PostgreSQL logs"
echo "2) Ollama logs"
echo "3) All Docker services"
echo "4) SvelteKit development server"
echo "5) All logs (split terminal recommended)"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "📊 Monitoring PostgreSQL logs (Ctrl+C to exit)..."
        docker compose logs -f postgres
        ;;
    2)
        echo "🤖 Monitoring Ollama logs (Ctrl+C to exit)..."
        docker compose logs -f ollama
        ;;
    3)
        echo "🐳 Monitoring all Docker services (Ctrl+C to exit)..."
        docker compose logs -f
        ;;
    4)
        echo "🚀 Starting SvelteKit development server..."
        echo "Note: This will start the dev server if not already running"
        cd apps/frontend && pnpm dev
        ;;
    5)
        echo "📊 Monitoring all logs..."
        echo "Note: This will show a lot of output. Consider using split terminals."
        echo "Press Ctrl+C to exit"
        sleep 2
        
        # Start background processes for Docker logs
        docker compose logs -f postgres &
        POSTGRES_PID=$!
        
        docker compose logs -f ollama &
        OLLAMA_PID=$!
        
        # Function to cleanup background processes
        cleanup() {
            echo ""
            echo "🛑 Stopping log monitoring..."
            kill $POSTGRES_PID $OLLAMA_PID 2>/dev/null
            exit 0
        }
        
        # Set trap to cleanup on exit
        trap cleanup INT TERM
        
        echo "🚀 Starting SvelteKit development server..."
        cd apps/frontend && pnpm dev
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac 
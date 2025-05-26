#!/bin/bash

echo "🚀 Setting up Estimation Site..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🐳 Starting Docker services..."
docker compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Wait for PostgreSQL to be ready
echo "🔍 Waiting for PostgreSQL..."
until docker exec estimation-postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Wait for Ollama to be ready
echo "🔍 Waiting for Ollama..."
until curl -f http://localhost:11434/api/tags > /dev/null 2>&1; do
    echo "Waiting for Ollama to be ready..."
    sleep 5
done

echo "✅ Ollama is ready!"

echo "🤖 Pulling required models..."
docker exec estimation-ollama ollama pull llama3.2
docker exec estimation-ollama ollama pull nomic-embed-text

echo "📊 Database setup complete!"
echo "🎯 Generating embeddings for cost documents..."

# Note: We'll create the embedding script next
echo "⚠️  Remember to run the embedding generation script after setup"

echo ""
echo "🎉 Setup complete! You can now:"
echo "   1. Start the development server: cd apps/frontend && pnpm dev"
echo "   2. Visit http://localhost:5173"
echo "   3. Try queries like: 'How much to epoxy-seal 600 ft² in 21093?'"
echo ""
echo "📝 Services running:"
echo "   - Frontend: http://localhost:5173"
echo "   - PostgreSQL: localhost:5432"
echo "   - Ollama: http://localhost:11434" 
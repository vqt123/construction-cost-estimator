# Construction Cost Estimator

A full-stack TypeScript monorepo for construction cost estimation using AI and vector search. Built with SvelteKit, PostgreSQL with pgvector, and Ollama for local LLM processing.

## Features

- 🤖 **Natural Language Queries**: Ask questions like "How much to epoxy-seal 600 ft² in 21093?"
- 🎯 **AI-Powered Estimation**: Uses local LLM (Ollama) for intelligent cost analysis
- 📊 **Vector Search**: Semantic search through cost documentation using embeddings
- 🗄️ **Structured Data**: PostgreSQL with pgvector for efficient similarity search
- 🌍 **Regional Pricing**: Location-based cost adjustments
- 📱 **Modern UI**: Clean, responsive interface built with Tailwind CSS
- 🔒 **Fully Local**: No external API keys required - everything runs locally

## Architecture

```
estimation-site/
├── apps/
│   └── frontend/          # SvelteKit app (frontend + API routes)
├── packages/
│   └── ui/               # Shared UI components
├── db/
│   ├── schema.sql        # Database schema with pgvector
│   └── seed.sql          # Sample data
├── scripts/
│   ├── setup.sh          # Automated setup script
│   └── generate-embeddings.js  # Embedding generation
└── docker-compose.yaml   # PostgreSQL + Ollama services
```

## Prerequisites

- **Docker Desktop** (with Docker Compose)
- **Node.js** ≥18.12
- **pnpm** (will be installed automatically)
- **Git**

## Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd estimation-site

# Make setup script executable (Linux/Mac)
chmod +x scripts/setup.sh

# Run automated setup
./scripts/setup.sh
```

### 2. Generate Embeddings

```bash
# Generate embeddings for cost documents
node scripts/generate-embeddings.js
```

### 3. Start Development Server

```bash
cd apps/frontend
pnpm dev
```

Visit [http://localhost:5173](http://localhost:5173)

## Manual Setup (if automated setup fails)

### 1. Install Dependencies

```bash
# Install pnpm globally
npm install -g pnpm

# Install project dependencies
pnpm install
```

### 2. Start Services

```bash
# Start PostgreSQL and Ollama
docker compose up -d

# Wait for services to be ready (check with)
docker compose ps
```

### 3. Pull AI Models

```bash
# Pull required Ollama models
docker exec estimation-ollama ollama pull llama3.2
docker exec estimation-ollama ollama pull nomic-embed-text
```

### 4. Generate Embeddings

```bash
node scripts/generate-embeddings.js
```

## Usage Examples

Try these natural language queries:

- "How much to epoxy-seal 600 ft² in 21093?"
- "Cost for concrete polishing 1200 square feet in Baltimore"
- "Waterproofing basement 800 sq ft in Washington DC"
- "Epoxy flooring with color flakes for 500 sq ft garage"

## Database Schema

### Key Tables

- **`regions`**: Location-based cost multipliers
- **`project_types`**: Categories of construction work
- **`cost_items`**: Detailed cost breakdowns by item
- **`cost_docs`**: Documentation with vector embeddings for RAG
- **`projects`**: Estimation history and results

### Vector Search

Uses pgvector extension for semantic similarity search:

- Embeddings generated with `nomic-embed-text` model
- Cosine similarity for document retrieval
- Automatic relevance scoring

## API Endpoints

### POST `/api/estimate`

Generate cost estimate from natural language query.

**Request:**

```json
{
  "query": "How much to epoxy-seal 600 ft² in 21093?",
  "location": "21093",
  "projectType": "epoxy flooring"
}
```

**Response:**

```json
{
  "estimate": {
    "totalCost": 7245.0,
    "breakdown": [
      {
        "item": "Surface Preparation",
        "quantity": 600,
        "unitCost": 2.88,
        "totalCost": 1728.0,
        "unit": "sq ft"
      }
    ],
    "region": "Baltimore Metro",
    "projectType": "Epoxy Flooring"
  },
  "explanation": "This estimate includes...",
  "confidence": 0.85
}
```

## Development

### Project Structure

- **Frontend**: SvelteKit with TypeScript and Tailwind CSS
- **Backend**: SvelteKit API routes with PostgreSQL
- **Database**: PostgreSQL 16 with pgvector extension
- **AI**: Ollama for local LLM processing
- **Monorepo**: pnpm workspaces for package management

### Adding New Cost Data

1. Insert into `cost_items` table
2. Add documentation to `cost_docs` table
3. Run embedding generation: `node scripts/generate-embeddings.js`

### Environment Variables

Create `.env` in the project root for global configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/estimation_db

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434

# GitHub Configuration for Homewyse Integration (recommended)
GITHUB_USERNAME=your_github_username
GITHUB_TOKEN=your_github_personal_access_token
HOMEWYSE_REPO_URL=https://github.com/your_username/homewyse-scraper.git

# Frontend Configuration (create in apps/frontend/)
NODE_ENV=development
PORT=5173
```

**Security Note**: For GitHub credentials, see [ENVIRONMENT.md](./ENVIRONMENT.md) for detailed setup instructions and security best practices.

## Troubleshooting

### 🆕 Enhanced Debugging Features

We've added comprehensive logging throughout the application! If the app "goes quiet" or takes a long time:

1. **Use the Health Check button** in the frontend UI
2. **Check the Status Log** that appears below the form
3. **Monitor logs in real-time** using our monitoring script:
   ```bash
   ./scripts/monitor-logs.sh
   ```
4. **Read the detailed debugging guide**: [DEBUGGING.md](./DEBUGGING.md)

### Docker Issues

```bash
# Check service status
docker compose ps

# View logs
docker compose logs postgres
docker compose logs ollama

# Restart services
docker compose restart
```

### Database Connection

```bash
# Connect to PostgreSQL
docker exec -it estimation-postgres psql -U postgres -d estimation_db

# Check tables
\dt

# Check embeddings
SELECT COUNT(*) FROM cost_docs WHERE embedding IS NOT NULL;
```

### Ollama Issues

```bash
# Check Ollama health
curl http://localhost:11434/api/tags

# List installed models
docker exec estimation-ollama ollama list

# Pull missing models
docker exec estimation-ollama ollama pull llama3.2
docker exec estimation-ollama ollama pull nomic-embed-text
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Homewyse Integration

This project integrates with a homewyse-scraper repository to import real-world cost data for enhanced estimation accuracy.

### Quick Setup

```bash
# Run the interactive setup script
./scripts/setup-homewyse.sh
```

### Manual Setup Options

#### Option 1: Public Repository

```bash
# If the repository is public
docker compose -f docker-compose.yaml -f docker-compose.override.yml run --rm data-processor
```

#### Option 2: Private Repository with Token

```bash
# Set your GitHub credentials
export GITHUB_USERNAME=your-username
export GITHUB_TOKEN=your-personal-access-token

# Run the data processor
docker compose -f docker-compose.yaml -f docker-compose.override.yml run --rm data-processor
```

#### Option 3: SSH Key Authentication

```bash
# Ensure SSH keys are at ~/.ssh/id_rsa
# Update docker-compose.override.yml to mount SSH keys:
# - ~/.ssh:/app/ssh:ro

docker compose -f docker-compose.yaml -f docker-compose.override.yml run --rm data-processor
```

#### Option 4: Local Repository

```bash
# If you have the repository cloned locally
# Update docker-compose.override.yml to mount your local repo:
# - /path/to/homewyse-scraper:/app/homewyse-scraper:ro

docker compose -f docker-compose.yaml -f docker-compose.override.yml run --rm data-processor
```

### NPM Scripts

```bash
# Import homewyse data
pnpm homewyse:import

# Generate embeddings for homewyse data
pnpm homewyse:embeddings

# Complete setup (import + embeddings)
pnpm homewyse:setup
```

### Data Structure

The integration expects JSON files in the `homewyse-scraper/actual-processed/level1/` directory. The data is automatically:

- Imported into the `cost_docs` table
- Categorized by project type (Flooring, Painting, Roofing, etc.)
- Made searchable through vector embeddings
- Integrated with the existing RAG system

## Roadmap

- [x] **Homewyse Data Integration**: Import real-world cost data from homewyse-scraper
- [ ] Add more construction types (HVAC, electrical, plumbing)
- [ ] Implement user authentication and project saving
- [ ] Add PDF document ingestion
- [ ] Create mobile app
- [ ] Add cost trend analysis
- [ ] Implement multi-language support

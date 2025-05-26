# Environment Configuration

This document explains how to configure environment variables for the Construction Cost Estimator project.

## GitHub Credentials for Homewyse Integration

To avoid hardcoded credentials in scripts, you can set the following environment variables:

### Required Environment Variables

```bash
# GitHub username
export GITHUB_USERNAME=your_github_username

# GitHub Personal Access Token
export GITHUB_TOKEN=your_github_personal_access_token

# Homewyse repository URL (optional, defaults to your_username/homewyse-scraper)
export HOMEWYSE_REPO_URL=https://github.com/your_username/homewyse-scraper.git
```

### Setting Environment Variables

#### Option 1: Create a `.env` file (recommended)

Create a `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/estimation_db

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434

# GitHub Configuration for Homewyse Integration
GITHUB_USERNAME=your_github_username
GITHUB_TOKEN=your_github_personal_access_token
HOMEWYSE_REPO_URL=https://github.com/your_username/homewyse-scraper.git
```

#### Option 2: Export in your shell

```bash
export GITHUB_USERNAME=your_github_username
export GITHUB_TOKEN=your_github_personal_access_token
export HOMEWYSE_REPO_URL=https://github.com/your_username/homewyse-scraper.git
```

#### Option 3: Set when running the script

```bash
GITHUB_USERNAME=your_username GITHUB_TOKEN=your_token ./scripts/setup-homewyse.sh
```

### Security Best Practices

1. **Never commit your `.env` file** - it's already in `.gitignore`
2. **Use Personal Access Tokens** instead of passwords
3. **Limit token permissions** to only what's needed (repository access)
4. **Rotate tokens regularly** for security

### Required Variables

The `setup-homewyse.sh` script now requires these environment variables to be set:

- `GITHUB_USERNAME` - Your GitHub username
- `GITHUB_TOKEN` - Your GitHub Personal Access Token
- `HOMEWYSE_REPO_URL` - Repository URL (optional, defaults to `https://github.com/$GITHUB_USERNAME/homewyse-scraper.git`)

### Creating a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "homewyse-scraper-access"
4. Select scopes: `repo` (for private repositories)
5. Copy the generated token and use it as `GITHUB_TOKEN`

## Other Environment Variables

### Database Configuration

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/estimation_db
```

### Ollama Configuration

```bash
OLLAMA_BASE_URL=http://localhost:11434
```

## Usage Examples

### Running homewyse setup with environment variables:

```bash
# Set environment variables
export GITHUB_USERNAME=your_github_username
export GITHUB_TOKEN=your_github_personal_access_token

# Run the setup
./scripts/setup-homewyse.sh
```

### Running with Docker Compose:

The `docker-compose.override.yml` file will automatically use environment variables if they're set, otherwise it falls back to the configured defaults.

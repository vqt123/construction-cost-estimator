#!/bin/sh

echo "🏠 [HOMEWYSE] Starting homewyse-scraper repository setup..."

# Configuration
REPO_URL="${HOMEWYSE_REPO_URL}"
TARGET_DIR="/app/homewyse-scraper"
DATA_PATH="/app/data/homewyse-level1"

echo "📂 [HOMEWYSE] Repository URL: $REPO_URL"
echo "📁 [HOMEWYSE] Target directory: $TARGET_DIR"

# Function to setup SSH if SSH key is provided
setup_ssh() {
    if [ -f "/app/ssh/id_rsa" ]; then
        echo "🔑 [HOMEWYSE] Setting up SSH authentication..."
        cp /app/ssh/id_rsa /root/.ssh/id_rsa
        chmod 600 /root/.ssh/id_rsa
        
        if [ -f "/app/ssh/id_rsa.pub" ]; then
            cp /app/ssh/id_rsa.pub /root/.ssh/id_rsa.pub
            chmod 644 /root/.ssh/id_rsa.pub
        fi
        
        # Add GitHub to known hosts
        ssh-keyscan github.com >> /root/.ssh/known_hosts
        echo "✅ [HOMEWYSE] SSH authentication configured"
        return 0
    fi
    return 1
}

# Function to setup Git credentials if provided
setup_git_credentials() {
    if [ -n "$GITHUB_USERNAME" ] && [ -n "$GITHUB_TOKEN" ]; then
        echo "🔑 [HOMEWYSE] Setting up Git credentials..."
        git config --global credential.helper store
        echo "https://$GITHUB_USERNAME:$GITHUB_TOKEN@github.com" > /root/.git-credentials
        echo "✅ [HOMEWYSE] Git credentials configured"
        return 0
    fi
    return 1
}

# Function to clone repository
clone_repository() {
    local auth_method="$1"
    local repo_url="$2"
    
    echo "📥 [HOMEWYSE] Attempting to clone repository using $auth_method..."
    
    if [ -d "$TARGET_DIR" ]; then
        echo "📁 [HOMEWYSE] Directory already exists, removing..."
        rm -rf "$TARGET_DIR"
    fi
    
    # Use the provided repo URL or fall back to the default
    local clone_url="${repo_url:-$REPO_URL}"
    
    if git clone "$clone_url" "$TARGET_DIR"; then
        echo "✅ [HOMEWYSE] Repository cloned successfully using $auth_method"
        return 0
    else
        echo "❌ [HOMEWYSE] Failed to clone repository using $auth_method"
        return 1
    fi
}

# Function to verify data structure
verify_data_structure() {
    local level1_path="$TARGET_DIR/actual-processed/level1"
    
    if [ ! -d "$level1_path" ]; then
        echo "❌ [HOMEWYSE] Expected directory not found: $level1_path"
        echo "📁 [HOMEWYSE] Repository structure:"
        find "$TARGET_DIR" -type d -maxdepth 3 | head -20
        return 1
    fi
    
    local json_count=$(find "$level1_path" -name "*.json" | wc -l)
    echo "📊 [HOMEWYSE] Found $json_count JSON files in $level1_path"
    
    if [ "$json_count" -eq 0 ]; then
        echo "⚠️ [HOMEWYSE] No JSON files found in the expected directory"
        echo "📁 [HOMEWYSE] Contents of $level1_path:"
        ls -la "$level1_path" 2>/dev/null || echo "   Directory is empty or inaccessible"
        return 1
    fi
    
    # Create symlink for easier access
    ln -sf "$level1_path" "$DATA_PATH"
    echo "🔗 [HOMEWYSE] Created symlink: $DATA_PATH -> $level1_path"
    
    return 0
}

# Main execution
echo "🚀 [HOMEWYSE] Starting repository setup process..."

# Try different authentication methods
auth_success=false

# Method 1: Git credentials (username/token) - Try this first since we have them
if setup_git_credentials; then
    # Create authenticated URL
    AUTH_URL="https://$GITHUB_USERNAME:$GITHUB_TOKEN@$(echo $REPO_URL | sed 's|https://github.com/||')"
    if clone_repository "Git credentials" "$AUTH_URL"; then
        auth_success=true
    fi
fi

# Method 2: SSH key authentication
if [ "$auth_success" = false ] && setup_ssh; then
    # Convert HTTPS URL to SSH if using SSH auth
    SSH_REPO_URL=$(echo "$REPO_URL" | sed 's|https://github.com/|git@github.com:|')
    if clone_repository "SSH" "$SSH_REPO_URL"; then
        auth_success=true
    fi
fi

# Method 3: Public repository (no authentication) - Last resort
if [ "$auth_success" = false ]; then
    if clone_repository "public access"; then
        auth_success=true
    fi
fi

# Check if any method succeeded
if [ "$auth_success" = false ]; then
    echo "❌ [HOMEWYSE] All authentication methods failed!"
    echo ""
    echo "📋 [HOMEWYSE] To fix this, you can:"
    echo "1. For public repositories: Make sure the repository is public"
    echo "2. For private repositories with token:"
    echo "   - Set GITHUB_USERNAME and GITHUB_TOKEN environment variables"
    echo "3. For private repositories with SSH:"
    echo "   - Mount your SSH keys to /app/ssh/id_rsa (and optionally id_rsa.pub)"
    echo "4. Mount the repository directly as a volume"
    echo ""
    exit 1
fi

# Verify the repository structure
if verify_data_structure; then
    echo "✅ [HOMEWYSE] Repository setup completed successfully!"
    echo "📊 [HOMEWYSE] Ready to process homewyse data"
    
    # Run the data processing script
    echo "🔄 [HOMEWYSE] Starting data processing..."
    exec node /app/scripts/process-homewyse-data.js
else
    echo "❌ [HOMEWYSE] Repository structure verification failed"
    exit 1
fi 
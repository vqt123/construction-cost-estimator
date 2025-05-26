# 🐛 Debugging Guide - Construction Cost Estimator

## 🔍 New Logging Features

We've added comprehensive logging throughout the application to help you understand what's happening when the application "goes quiet". Here's how to use the new debugging tools:

## 📊 Quick Health Check

### Frontend Health Check

1. Open the application at http://localhost:5173
2. Click the **"Health Check"** button next to "Get Estimate"
3. Check the status log that appears below the form

### API Health Check

```bash
curl http://localhost:5173/api/health
```

## 📋 Monitoring Logs

### Option 1: Use the Monitoring Script

```bash
./scripts/monitor-logs.sh
```

This interactive script will help you choose what to monitor:

- PostgreSQL logs
- Ollama logs
- All Docker services
- SvelteKit development server
- All logs combined

### Option 2: Manual Log Monitoring

**View all Docker service logs:**

```bash
docker compose logs -f
```

**View specific service logs:**

```bash
# PostgreSQL logs
docker compose logs -f postgres

# Ollama logs
docker compose logs -f ollama
```

**View SvelteKit development logs:**

```bash
cd apps/frontend
pnpm dev
```

## 🔍 What the Logs Tell You

### Backend API Logs (`/api/estimate`)

Look for these log patterns in your browser console or terminal:

```
🚀 [ESTIMATE] Starting estimation request at 2024-01-15T10:30:00.000Z
📥 [ESTIMATE] Parsing request body...
📝 [ESTIMATE] Request details: { query: "...", location: "...", projectType: "..." }
🧠 [ESTIMATE] Step 1: Generating embedding for user query...
✅ [ESTIMATE] Step 1 complete: Generated embedding (1234ms)
🔍 [ESTIMATE] Step 2: Searching for relevant cost documents...
✅ [ESTIMATE] Step 2 complete: Found 3 relevant documents (567ms)
🤖 [ESTIMATE] Step 3: Extracting project details using LLM...
✅ [ESTIMATE] Step 3 complete: Successfully parsed project details
🌍 [ESTIMATE] Step 4: Finding matching region...
✅ [ESTIMATE] Step 4 complete: Selected region (89ms)
🏗️ [ESTIMATE] Step 5: Finding project type...
✅ [ESTIMATE] Step 5 complete: Selected project type (45ms)
💰 [ESTIMATE] Step 6: Retrieving cost items...
✅ [ESTIMATE] Step 6 complete: Retrieved 4 cost items (23ms)
🧮 [ESTIMATE] Step 7: Calculating cost breakdown...
✅ [ESTIMATE] Step 7 complete: Calculated breakdown
📝 [ESTIMATE] Step 8: Generating explanation with LLM...
✅ [ESTIMATE] Step 8 complete: Generated explanation (2345ms)
🎉 [ESTIMATE] Request completed successfully in 4567ms
```

### Ollama AI Service Logs

```
🧠 [OLLAMA] Starting embedding generation...
📝 [OLLAMA] Text length: 45 characters
🔗 [OLLAMA] Ollama URL: http://localhost:11434
📡 [OLLAMA] Sending embedding request to Ollama...
✅ [OLLAMA] Embedding generated successfully in 1234ms
📊 [OLLAMA] Embedding dimensions: 1536
```

### Database Logs

```
🗄️ [DB] Creating new database connection pool...
🔗 [DB] Database URL: postgresql://postgres:***@localhost:5432/estimation_db
✅ [DB] Database connection pool created
🔍 [DB] Executing query: SELECT title, content, doc_type, metadata, 1 - (embedding <=> $1::vector) as similarity FROM cost_docs...
📝 [DB] Query parameters: 1 parameters
🔗 [DB] Acquiring database client...
✅ [DB] Client acquired in 12ms
⚡ [DB] Executing query...
✅ [DB] Query completed in 45ms (total: 57ms)
📊 [DB] Result: 3 rows returned
```

### Frontend Status Log

The frontend now shows a real-time status log with timestamps:

```
10:30:15: 🚀 Starting estimation request...
10:30:15: 📡 Request sent, waiting for response... (12ms)
10:30:20: ✅ Estimation completed successfully in 5234ms
10:30:20: 💰 Total cost: $7,245
10:30:20: 📍 Region: Baltimore Metro
10:30:20: 🏗️ Project type: Epoxy Flooring
```

## 🚨 Common Issues & Solutions

### 1. Application Goes Quiet / Long Wait Times

**Most likely causes:**

- Ollama model not loaded or slow to respond
- Database connection issues
- Network connectivity problems

**How to diagnose:**

1. Check the frontend status log
2. Look for the last completed step in backend logs
3. Check if it's stuck on embedding generation or LLM response

**Solutions:**

```bash
# Check if Ollama is responding
curl http://localhost:11434/api/tags

# Check if models are loaded
docker exec estimation-ollama ollama list

# Restart Ollama if needed
docker compose restart ollama

# Check database connectivity
docker exec -it estimation-postgres psql -U postgres -d estimation_db -c "SELECT 1;"
```

### 2. Ollama Connection Errors

**Symptoms:**

```
❌ [OLLAMA] Network error - is Ollama running on http://localhost:11434 ?
🔌 [OLLAMA] Network error - is Ollama running on http://localhost:11434 ?
```

**Solutions:**

```bash
# Check if Ollama container is running
docker compose ps ollama

# Restart Ollama
docker compose restart ollama

# Pull required models if missing
docker exec estimation-ollama ollama pull llama3.2
docker exec estimation-ollama ollama pull nomic-embed-text
```

### 3. Database Connection Errors

**Symptoms:**

```
❌ [DB] Connection refused - is PostgreSQL running?
🔌 [DB] Connection refused - is PostgreSQL running?
```

**Solutions:**

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Restart PostgreSQL
docker compose restart postgres

# Check database logs
docker compose logs postgres
```

### 4. Slow LLM Responses

**Symptoms:**

- Long delays on Step 3 (project extraction) or Step 8 (explanation generation)
- Ollama logs show long processing times

**Solutions:**

- This is normal for local LLM processing
- Consider using smaller models for faster responses
- Ensure your system has adequate RAM and CPU

### 5. Missing Embeddings

**Symptoms:**

```
📊 [DB] Result: 0 rows returned
```

**Solution:**

```bash
# Generate embeddings for cost documents
node scripts/generate-embeddings.js
```

## 🛠️ Advanced Debugging

### Enable Verbose Docker Logs

```bash
# See all container output
docker compose logs -f --tail=100

# See specific service with timestamps
docker compose logs -f -t postgres
```

### Check System Resources

```bash
# Check Docker resource usage
docker stats

# Check available disk space
docker system df
```

### Database Inspection

```bash
# Connect to database
docker exec -it estimation-postgres psql -U postgres -d estimation_db

# Check tables
\dt

# Check if embeddings exist
SELECT COUNT(*) FROM cost_docs WHERE embedding IS NOT NULL;

# Check regions
SELECT * FROM regions;

# Check project types
SELECT * FROM project_types;
```

## 📞 Getting Help

If you're still having issues:

1. **Collect logs:** Run the monitoring script and save the output
2. **Check health:** Use the health check endpoint to see service status
3. **System info:** Note your OS, Docker version, and available resources
4. **Specific error:** Include the exact error message and when it occurs

The comprehensive logging should now make it much easier to identify where the application is getting stuck!

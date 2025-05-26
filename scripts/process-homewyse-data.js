#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Configuration
const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/estimation_db'
  },
  homewyseDataPath: '/app/data/homewyse-level1'
};

console.log('🏠 [HOMEWYSE] Starting Homewyse data processing...');
console.log('📂 [HOMEWYSE] Data path:', config.homewyseDataPath);
console.log('🔗 [HOMEWYSE] Database URL:', config.database.url.replace(/:[^:@]*@/, ':***@'));

// Database connection
const pool = new Pool({
  connectionString: config.database.url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Function to wait for database to be ready
async function waitForDatabase() {
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await query('SELECT 1');
      console.log('✅ [HOMEWYSE] Database connection established');
      return;
    } catch (error) {
      retries++;
      console.log(`⏳ [HOMEWYSE] Waiting for database... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Database connection timeout');
}

// Function to ensure project types exist
async function ensureProjectTypes() {
  console.log('🏗️ [HOMEWYSE] Ensuring project types exist...');
  
  const projectTypes = [
    { name: 'Flooring', description: 'All types of flooring installation and repair' },
    { name: 'Painting', description: 'Interior and exterior painting services' },
    { name: 'Roofing', description: 'Roof installation, repair, and maintenance' },
    { name: 'Plumbing', description: 'Plumbing installation and repair services' },
    { name: 'Electrical', description: 'Electrical installation and repair services' },
    { name: 'HVAC', description: 'Heating, ventilation, and air conditioning services' },
    { name: 'Kitchen Remodeling', description: 'Kitchen renovation and remodeling' },
    { name: 'Bathroom Remodeling', description: 'Bathroom renovation and remodeling' },
    { name: 'Concrete Work', description: 'Concrete installation and repair' },
    { name: 'Landscaping', description: 'Landscaping and outdoor services' },
    { name: 'General Construction', description: 'General construction and renovation work' }
  ];

  for (const projectType of projectTypes) {
    try {
      await query(
        'INSERT INTO project_types (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [projectType.name, projectType.description]
      );
    } catch (error) {
      console.error(`❌ [HOMEWYSE] Error inserting project type ${projectType.name}:`, error.message);
    }
  }
  
  console.log(`✅ [HOMEWYSE] Project types ensured`);
}

// Function to map homewyse categories to project types
function mapCategoryToProjectType(category, subcategory) {
  const categoryLower = category?.toLowerCase() || '';
  const subcategoryLower = subcategory?.toLowerCase() || '';
  
  // Mapping logic based on common construction categories
  if (categoryLower.includes('floor') || subcategoryLower.includes('floor')) {
    return 'Flooring';
  } else if (categoryLower.includes('paint') || subcategoryLower.includes('paint')) {
    return 'Painting';
  } else if (categoryLower.includes('roof') || subcategoryLower.includes('roof')) {
    return 'Roofing';
  } else if (categoryLower.includes('plumb') || subcategoryLower.includes('plumb')) {
    return 'Plumbing';
  } else if (categoryLower.includes('electric') || subcategoryLower.includes('electric')) {
    return 'Electrical';
  } else if (categoryLower.includes('hvac') || categoryLower.includes('heating') || categoryLower.includes('cooling')) {
    return 'HVAC';
  } else if (categoryLower.includes('kitchen') || subcategoryLower.includes('kitchen')) {
    return 'Kitchen Remodeling';
  } else if (categoryLower.includes('bathroom') || subcategoryLower.includes('bathroom')) {
    return 'Bathroom Remodeling';
  } else if (categoryLower.includes('concrete') || subcategoryLower.includes('concrete')) {
    return 'Concrete Work';
  } else if (categoryLower.includes('landscape') || categoryLower.includes('garden')) {
    return 'Landscaping';
  } else {
    return 'General Construction';
  }
}

// Function to process a single JSON file
async function processJsonFile(filePath) {
  try {
    console.log(`📄 [HOMEWYSE] Processing file: ${path.basename(filePath)}`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    if (!data || typeof data !== 'object') {
      console.log(`⚠️ [HOMEWYSE] Skipping invalid JSON file: ${path.basename(filePath)}`);
      return 0;
    }

    let processedCount = 0;

    // Process the data structure - adapt based on your JSON format
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      try {
        // Extract relevant information from the JSON structure
        // Adapt these field names based on your actual JSON structure
        const title = item.title || item.name || item.description || `Homewyse Data - ${path.basename(filePath, '.json')}`;
        const category = item.category || item.type || '';
        const subcategory = item.subcategory || item.subtype || '';
        const description = item.description || item.details || '';
        const cost = item.cost || item.price || item.estimate || '';
        const location = item.location || item.region || item.area || '';
        const specifications = item.specifications || item.specs || '';
        
        // Create content for RAG
        const content = [
          title,
          description,
          category && `Category: ${category}`,
          subcategory && `Subcategory: ${subcategory}`,
          cost && `Cost Information: ${JSON.stringify(cost)}`,
          location && `Location: ${location}`,
          specifications && `Specifications: ${JSON.stringify(specifications)}`,
          `Source: Homewyse Data (${path.basename(filePath)})`
        ].filter(Boolean).join('\n\n');

        if (content.trim().length < 50) {
          console.log(`⚠️ [HOMEWYSE] Skipping item with insufficient content`);
          continue;
        }

        // Map to project type
        const projectTypeName = mapCategoryToProjectType(category, subcategory);
        
        // Get project type ID
        const projectTypeResult = await query(
          'SELECT id FROM project_types WHERE name = $1',
          [projectTypeName]
        );
        
        const projectTypeId = projectTypeResult.rows[0]?.id || null;

        // Create metadata
        const metadata = {
          source: 'homewyse-scraper',
          file: path.basename(filePath),
          category: category,
          subcategory: subcategory,
          original_data: item
        };

        // Insert into cost_docs table
        await query(
          `INSERT INTO cost_docs (title, content, source, doc_type, project_type_id, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            title.substring(0, 500), // Limit title length
            content,
            `homewyse-scraper/${path.basename(filePath)}`,
            'homewyse_data',
            projectTypeId,
            JSON.stringify(metadata)
          ]
        );

        processedCount++;
      } catch (itemError) {
        console.error(`❌ [HOMEWYSE] Error processing item in ${path.basename(filePath)}:`, itemError.message);
      }
    }

    console.log(`✅ [HOMEWYSE] Processed ${processedCount} items from ${path.basename(filePath)}`);
    return processedCount;
    
  } catch (error) {
    console.error(`❌ [HOMEWYSE] Error processing file ${filePath}:`, error.message);
    return 0;
  }
}

// Main processing function
async function processHomewyseData() {
  try {
    await waitForDatabase();
    await ensureProjectTypes();

    // Check if data directory exists
    if (!fs.existsSync(config.homewyseDataPath)) {
      console.error(`❌ [HOMEWYSE] Data directory not found: ${config.homewyseDataPath}`);
      console.log('📁 [HOMEWYSE] This usually means the repository cloning failed.');
      console.log('📁 [HOMEWYSE] Check the clone-homewyse.sh script output above for details.');
      process.exit(1);
    }

    console.log(`📂 [HOMEWYSE] Using data path: ${config.homewyseDataPath}`);

    // Get all JSON files
    const files = fs.readdirSync(config.homewyseDataPath)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(config.homewyseDataPath, file));

    console.log(`📊 [HOMEWYSE] Found ${files.length} JSON files to process`);

    if (files.length === 0) {
      console.log('⚠️ [HOMEWYSE] No JSON files found in the data directory');
      console.log('📁 [HOMEWYSE] Directory contents:');
      try {
        const contents = fs.readdirSync(config.homewyseDataPath);
        console.log('   ', contents.join(', '));
      } catch (e) {
        console.log('   Could not list directory contents');
      }
      return;
    }

    // Clear existing homewyse data
    console.log('🧹 [HOMEWYSE] Clearing existing homewyse data...');
    const deleteResult = await query(
      "DELETE FROM cost_docs WHERE source LIKE 'homewyse-scraper/%'"
    );
    console.log(`🗑️ [HOMEWYSE] Removed ${deleteResult.rowCount} existing records`);

    // Process files
    let totalProcessed = 0;
    for (const file of files) {
      const processed = await processJsonFile(file);
      totalProcessed += processed;
    }

    console.log(`🎉 [HOMEWYSE] Processing complete! Total items processed: ${totalProcessed}`);
    
    // Show summary
    const summaryResult = await query(
      "SELECT COUNT(*) as count FROM cost_docs WHERE source LIKE 'homewyse-scraper/%'"
    );
    console.log(`📈 [HOMEWYSE] Total homewyse records in database: ${summaryResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ [HOMEWYSE] Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the processing
processHomewyseData(); 
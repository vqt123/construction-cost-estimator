-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Regions table for location-based cost adjustments
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    cost_multiplier DECIMAL(4,2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project types and categories
CREATE TABLE project_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost items with detailed specifications
CREATE TABLE cost_items (
    id SERIAL PRIMARY KEY,
    project_type_id INTEGER REFERENCES project_types(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL, -- sq ft, linear ft, each, etc.
    base_cost DECIMAL(10,2) NOT NULL,
    labor_cost DECIMAL(10,2) DEFAULT 0.00,
    material_cost DECIMAL(10,2) DEFAULT 0.00,
    equipment_cost DECIMAL(10,2) DEFAULT 0.00,
    overhead_percentage DECIMAL(5,2) DEFAULT 15.00,
    profit_percentage DECIMAL(5,2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost documents for RAG (embeddings storage)
CREATE TABLE cost_docs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(255), -- file name, URL, etc.
    doc_type VARCHAR(100), -- manual, specification, price_list, etc.
    project_type_id INTEGER REFERENCES project_types(id),
    region_id INTEGER REFERENCES regions(id),
    embedding vector(1536), -- OpenAI ada-002 dimension, adjust for local model
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table for storing estimation requests
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type_id INTEGER REFERENCES project_types(id),
    region_id INTEGER REFERENCES regions(id),
    square_footage DECIMAL(10,2),
    linear_footage DECIMAL(10,2),
    quantity INTEGER,
    estimated_cost DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSONB, -- store additional project details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project line items (detailed breakdown)
CREATE TABLE project_line_items (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    cost_item_id INTEGER REFERENCES cost_items(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_cost_docs_embedding ON cost_docs USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_cost_docs_project_type ON cost_docs(project_type_id);
CREATE INDEX idx_cost_docs_region ON cost_docs(region_id);
CREATE INDEX idx_cost_items_project_type ON cost_items(project_type_id);
CREATE INDEX idx_projects_region ON projects(region_id);
CREATE INDEX idx_projects_type ON projects(project_type_id);
CREATE INDEX idx_project_line_items_project ON project_line_items(project_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cost_items_updated_at BEFORE UPDATE ON cost_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cost_docs_updated_at BEFORE UPDATE ON cost_docs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
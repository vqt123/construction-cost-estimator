-- Insert sample regions
INSERT INTO regions (name, state, zip_code, cost_multiplier) VALUES
('Baltimore Metro', 'MD', '21093', 1.15),
('Washington DC Metro', 'DC', '20001', 1.25),
('Richmond Metro', 'VA', '23220', 1.05),
('Philadelphia Metro', 'PA', '19101', 1.20),
('Atlanta Metro', 'GA', '30301', 1.00),
('Charlotte Metro', 'NC', '28201', 0.95),
('Nashville Metro', 'TN', '37201', 0.90);

-- Insert project types
INSERT INTO project_types (name, description) VALUES
('Epoxy Flooring', 'Epoxy floor coating and sealing services'),
('Concrete Polishing', 'Concrete surface polishing and finishing'),
('Floor Restoration', 'Restoration of existing floor surfaces'),
('Waterproofing', 'Basement and foundation waterproofing'),
('Decorative Concrete', 'Stamped and decorative concrete work'),
('Industrial Flooring', 'Heavy-duty industrial floor solutions');

-- Insert cost items for Epoxy Flooring
INSERT INTO cost_items (project_type_id, name, description, unit, base_cost, labor_cost, material_cost, equipment_cost) VALUES
(1, 'Surface Preparation', 'Grinding and cleaning concrete surface', 'sq ft', 2.50, 1.50, 0.50, 0.50),
(1, 'Primer Application', 'Epoxy primer coat application', 'sq ft', 1.25, 0.75, 0.40, 0.10),
(1, 'Base Coat Application', 'Main epoxy base coat', 'sq ft', 3.50, 1.50, 1.75, 0.25),
(1, 'Top Coat Application', 'Clear protective top coat', 'sq ft', 2.75, 1.25, 1.25, 0.25),
(1, 'Color Flakes', 'Decorative color flake system', 'sq ft', 1.50, 0.50, 0.85, 0.15),
(1, 'Crack Repair', 'Concrete crack filling and repair', 'linear ft', 8.50, 5.00, 2.50, 1.00);

-- Insert cost items for Concrete Polishing
INSERT INTO cost_items (project_type_id, name, description, unit, base_cost, labor_cost, material_cost, equipment_cost) VALUES
(2, 'Initial Grinding', 'Coarse diamond grinding', 'sq ft', 2.00, 1.00, 0.25, 0.75),
(2, 'Progressive Polishing', 'Multi-step diamond polishing', 'sq ft', 4.50, 2.50, 0.75, 1.25),
(2, 'Densifier Application', 'Concrete densifier treatment', 'sq ft', 1.75, 0.75, 0.85, 0.15),
(2, 'Final Polish', 'High-gloss final polish', 'sq ft', 2.25, 1.25, 0.50, 0.50),
(2, 'Stain Guard', 'Protective stain guard application', 'sq ft', 1.50, 0.50, 0.85, 0.15);

-- Insert cost items for Waterproofing
INSERT INTO cost_items (project_type_id, name, description, unit, base_cost, labor_cost, material_cost, equipment_cost) VALUES
(4, 'Exterior Excavation', 'Excavation around foundation', 'linear ft', 45.00, 25.00, 5.00, 15.00),
(4, 'Membrane Installation', 'Waterproof membrane application', 'sq ft', 8.50, 4.00, 3.50, 1.00),
(4, 'Drainage System', 'French drain installation', 'linear ft', 35.00, 20.00, 12.00, 3.00),
(4, 'Interior Sealant', 'Interior basement sealing', 'sq ft', 6.25, 3.50, 2.25, 0.50),
(4, 'Crack Injection', 'Polyurethane crack injection', 'linear ft', 12.50, 7.00, 4.50, 1.00);

-- Insert sample cost documents for RAG
INSERT INTO cost_docs (title, content, source, doc_type, project_type_id, region_id, metadata) VALUES
('Epoxy Flooring Best Practices', 'Epoxy flooring requires proper surface preparation including grinding to achieve 25-50 micron profile. Temperature should be between 50-90°F with humidity below 85%. Primer coat is essential for adhesion on concrete surfaces older than 28 days. Base coat thickness should be 4-6 mils for residential, 8-12 mils for commercial applications.', 'technical_manual.pdf', 'manual', 1, 1, '{"version": "2024", "author": "Flooring Institute"}'),

('Baltimore Area Cost Factors', 'Baltimore metropolitan area experiences 15% higher labor costs compared to national average. Material costs are typically 8% above national average due to transportation. Permit costs range from $150-500 depending on project scope. Winter months (Dec-Feb) may require heated enclosures adding 20-30% to project costs.', 'regional_guide.pdf', 'price_list', 1, 1, '{"year": "2024", "source": "Regional Construction Board"}'),

('Concrete Polishing Specifications', 'Concrete polishing process involves progressive diamond grinding starting with 30-40 grit, progressing through 80, 150, 400, 800, 1500, 3000 grit. Densifier application between 400-800 grit steps. Final gloss levels: Level 1 (flat), Level 2 (satin), Level 3 (semi-gloss), Level 4 (high-gloss). Aggregate exposure affects pricing significantly.', 'polishing_spec.pdf', 'specification', 2, NULL, '{"standard": "ACI 310", "revision": "2024"}'),

('Waterproofing Material Costs 2024', 'Modified bitumen membranes: $2.50-4.00/sq ft. Liquid applied membranes: $3.50-6.00/sq ft. EPDM rubber: $4.00-7.00/sq ft. Polyurethane injection materials: $8-15/linear ft depending on crack width. French drain materials: $8-12/linear ft including pipe, gravel, and fabric.', 'material_costs_2024.xlsx', 'price_list', 4, NULL, '{"quarter": "Q4", "year": "2024", "supplier": "National Waterproofing Supply"}');

-- Update embedding dimension comment (will be updated when we implement embeddings)
COMMENT ON COLUMN cost_docs.embedding IS 'Vector embedding for semantic search - dimension depends on chosen model'; 
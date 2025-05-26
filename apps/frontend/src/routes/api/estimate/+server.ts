import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db.js';
import { generateEmbedding, generateResponse } from '$lib/ollama.js';

interface EstimationRequest {
	query: string;
	location?: string;
	projectType?: string;
}

interface EstimationResponse {
	estimate: {
		totalCost: number;
		breakdown: Array<{
			item: string;
			quantity: number;
			unitCost: number;
			totalCost: number;
			unit: string;
		}>;
		region: string;
		projectType: string;
	};
	explanation: string;
	confidence: number;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: EstimationRequest = await request.json();
		const { query: userQuery, location, projectType } = body;

		if (!userQuery) {
			return json({ error: 'Query is required' }, { status: 400 });
		}

		// Step 1: Generate embedding for the user query
		const queryEmbedding = await generateEmbedding(userQuery);

		// Step 2: Find relevant cost documents using vector similarity
		const relevantDocs = await query(
			`
      SELECT 
        title, content, doc_type, metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM cost_docs 
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT 5
    `,
			[JSON.stringify(queryEmbedding)]
		);

		// Step 3: Extract project details from query using LLM
		const extractionPrompt = `
    Analyze this construction estimation query and extract key details:
    Query: "${userQuery}"
    
    Extract and return in JSON format:
    {
      "projectType": "type of work (epoxy flooring, concrete polishing, waterproofing, etc.)",
      "area": "square footage if mentioned",
      "location": "location/zip code if mentioned",
      "specificRequirements": ["list of specific requirements"]
    }
    
    Only return the JSON, no other text.
    `;

		const extractedDetails = await generateResponse(extractionPrompt);
		let projectDetails;
		try {
			projectDetails = JSON.parse(extractedDetails);
		} catch {
			projectDetails = { projectType: projectType || 'epoxy flooring', area: 600 };
		}

		// Step 4: Find matching region
		const regionQuery = location || projectDetails.location || '21093';
		const regionResult = await query(
			`
      SELECT id, name, cost_multiplier 
      FROM regions 
      WHERE zip_code = $1 OR name ILIKE $2
      LIMIT 1
    `,
			[regionQuery, `%${regionQuery}%`]
		);

		const region = regionResult.rows[0] || {
			id: 1,
			name: 'Baltimore Metro',
			cost_multiplier: 1.15
		};

		// Step 5: Find project type
		const typeQuery = projectType || projectDetails.projectType || 'epoxy flooring';
		const projectTypeResult = await query(
			`
      SELECT id, name 
      FROM project_types 
      WHERE name ILIKE $1
      LIMIT 1
    `,
			[`%${typeQuery}%`]
		);

		const selectedProjectType = projectTypeResult.rows[0] || { id: 1, name: 'Epoxy Flooring' };

		// Step 6: Get cost items for the project type
		const costItemsResult = await query(
			`
      SELECT name, description, unit, base_cost, labor_cost, material_cost, equipment_cost
      FROM cost_items 
      WHERE project_type_id = $1
    `,
			[selectedProjectType.id]
		);

		// Step 7: Calculate estimate based on area
		const area = parseFloat(projectDetails.area) || 600;
		const breakdown = costItemsResult.rows.map((item: any) => {
			const adjustedCost = item.base_cost * region.cost_multiplier;
			const quantity = item.unit === 'sq ft' ? area : item.unit === 'linear ft' ? area * 0.1 : 1;

			return {
				item: item.name,
				quantity: Math.round(quantity * 100) / 100,
				unitCost: Math.round(adjustedCost * 100) / 100,
				totalCost: Math.round(quantity * adjustedCost * 100) / 100,
				unit: item.unit
			};
		});

		const totalCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);

		// Step 8: Generate explanation using LLM with context
		const contextDocs = relevantDocs.rows.map((doc: any) => doc.content).join('\n\n');
		const explanationPrompt = `
    Based on the following cost estimation for ${selectedProjectType.name} in ${region.name}:
    
    Total Cost: $${totalCost.toLocaleString()}
    Area: ${area} sq ft
    
    Cost Breakdown:
    ${breakdown.map((item) => `- ${item.item}: ${item.quantity} ${item.unit} × $${item.unitCost} = $${item.totalCost}`).join('\n')}
    
    Relevant Documentation:
    ${contextDocs}
    
    Provide a clear, professional explanation of this estimate including:
    1. Why this cost is reasonable for the scope
    2. Key factors affecting the price
    3. Any important considerations or recommendations
    
    Keep it concise but informative (2-3 paragraphs).
    `;

		const explanation = await generateResponse(explanationPrompt);

		const response: EstimationResponse = {
			estimate: {
				totalCost: Math.round(totalCost * 100) / 100,
				breakdown,
				region: region.name,
				projectType: selectedProjectType.name
			},
			explanation,
			confidence: Math.min(0.95, 0.7 + relevantDocs.rows.length * 0.05)
		};

		return json(response);
	} catch (error) {
		console.error('Estimation error:', error);
		return json(
			{
				error: 'Failed to generate estimate',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

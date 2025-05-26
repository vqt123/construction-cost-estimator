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
	const startTime = Date.now();
	console.log('🚀 [ESTIMATE] Starting estimation request at', new Date().toISOString());

	try {
		console.log('📥 [ESTIMATE] Parsing request body...');
		const body: EstimationRequest = await request.json();
		const { query: userQuery, location, projectType } = body;
		console.log('📝 [ESTIMATE] Request details:', {
			query: userQuery,
			location: location || 'not provided',
			projectType: projectType || 'not provided'
		});

		if (!userQuery) {
			console.log('❌ [ESTIMATE] No query provided');
			return json({ error: 'Query is required' }, { status: 400 });
		}

		// Step 1: Generate embedding for the user query
		console.log('🧠 [ESTIMATE] Step 1: Generating embedding for user query...');
		const embeddingStartTime = Date.now();
		const queryEmbedding = await generateEmbedding(userQuery);
		const embeddingTime = Date.now() - embeddingStartTime;
		console.log(`✅ [ESTIMATE] Step 1 complete: Generated embedding (${embeddingTime}ms)`);

		// Step 2: Find relevant cost documents using vector similarity
		console.log('🔍 [ESTIMATE] Step 2: Searching for relevant cost documents...');
		const vectorSearchStartTime = Date.now();
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
		const vectorSearchTime = Date.now() - vectorSearchStartTime;
		console.log(
			`✅ [ESTIMATE] Step 2 complete: Found ${relevantDocs.rows.length} relevant documents (${vectorSearchTime}ms)`
		);
		console.log(
			'📄 [ESTIMATE] Relevant documents:',
			relevantDocs.rows.map((doc) => ({
				title: doc.title,
				similarity: Math.round(doc.similarity * 100) / 100
			}))
		);

		// Step 3: Extract project details from query using LLM
		console.log('🤖 [ESTIMATE] Step 3: Extracting project details using LLM...');
		const extractionStartTime = Date.now();
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
		const extractionTime = Date.now() - extractionStartTime;
		console.log(`🤖 [ESTIMATE] LLM extraction response (${extractionTime}ms):`, extractedDetails);

		let projectDetails;
		try {
			projectDetails = JSON.parse(extractedDetails);
			console.log(
				'✅ [ESTIMATE] Step 3 complete: Successfully parsed project details:',
				projectDetails
			);
		} catch {
			console.log('⚠️ [ESTIMATE] Step 3 fallback: Failed to parse LLM response, using defaults');
			projectDetails = { projectType: projectType || 'epoxy flooring', area: 600 };
		}

		// Step 4: Find matching region
		console.log('🌍 [ESTIMATE] Step 4: Finding matching region...');
		const regionQuery = location || projectDetails.location || '21093';
		console.log('🌍 [ESTIMATE] Region query:', regionQuery);

		const regionStartTime = Date.now();
		const regionResult = await query(
			`
      SELECT id, name, cost_multiplier 
      FROM regions 
      WHERE zip_code = $1 OR name ILIKE $2
      LIMIT 1
    `,
			[regionQuery, `%${regionQuery}%`]
		);
		const regionTime = Date.now() - regionStartTime;

		const region = regionResult.rows[0] || {
			id: 1,
			name: 'Baltimore Metro',
			cost_multiplier: 1.15
		};
		console.log(`✅ [ESTIMATE] Step 4 complete: Selected region (${regionTime}ms):`, region);

		// Step 5: Find project type
		console.log('🏗️ [ESTIMATE] Step 5: Finding project type...');
		const typeQuery = projectType || projectDetails.projectType || 'epoxy flooring';
		console.log('🏗️ [ESTIMATE] Project type query:', typeQuery);

		const projectTypeStartTime = Date.now();
		const projectTypeResult = await query(
			`
      SELECT id, name 
      FROM project_types 
      WHERE name ILIKE $1
      LIMIT 1
    `,
			[`%${typeQuery}%`]
		);
		const projectTypeTime = Date.now() - projectTypeStartTime;

		const selectedProjectType = projectTypeResult.rows[0] || { id: 1, name: 'Epoxy Flooring' };
		console.log(
			`✅ [ESTIMATE] Step 5 complete: Selected project type (${projectTypeTime}ms):`,
			selectedProjectType
		);

		// Step 6: Get cost items for the project type
		console.log('💰 [ESTIMATE] Step 6: Retrieving cost items...');
		const costItemsStartTime = Date.now();
		const costItemsResult = await query(
			`
      SELECT name, description, unit, base_cost, labor_cost, material_cost, equipment_cost
      FROM cost_items 
      WHERE project_type_id = $1
    `,
			[selectedProjectType.id]
		);
		const costItemsTime = Date.now() - costItemsStartTime;
		console.log(
			`✅ [ESTIMATE] Step 6 complete: Retrieved ${costItemsResult.rows.length} cost items (${costItemsTime}ms)`
		);
		console.log(
			'💰 [ESTIMATE] Cost items:',
			costItemsResult.rows.map((item) => ({
				name: item.name,
				unit: item.unit,
				base_cost: item.base_cost
			}))
		);

		// Step 7: Calculate estimate based on area
		console.log('🧮 [ESTIMATE] Step 7: Calculating cost breakdown...');
		const area = parseFloat(projectDetails.area) || 600;
		console.log('📏 [ESTIMATE] Using area:', area, 'sq ft');

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
		console.log('✅ [ESTIMATE] Step 7 complete: Calculated breakdown');
		console.log('💵 [ESTIMATE] Total cost:', totalCost);
		console.log(
			'📊 [ESTIMATE] Breakdown summary:',
			breakdown.map((item) => ({
				item: item.item,
				total: item.totalCost
			}))
		);

		// Step 8: Generate explanation using LLM with context
		console.log('📝 [ESTIMATE] Step 8: Generating explanation with LLM...');
		const explanationStartTime = Date.now();
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
		const explanationTime = Date.now() - explanationStartTime;
		console.log(`✅ [ESTIMATE] Step 8 complete: Generated explanation (${explanationTime}ms)`);

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

		const totalTime = Date.now() - startTime;
		console.log(`🎉 [ESTIMATE] Request completed successfully in ${totalTime}ms`);
		console.log('📈 [ESTIMATE] Performance breakdown:', {
			embedding: `${embeddingTime}ms`,
			vectorSearch: `${vectorSearchTime}ms`,
			extraction: `${extractionTime}ms`,
			region: `${regionTime}ms`,
			projectType: `${projectTypeTime}ms`,
			costItems: `${costItemsTime}ms`,
			explanation: `${explanationTime}ms`,
			total: `${totalTime}ms`
		});

		return json(response);
	} catch (error) {
		const totalTime = Date.now() - startTime;
		console.error(`❌ [ESTIMATE] Request failed after ${totalTime}ms:`, error);
		console.error(
			'❌ [ESTIMATE] Error stack:',
			error instanceof Error ? error.stack : 'No stack trace'
		);

		return json(
			{
				error: 'Failed to generate estimate',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

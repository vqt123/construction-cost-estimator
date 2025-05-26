export const config = {
	database: {
		url: 'postgresql://postgres:postgres@localhost:5432/estimation_db'
	},
	ollama: {
		baseUrl: 'http://localhost:11434'
	},
	app: {
		port: 5173,
		nodeEnv: 'development'
	}
};

/**
 * Configuration interface for the Visual QA MCP server
 */
export interface Config {
  port?: number;
}

/**
 * Input parameters for the Visual QA tool
 */
export interface VQAToolInput {
  apiKey: string;     // Gemini API key
  question: string;   // Question about the image
  image: string;      // Base64 encoded image
}

/**
 * Response from the Visual QA tool
 */
export interface VQAToolResponse {
  answer: string;
  confidence?: number;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  schema: object;
  handler: (input: any) => Promise<any>;
}
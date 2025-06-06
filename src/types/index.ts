/**
 * Configuration interface for the Visual QA MCP server
 */
export interface Config {
  port?: number;
  gemini: {
    apiKey: string;
    apiEndpoint?: string;
    maxRetries: number;
    timeout: number;
  };
  server: {
    cors?: {
      origin: string | string[];
      credentials?: boolean;
    };
    rateLimit?: {
      windowMs: number;
      max: number;
    };
  };
}

/**
 * Input parameters for the Visual QA tool
 */
export interface VQAToolInput {
  question: string;   // Question about the image
  image: string;      // Base64 encoded image
  context?: string;   // Optional context for the question
  maxTokens?: number; // Maximum tokens in response
}

/**
 * Response from the Visual QA tool
 */
export interface VQAToolResponse {
  answer: string;
  confidence?: number;
  processingTime?: number;
  modelUsed?: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Gemini service interfaces
 */
export interface GeminiServiceConfig {
  apiKey: string;
  apiEndpoint?: string;
  maxRetries: number;
  timeout: number;
}

export interface GeminiRequest {
  prompt: string;
  image: string;
  maxTokens?: number;
  temperature?: number;
  contextPrompt?: string;
}

export interface GeminiResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  modelInfo: {
    name: string;
    version: string;
  };
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * MCP Tool definition with enhanced typing
 */
export interface MCPTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  schema: object;
  handler: (input: TInput) => Promise<TOutput>;
  validate?: (input: TInput) => Promise<void>;
}

/**
 * Server validation types
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface RequestValidation {
  validateImage: (base64Image: string) => ValidationResult;
  validateQuestion: (question: string) => ValidationResult;
  validateContext?: (context: string) => ValidationResult;
}
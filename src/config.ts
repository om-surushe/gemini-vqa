import dotenv from 'dotenv';
import { Config, VQAToolInput } from './types';

// Load environment variables from .env file
dotenv.config();

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(`Configuration Error: ${message}`);
    this.name = 'ConfigurationError';
  }
}

function validateEnvironmentVariable(name: string, value?: string): string {
  if (!value) {
    throw new ConfigurationError(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseInteger(name: string, value: string, defaultValue?: number): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new ConfigurationError(`Invalid integer value for ${name}: ${value}`);
  }
  return parsed;
}

/**
 * Creates and validates the configuration object
 * @returns Config object with validated settings
 * @throws ConfigurationError if required environment variables are missing or invalid
 */
export function getConfig(): Config {
  const errors: string[] = [];

  // Helper to collect validation errors
  const validateWithErrors = (name: string, value?: string): string => {
    try {
      return validateEnvironmentVariable(name, value);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        errors.push(error.message);
      }
      // Return empty string - this will be caught by the error check before returning
      return '';
    }
  };

  // Helper to parse integers with error collection
  const parseIntegerWithErrors = (name: string, value: string | undefined, defaultValue: number): number => {
    try {
      return parseInteger(name, value || String(defaultValue), defaultValue);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        errors.push(error.message);
      }
      return defaultValue;
    }
  };

  // Required configuration
  const geminiApiKey = validateWithErrors('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
  
  // Optional configuration with defaults
  const maxRetries = parseIntegerWithErrors('GEMINI_MAX_RETRIES', process.env.GEMINI_MAX_RETRIES, 3);
  const timeout = parseIntegerWithErrors('GEMINI_TIMEOUT', process.env.GEMINI_TIMEOUT, 30000);
  const port = parseIntegerWithErrors('PORT', process.env.PORT, 7777);
  
  
  // Rate limiting configuration
  const rateLimitWindow = parseIntegerWithErrors('RATE_LIMIT_WINDOW', process.env.RATE_LIMIT_WINDOW, 900000);
  const rateLimitMax = parseIntegerWithErrors('RATE_LIMIT_MAX', process.env.RATE_LIMIT_MAX, 100);

  // If any validation errors occurred, throw error with all messages
  if (errors.length > 0) {
    throw new ConfigurationError(errors.join('\n'));
  }

  // Create and return validated config
  const config: Config = {
    port,
    gemini: {
      apiKey: geminiApiKey,
      apiEndpoint: process.env.GEMINI_API_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta',
      maxRetries,
      timeout
    },
    server: {
      rateLimit: {
        windowMs: rateLimitWindow,
        max: rateLimitMax
      }
    }
  };

  return config;
}

/**
 * Validates the entire configuration at once
 * @throws {ConfigurationError} if validation fails
 */
export function validateConfig(): void {
  getConfig(); // This will throw if validation fails
}

/**
 * Gets the JSON schema for the Visual QA tool
 * This schema will be used to validate incoming requests
 */
export const vqaToolSchema = {
  type: 'object',
  properties: {
    question: {
      type: 'string',
      description: 'The question to ask about the image',
      minLength: 1,
      maxLength: 1000
    },
    image: {
      type: 'string',
      description: 'Base64 encoded image data',
      pattern: '^data:image\\/[a-zA-Z+]+;base64,'
    },
    context: {
      type: 'string',
      description: 'Optional context for the question',
      maxLength: 2000
    },
    maxTokens: {
      type: 'integer',
      description: 'Maximum tokens in response',
      minimum: 1,
      maximum: 2048,
      default: 1024
    }
  },
  required: ['question', 'image'],
  additionalProperties: false
} as const;

/**
 * Environment variable validation schema
 */
export const envSchema = {
  required: ['GEMINI_API_KEY'],
  properties: {
    GEMINI_API_KEY: { type: 'string' },
    GEMINI_API_ENDPOINT: { type: 'string', format: 'uri' },
    GEMINI_MAX_RETRIES: { type: 'string', pattern: '^[0-9]+$' },
    GEMINI_TIMEOUT: { type: 'string', pattern: '^[0-9]+$' },
    PORT: { type: 'string', pattern: '^[0-9]+$' },
    RATE_LIMIT_WINDOW: { type: 'string', pattern: '^[0-9]+$' },
    RATE_LIMIT_MAX: { type: 'string', pattern: '^[0-9]+$' }
  }
} as const;
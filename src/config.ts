import dotenv from 'dotenv';
import { Config } from './types';

// Load environment variables from .env file
dotenv.config();

/**
 * Creates and validates the configuration object
 * @returns Config object with validated settings
 */
export function getConfig(): Config {
  return {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 7777
  };
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
      description: 'The question to ask about the image'
    },
    image: {
      type: 'string',
      description: 'Base64 encoded image data'
    }
  },
  required: ['question', 'image'],
  additionalProperties: false
};
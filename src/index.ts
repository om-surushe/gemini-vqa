#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Create MCP server
const server = new Server(
  {
    name: 'gemini-vqa-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define the visual QA tool
const visualQATool: Tool = {
  name: 'visual_qa',
  description: 'Answer questions about images using Google Gemini',
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The question to ask about the image',
      },
      image: {
        type: 'string',
        description: 'Base64 encoded image data (without data URL prefix)',
      },
    },
    required: ['question', 'image'],
  },
};

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [visualQATool],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'visual_qa') {
    try {
      const { question, image } = args as { question: string; image: string };

      // Validate inputs
      if (!question || typeof question !== 'string') {
        throw new Error('Question is required and must be a string');
      }

      if (!image || typeof image !== 'string') {
        throw new Error('Image is required and must be a base64 string');
      }

      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(image)) {
        throw new Error('Invalid base64 format');
      }

      console.error(`Processing visual QA request: ${question.substring(0, 50)}...`);

      // Prepare image data for Gemini
      const imagePart = {
        inlineData: {
          data: image,
          mimeType: 'image/jpeg', // Assume JPEG for simplicity
        },
      };

      // Generate response
      const result = await model.generateContent([question, imagePart]);
      const response = await result.response;
      const answer = response.text();

      console.error(`Generated answer: ${answer.substring(0, 100)}...`);

      return {
        content: [
          {
            type: 'text',
            text: answer,
          },
        ],
      };
    } catch (error) {
      console.error('Error in visual_qa tool:', error);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Gemini Visual QA MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

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
      imagePath: {
        type: 'string',
        description: 'Path to the image file (supports JPEG, PNG, GIF, WebP)',
      },
    },
    required: ['question', 'imagePath'],
  },
};

// Helper function to get MIME type from file extension
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/jpeg'; // Default to JPEG
  }
}
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
      const { question, imagePath } = args as { question: string; imagePath: string };

      // Validate inputs
      if (!question || typeof question !== 'string') {
        throw new Error('Question is required and must be a string');
      }

      if (!imagePath || typeof imagePath !== 'string') {
        throw new Error('Image path is required and must be a string');
      }

      // Check if file exists
      if (!existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      console.error(`Processing visual QA request for: ${imagePath}`);
      console.error(`Question: ${question.substring(0, 50)}...`);

      // Read image file and convert to base64
      let imageBuffer: Buffer;
      try {
        imageBuffer = readFileSync(imagePath);
      } catch (fileError) {
        throw new Error(`Failed to read image file: ${fileError instanceof Error ? fileError.message : 'Unknown file error'}`);
      }

      const base64Image = imageBuffer.toString('base64');
      const mimeType = getMimeType(imagePath);

      console.error(`Image loaded: ${imageBuffer.length} bytes, MIME type: ${mimeType}`);

      // Prepare image data for Gemini
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
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
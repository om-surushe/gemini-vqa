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
import puppeteer from 'puppeteer';

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

// Define the visual QA tools
const visualQAFileTool: Tool = {
  name: 'analyze_image_file',
  description: 'Answer questions about local image files using Google Gemini',
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

const websiteAnalysisTool: Tool = {
  name: 'analyze_website',
  description: 'Take a screenshot of a website and analyze it using Google Gemini',
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The question to ask about the website',
      },
      url: {
        type: 'string',
        description: 'The URL of the website to analyze',
      },
      waitFor: {
        type: 'number',
        description: 'Time to wait in milliseconds before taking screenshot (default: 3000)',
        default: 3000,
      },
      viewportWidth: {
        type: 'number',
        description: 'Viewport width for screenshot (default: 1280)',
        default: 1280,
      },
      viewportHeight: {
        type: 'number',
        description: 'Viewport height for screenshot (default: 720)',
        default: 720,
      },
      fullPage: {
        type: 'boolean',
        description: 'Take full page screenshot (default: false)',
        default: false,
      },
    },
    required: ['question', 'url'],
  },
};

// Helper function to take website screenshot
async function takeWebsiteScreenshot(
  url: string,
  options: {
    waitFor?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    fullPage?: boolean;
  } = {}
): Promise<Buffer> {
  const {
    waitFor = 3000,
    viewportWidth = 1280,
    viewportHeight = 720,
    fullPage = false,
  } = options;

  console.error(`Taking screenshot of: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight,
    });

    // Set user agent to avoid bot detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for additional time if specified
    if (waitFor > 0) {
      await new Promise(resolve => setTimeout(resolve, waitFor));
    }

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: fullPage,
    });

    console.error(`Screenshot taken successfully: ${screenshot.length} bytes`);
    return screenshot as Buffer;
  } finally {
    await browser.close();
  }
}
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
    tools: [visualQAFileTool, websiteAnalysisTool],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'analyze_image_file') {
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

      console.error(`Processing image file analysis: ${imagePath}`);
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
      console.error('Error in analyze_image_file tool:', error);
      
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

  if (name === 'analyze_website') {
    try {
      const { 
        question, 
        url, 
        waitFor = 3000, 
        viewportWidth = 1280, 
        viewportHeight = 720, 
        fullPage = false 
      } = args as { 
        question: string; 
        url: string; 
        waitFor?: number; 
        viewportWidth?: number; 
        viewportHeight?: number; 
        fullPage?: boolean; 
      };

      // Validate inputs
      if (!question || typeof question !== 'string') {
        throw new Error('Question is required and must be a string');
      }

      if (!url || typeof url !== 'string') {
        throw new Error('URL is required and must be a string');
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL format');
      }

      console.error(`Processing website analysis: ${url}`);
      console.error(`Question: ${question.substring(0, 50)}...`);

      // Take screenshot
      const screenshotBuffer = await takeWebsiteScreenshot(url, {
        waitFor,
        viewportWidth,
        viewportHeight,
        fullPage,
      });

      const base64Image = screenshotBuffer.toString('base64');

      console.error(`Screenshot taken: ${screenshotBuffer.length} bytes`);

      // Prepare image data for Gemini
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/png',
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
      console.error('Error in analyze_website tool:', error);
      
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
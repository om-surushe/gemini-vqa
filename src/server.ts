import express, { Request, Response, Application } from 'express';
import { json } from 'body-parser';
import { getConfig, vqaToolSchema } from './config';
import { GeminiService } from './services/gemini';
import { VQAToolInput, VQAToolResponse, ErrorResponse } from './types';

class VQAMCPServer {
  private app: Application;
  private geminiService: GeminiService;
  private port: number;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required as a command line argument');
    }

    const config = getConfig();
    this.port = config.port ?? 3000;
    this.geminiService = new GeminiService(apiKey);
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(json({ limit: '10mb' })); // Increased limit for base64 images
  }

  private setupRoutes(): void {
    // MCP Service Discovery endpoint
    this.app.get('/mcp', (_: Request, res: Response): void => {
      res.json({
        name: 'gemini-vqa-mcp',
        version: '1.0.0',
        description: 'Visual Question Answering MCP using Google Gemini',
        tools: [
          {
            name: 'analyze_image',
            description: 'Answer questions about an image using Gemini Vision',
            schema: vqaToolSchema
          }
        ]
      });
    });

    // Main VQA endpoint
    this.app.post('/mcp/tools/analyze_image', async (req: Request, res: Response): Promise<void> => {
      try {
        // Validate request body against schema
        const input: Omit<VQAToolInput, 'apiKey'> = req.body;
        if (!input.question || !input.image) {
          const error: ErrorResponse = {
            error: 'Invalid input',
            details: 'Question and image are required'
          };
          res.status(400).json(error);
          return;
        }

        console.log(`Processing question: ${input.question}`);
        const response: VQAToolResponse = await this.geminiService.analyzeImage(input);
        console.log('Response generated successfully');
        
        res.json(response);
      } catch (error) {
        console.error('Error processing request:', error);
        const errorResponse: ErrorResponse = {
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error occurred'
        };
        res.status(500).json(errorResponse);
      }
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 VQA MCP Server running on port ${this.port}`);
      console.log('Available endpoints:');
      console.log('- GET /mcp - Service discovery');
      console.log('- POST /mcp/tools/analyze_image - Process VQA requests');
    });
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const apiKeyArg = args.find(arg => arg.startsWith('--api-key='));
const apiKey = apiKeyArg ? apiKeyArg.split('=')[1] : process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('Error: GEMINI_API_KEY must be provided via --api-key argument or environment variable');
  process.exit(1);
}

// Start the server
const server = new VQAMCPServer(apiKey);
server.start();

export default VQAMCPServer;
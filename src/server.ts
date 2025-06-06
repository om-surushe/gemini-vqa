import express, { Request, Response, Application, NextFunction } from 'express';
import { json } from 'body-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getConfig, vqaToolSchema } from './config';
import { GeminiService, GeminiServiceError } from './services/gemini';
import {
  Config,
  VQAToolInput,
  VQAToolResponse,
  ErrorResponse,
  ValidationResult,
  RequestValidation
} from './types';

/**
 * Default validation result for optional validations
 */
const DEFAULT_VALIDATION: ValidationResult = { valid: true };

class VQAMCPServer {
  private app: Application;
  private geminiService: GeminiService;
  private config: Config;
  private validator: RequestValidation;
  private server: ReturnType<Application['listen']> | null = null;
  private isShuttingDown: boolean = false;

  constructor() {
    this.config = getConfig();
    this.app = express();
    this.geminiService = new GeminiService(this.config.gemini);
    this.validator = this.createValidator();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize services in sequence
      await this.initializeGeminiService();
      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandling();
    } catch (error) {
      console.error('Failed to initialize server:', error);
      throw new Error('Server initialization failed');
    }
  }

  private async initializeGeminiService(): Promise<void> {
    try {
      await this.geminiService.validateConnection();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Gemini service initialization failed: ${errorMessage}`);
    }
  }

  private createValidator(): RequestValidation {
    return {
      validateImage: (base64Image: string): ValidationResult => {
        if (!base64Image) {
          return { valid: false, errors: ['Image is required'] };
        }
        if (!base64Image.match(/^data:image\/(png|jpeg|jpg);base64,/)) {
          return { valid: false, errors: ['Invalid image format'] };
        }
        return { valid: true };
      },
      validateQuestion: (question: string): ValidationResult => {
        if (!question || question.trim().length === 0) {
          return { valid: false, errors: ['Question is required'] };
        }
        if (question.length > 1000) {
          return { valid: false, errors: ['Question too long'] };
        }
        return { valid: true };
      },
      validateContext: (context: string): ValidationResult => {
        if (context && context.length > 2000) {
          return { valid: false, errors: ['Context too long'] };
        }
        return { valid: true };
      }
    };
  }

  private setupMiddleware(): void {
    // Basic security headers
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });

    // Enable CORS for all origins
    this.app.use(cors());

    // Rate limiting
    if (this.config.server.rateLimit) {
      this.app.use(rateLimit(this.config.server.rateLimit));
    }

    // Request parsing
    this.app.use(json({
      limit: '10mb',
      verify: (req: Request, res: Response, buf: Buffer) => {
        if (buf.length > 10 * 1024 * 1024) { // 10MB limit
          throw new Error('Payload too large');
        }
      }
    }));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

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
    this.app.post('/mcp/tools/analyze_image', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const input: VQAToolInput = req.body;
        
        // Validate request
        const imgValidation = this.validator.validateImage(input.image);
        const quesValidation = this.validator.validateQuestion(input.question);
        const ctxValidation = input.context && this.validator.validateContext ?
          this.validator.validateContext(input.context) :
          DEFAULT_VALIDATION;
        
        const validationErrors = [
          ...(imgValidation.errors || []),
          ...(quesValidation.errors || []),
          ...(ctxValidation.errors || [])
        ];

        if (validationErrors.length > 0) {
          const error: ErrorResponse = {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: validationErrors.join('; '),
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string
          };
          res.status(400).json(error);
          return;
        }

        console.log(`Processing question: ${input.question}`);
        const startTime = Date.now();
        const response: VQAToolResponse = await this.geminiService.analyzeImage(input);
        console.log(`Response generated in ${Date.now() - startTime}ms`);
        
        res.json(response);
      } catch (error) {
        next(error); // Pass to error handling middleware
      }
    });
  }

  private setupErrorHandling(): void {
    // Custom error handling middleware
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Error processing request:', err);
      
      const errorResponse: ErrorResponse = {
        error: 'Internal server error',
        code: err instanceof GeminiServiceError ? 'GEMINI_ERROR' : 'SERVER_ERROR',
        details: err instanceof GeminiServiceError ? err.details : err.message,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      };

      res.status(500).json(errorResponse);
    });
  }

  public async start(): Promise<void> {
    if (this.server) {
      throw new Error('Server is already running');
    }

    try {
      await this.initialize();

      return new Promise((resolve, reject) => {
        this.server = this.app.listen(this.config.port, () => {
          console.log(`🚀 VQA MCP Server running on port ${this.config.port}`);
          console.log('Available endpoints:');
          console.log('- GET /health - Health check');
          console.log('- GET /mcp - Service discovery');
          console.log('- POST /mcp/tools/analyze_image - Process VQA requests');
          resolve();
        });

        this.server.on('error', (error) => {
          reject(new Error(`Failed to start server: ${error.message}`));
        });
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.server || this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('Shutting down server...');

    try {
      // Stop accepting new requests
      this.app.disable('trust proxy');
      
      // Close server
      await new Promise<void>((resolve, reject) => {
        if (!this.server) {
          resolve();
          return;
        }

        this.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      // Cleanup resources
      await this.geminiService.cleanup();
      
      this.server = null;
      this.isShuttingDown = false;
      console.log('Server shutdown complete');
    } catch (error) {
      this.isShuttingDown = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error during shutdown: ${errorMessage}`);
    }
  }
}

export default VQAMCPServer;
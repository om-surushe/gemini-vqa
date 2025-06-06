import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  VQAToolInput,
  VQAToolResponse,
  GeminiServiceConfig,
  GeminiRequest,
  GeminiResponse,
  RetryConfig,
} from "../types";

export class GeminiServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly details?: string
  ) {
    super(message);
    this.name = "GeminiServiceError";
    this.details = details || cause?.message;
  }
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: string = "gemini-2.5-pro-preview-06-05";
  private config: GeminiServiceConfig;
  private retryConfig: RetryConfig;

  constructor(config: GeminiServiceConfig) {
    this.config = config;
    // Initialize Gemini AI with endpoint configuration
    const options = config.apiEndpoint
      ? { apiEndpoint: config.apiEndpoint }
      : undefined;
    this.genAI = new GoogleGenerativeAI(config.apiKey);

    this.retryConfig = {
      maxRetries: config.maxRetries,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    };
  }

  /**
   * Processes base64 image data into the format required by Gemini API
   * @param base64Image Base64 encoded image string
   * @returns Processed image data for Gemini API
   * @throws {GeminiServiceError} if image data is invalid
   */
  private processImageData(base64Image: string) {
    try {
      // Remove data URL prefix if present
      const imageData = base64Image.replace(
        /^data:image\/(png|jpeg|jpg);base64,/,
        ""
      );

      // Validate base64
      if (!/^[A-Za-z0-9+/]+[=]{0,2}$/.test(imageData)) {
        throw new Error("Invalid base64 image data");
      }

      return {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg",
        },
      };
    } catch (error) {
      throw new GeminiServiceError(
        "Failed to process image data",
        error as Error
      );
    }
  }

  /**
   * Implements exponential backoff retry logic
   * @param operation Function to retry
   * @returns Promise resolving to operation result
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let delay = this.retryConfig.initialDelayMs;
    let attempts = 0;

    while (true) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        if (duration > this.config.timeout) {
          throw new GeminiServiceError(
            `Operation timed out after ${duration}ms`
          );
        }

        return result;
      } catch (error) {
        attempts++;

        if (attempts >= this.retryConfig.maxRetries) {
          throw new GeminiServiceError(
            "Max retry attempts reached",
            error as Error
          );
        }

        // Exponential backoff with jitter
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay = Math.min(
          delay * this.retryConfig.backoffMultiplier,
          this.retryConfig.maxDelayMs
        );
      }
    }
  }

  /**
   * Answers a question about an image using Gemini Vision API
   * @param input Object containing question, image data, and optional parameters
   * @returns Promise resolving to VQAToolResponse
   * @throws {GeminiServiceError} if analysis fails
   */
  async analyzeImage({
    question,
    image,
    context,
    maxTokens,
  }: Omit<VQAToolInput, "apiKey">): Promise<VQAToolResponse> {
    const startTime = Date.now();

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.4,
          topP: 0.8,
          topK: 40,
        },
      });

      let prompt = `Answer the following question about the image: ${question}\n`;
      if (context) {
        prompt += `Context: ${context}\n`;
      }
      prompt += "Please be concise and accurate in your response.";

      const imageData = this.processImageData(image);

      const result = await this.withRetry(async () => {
        const genResult = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }, { inlineData: imageData.inlineData }],
            },
          ],
        });

        if (!genResult.response) {
          throw new Error("No response received from Gemini API");
        }

        return await genResult.response;
      });

      const processingTime = Date.now() - startTime;

      return {
        answer: result.text(),
        confidence: 0.9, // Note: Gemini API currently doesn't provide confidence scores
        processingTime,
        modelUsed: this.model,
      };
    } catch (error) {
      throw new GeminiServiceError("Failed to analyze image", error as Error);
    }
  }

  /**
   * Validates whether the service is properly configured and accessible
   * @returns Promise resolving to boolean
   */
  async validateConnection(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      await model.generateContent(["Test connection"]);
      return true;
    } catch (error) {
      throw new GeminiServiceError(
        "Failed to validate Gemini API connection",
        error as Error
      );
    }
  }

  /**
   * Cleanup resources used by the service
   * Called during server shutdown
   */
  async cleanup(): Promise<void> {
    // Currently no cleanup needed for Gemini API client
    // But we keep the method for future extensions and interface consistency
    return Promise.resolve();
  }
}

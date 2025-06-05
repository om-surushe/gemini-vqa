import { GoogleGenerativeAI } from '@google/generative-ai';
import { VQAToolInput, VQAToolResponse } from '../types';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: string = 'gemini-pro-vision';

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Processes base64 image data into the format required by Gemini API
   * @param base64Image Base64 encoded image string
   * @returns Processed image data for Gemini API
   */
  private processImageData(base64Image: string) {
    // Remove data URL prefix if present
    const imageData = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    return {
      inlineData: {
        data: imageData,
        mimeType: 'image/jpeg'
      }
    };
  }

  /**
   * Answers a question about an image using Gemini Vision API
   * @param input Object containing question and image data
   * @returns Promise resolving to VQAToolResponse
   */
  async analyzeImage({ question, image }: Omit<VQAToolInput, 'apiKey'>): Promise<VQAToolResponse> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });

      const prompt = `Answer the following question about the image: ${question}
Please be concise and accurate in your response.`;

      const imageData = this.processImageData(image);
      
      const result = await model.generateContent([prompt, imageData]);
      const response = await result.response;
      const text = response.text();

      return {
        answer: text,
        confidence: 0.9 // Note: Gemini API currently doesn't provide confidence scores
      };
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error('Failed to analyze image with Gemini API');
    }
  }
}
# Gemini Visual Question-Answering MCP Tool Documentation

## Overview
The Gemini Visual QA MCP Tool provides a seamless interface for asking questions about images using Google's Gemini AI model. This tool accepts a base64-encoded image and a question as input, and returns natural language answers about the image content.

## Tool Configuration
The tool uses the following model and configuration:
- Model: `gemini-2.5-pro-preview-06-05`
- API Key: Configured via environment variables
- Input Format: Base64-encoded images + text questions
- Output Format: Natural language answers

## Input Schema
```typescript
interface VisualQAInput {
  question: string;   // The question about the image
  image: string;      // Base64-encoded image data
}
```

## Output Schema
```typescript
interface VisualQAOutput {
  answer: string;     // The model's answer to the question
  confidence?: number; // Optional confidence score
}
```

## Usage Example

1. **Initialize the MCP Server**
```bash
# Set environment variables
export GEMINI_API_KEY=your_api_key
export GEMINI_MODEL=gemini-2.5-pro-preview-06-05

# Start the MCP server
npm start
```

2. **Use the Tool**
```typescript
// Example tool usage
const response = await mcpServer.tools.visualqa.execute({
  question: "What color is the car in this image?",
  image: "base64_encoded_image_data"
});

console.log(response.answer);
```

## Error Handling
The tool provides descriptive error messages for common issues:
- Invalid image format
- Image size limitations
- API authentication errors
- Model processing errors

Error responses include:
- Error code
- Human-readable message
- Detailed description when available

## Implementation Details

Under the hood, the tool:
1. Validates the base64 image data
2. Configures the Gemini API client
3. Prepares the multimodal request
4. Processes the response
5. Formats the output

The implementation uses the official Google GenAI JavaScript SDK:
```typescript
import { GoogleGenAI } from '@google/genai';
```

## Best Practices
1. **Image Preparation**
   - Supported formats: JPEG, PNG
   - Recommended max size: 4MB
   - Clear, well-lit images work best

2. **Question Formulation**
   - Be specific and clear
   - One question at a time
   - Avoid compound questions

3. **Error Handling**
   - Always implement try-catch blocks
   - Handle timeouts gracefully
   - Validate input before sending

## Example Integration

```typescript
try {
  const imageBase64 = await convertImageToBase64('path/to/image.jpg');
  const result = await mcpServer.tools.visualqa.execute({
    question: "What objects are visible in this image?",
    image: imageBase64
  });
  
  console.log(`Answer: ${result.answer}`);
} catch (error) {
  console.error('Error processing image:', error.message);
}
```

## Limitations
- Maximum image size: 4MB
- Supported image formats: JPEG, PNG
- One question per request
- Response time may vary based on image complexity

## Installation
```bash
# Install the package
npm install gemini-vqa-mcp

# Configure environment
echo "GEMINI_API_KEY=your_api_key" > .env
echo "GEMINI_MODEL=gemini-2.5-pro-preview-06-05" >> .env

# Start the MCP server
npx gemini-vqa-mcp
```

## Contributing
Contributions are welcome! Please see our contributing guidelines for more details on how to submit pull requests, report issues, and suggest improvements.

## License
MIT License - feel free to use this tool in your projects, commercial or otherwise.
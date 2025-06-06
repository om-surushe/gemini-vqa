# Gemini Visual QA MCP Server

A simple Model Context Protocol (MCP) server that provides visual question answering capabilities using Google's Gemini AI.

## Features

- Ask questions about images using natural language
- Powered by Google Gemini 2.0 Flash model
- Simple base64 image input
- Easy integration with MCP-compatible clients

## Quick Start

### 1. Installation

```bash
# Clone or create project directory
mkdir gemini-vqa-mcp && cd gemini-vqa-mcp

# Copy the provided files (package.json, tsconfig.json, src/index.ts)

# Install dependencies
npm install
```

### 2. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key for the next step

### 3. Set Environment Variable

```bash
# Linux/Mac
export GEMINI_API_KEY=your_api_key_here

# Windows
set GEMINI_API_KEY=your_api_key_here
```

### 4. Build and Run

```bash
# Build the project
npm run build

# Start the server
npm start

# Or for development
npm run dev
```

## Usage

The server provides one tool:

### `visual_qa`

Ask questions about images.

**Parameters:**
- `question` (string): The question you want to ask about the image
- `image` (string): Base64 encoded image data (without `data:image/...;base64,` prefix)

**Example:**
```json
{
  "question": "What objects are visible in this image?",
  "image": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAY..."
}
```

## Integration with VSCode

To use with VSCode and the MCP extension:

1. Install the MCP extension in VSCode
2. Add this server to your MCP configuration:

```json
{
  "mcpServers": {
    "gemini-vqa": {
      "command": "node",
      "args": ["path/to/gemini-vqa-mcp/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Preparing Images

To convert an image to base64:

### Using Node.js
```javascript
const fs = require('fs');
const imageBuffer = fs.readFileSync('image.jpg');
const base64Image = imageBuffer.toString('base64');
```

### Using Command Line
```bash
# Linux/Mac
base64 -i image.jpg

# Or with Python
python -c "import base64; print(base64.b64encode(open('image.jpg', 'rb').read()).decode())"
```

## Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY environment variable is required"**
   - Make sure you've set the environment variable correctly
   - Restart your terminal after setting the variable

2. **"Invalid base64 format"**
   - Ensure you're only passing the base64 data, not the full data URL
   - Remove any `data:image/...;base64,` prefix

3. **API Errors**
   - Check that your API key is valid
   - Ensure you have credits/quota available in Google AI Studio

## Development

### Project Structure
```
gemini-vqa-mcp/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

### Building
```bash
npm run build
```

### Testing
```bash
# Run the server in development mode
npm run dev

# Test with a simple MCP client or VSCode
```

## API Reference

### Environment Variables
- `GEMINI_API_KEY` (required): Your Google AI API key

### Supported Image Formats
- JPEG
- PNG  
- GIF
- WebP

### Rate Limits
Follows Google AI API rate limits. See [Google AI documentation](https://ai.google.dev/pricing) for current limits.

## License

MIT
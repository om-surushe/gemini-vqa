# Gemini Visual Question Answering MCP Server

An MCP (Model Context Protocol) server that uses Google's Gemini Vision API to answer questions about images. This server provides a simple HTTP interface for visual question answering tasks.

## Features

- Visual Question Answering using Gemini Pro Vision
- MCP-compliant API endpoints
- Support for base64 encoded images
- Configurable through MCP configuration
- TypeScript implementation with full type safety

## Prerequisites

- Node.js (v16 or higher)
- Google Cloud Project with Gemini API enabled
- Gemini API Key
- Visual Studio Code (recommended)

## Setup in Visual Studio Code

1. Clone the repository:
```bash
git clone <repository-url>
```

2. Open the project in VS Code:
```bash
code gemini-vqa-mcp
```

3. Install recommended VS Code extensions:
   - Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
   - Search and install:
     - "TypeScript and JavaScript Language Features"
     - "ESLint"
     - "Prettier - Code formatter"

4. Configure VS Code settings:
   The project includes `.vscode/settings.json` with recommended settings for TypeScript development.

5. Install dependencies:
```bash
npm install
```

6. Build the project:
```bash
npm run build
```

## MCP Configuration

The server is configured using `mcp.config.json`:

```json
{
  "mcpServers": {
    "gemini-vqa": {
      "command": "node",
      "args": ["dist/server.js", "--api-key=${GEMINI_API_KEY}"],
      "requires": ["GEMINI_API_KEY"]
    }
  }
}
```

Set your Gemini API key in the environment where the MCP server will run:

```bash
export GEMINI_API_KEY=your_api_key_here
```

## Running the Server

### Development Mode
```bash
npm run dev -- --api-key=your_api_key_here
```

### Production Mode
```bash
npm run build
npm start -- --api-key=your_api_key_here
```

### MCP Integration
The server can be started through an MCP host using the configuration in `mcp.config.json`. The host will automatically pass the API key from the environment.

## API Endpoints

### GET /mcp
Service discovery endpoint that returns information about available tools.

### POST /mcp/tools/analyze_image
Process a visual question answering request.

Request body:
```json
{
  "question": "What is in the image?",
  "image": "base64_encoded_image_data"
}
```

Response:
```json
{
  "answer": "Description of the image based on the question",
  "confidence": 0.9
}
```

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests

## Git Usage

1. Initialize Git repository (if not already done):
```bash
git init
```

2. Stage your changes:
```bash
git add .
```

3. Commit your changes:
```bash
git commit -m "Initial commit"
```

4. Add remote repository:
```bash
git remote add origin <repository-url>
```

5. Push to remote:
```bash
git push -u origin main
```

The `.gitignore` file is configured to exclude:
- Node modules
- Build artifacts
- Environment files
- IDE settings
- Log files

## Error Handling

The server includes robust error handling for:
- Invalid input validation
- Missing or invalid API key
- Gemini API errors
- Server errors

All errors are returned with appropriate HTTP status codes and detailed error messages.

## License

ISC
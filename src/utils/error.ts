export class MCPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MCPError';
  }
}

export class ConfigurationError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class GeminiAPIError extends MCPError {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

export class ImageProcessingError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

export function isKnownError(error: unknown): error is MCPError {
  return error instanceof MCPError;
}
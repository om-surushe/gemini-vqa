import winston from 'winston';
import logConfig from '../config/logger';

// Create logger instance with configuration
const logger = winston.createLogger(logConfig);

/**
 * Debug level logging
 * @param message - The message to log
 * @param meta - Optional metadata to include
 */
export const debug = (message: string, meta?: object): void => {
  logger.debug(message, meta);
};

/**
 * Info level logging
 * @param message - The message to log
 * @param meta - Optional metadata to include
 */
export const info = (message: string, meta?: object): void => {
  logger.info(message, meta);
};

/**
 * Warning level logging
 * @param message - The message to log
 * @param meta - Optional metadata to include
 */
export const warn = (message: string, meta?: object): void => {
  logger.warn(message, meta);
};

/**
 * Error level logging
 * @param message - The error message
 * @param error - The error object or additional metadata
 */
export const error = (message: string, error?: Error | object): void => {
  logger.error(message, error);
};

export default logger;

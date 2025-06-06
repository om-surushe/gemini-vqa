import winston from 'winston';
import logConfig from '../config/logger';

// Create logger instance
const logger = winston.createLogger(logConfig);

export const debug = (message: string, meta?: object) => {
  logger.debug(message, meta);
};

export const info = (message: string, meta?: object) => {
  logger.info(message, meta);
};

export const warn = (message: string, meta?: object) => {
  logger.warn(message, meta);
};

export const error = (message: string, error?: Error | object) => {
  logger.error(message, error);
};

export default logger;

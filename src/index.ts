import logger from './utils/logger';

logger.info('Application starting...', {
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString(),
});

// Example async function to demonstrate error logging
async function testLogger() {
  try {
    throw new Error('Test error for logging');
  } catch (error) {
    logger.error('An error occurred during testing', error as Error);
  }

  logger.debug('Debug message with metadata', {
    feature: 'logger-test',
    detail: 'Testing debug level logging',
  });
}

testLogger().catch(error => {
  logger.error('Unhandled error in testLogger', error as Error);
});

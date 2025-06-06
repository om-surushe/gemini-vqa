import logger from '../src/utils/logger';

describe('Logger', () => {
  const logSpy = jest.spyOn(logger, 'info');
  const errorSpy = jest.spyOn(logger, 'error');
  const debugSpy = jest.spyOn(logger, 'debug');

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should log info messages', () => {
    const message = 'Test info message';
    const meta = { test: 'info' };
    
    logger.info(message, meta);
    
    expect(logSpy).toHaveBeenCalledWith(message, meta);
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('should log error messages', () => {
    const message = 'Test error message';
    const error = new Error('Test error');
    
    logger.error(message, error);
    
    expect(errorSpy).toHaveBeenCalledWith(message, error);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('should log debug messages', () => {
    const message = 'Test debug message';
    const meta = { test: 'debug' };
    
    logger.debug(message, meta);
    
    expect(debugSpy).toHaveBeenCalledWith(message, meta);
    expect(debugSpy).toHaveBeenCalledTimes(1);
  });
});

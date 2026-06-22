import pino from 'pino';
import { getConfig } from '../../config.js';

let _logger: pino.Logger;

export function getBaseLogger(): pino.Logger {
  if (!_logger) {
    const config = getConfig();
    _logger = pino({
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    });
  }
  return _logger;
}

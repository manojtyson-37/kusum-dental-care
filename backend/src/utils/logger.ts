import winston from 'winston';
import { config } from './config.js';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp(),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, requestId, ...meta }) => {
    const rid = requestId ? ` [${requestId}]` : '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} ${level}${rid}: ${message}${extra}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

// Serverless runtimes (Vercel etc.) have a read-only filesystem outside /tmp,
// so file transports only make sense when actually running on a persistent host.
const fileTransports = process.env.VERCEL
  ? []
  : [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ];

export const logger = winston.createLogger({
  level: config.logLevel,
  format: config.isProduction ? prodFormat : devFormat,
  transports: [new winston.transports.Console(), ...fileTransports],
});

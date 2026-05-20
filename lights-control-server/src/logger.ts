import { createLogger, format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { DATA_DIR } from './dataDir'

const LOG_DIR = join(DATA_DIR, 'logs')
mkdirSync(LOG_DIR, { recursive: true })

const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss' }),
  format.printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
    return `${timestamp} ${level}: ${message}${extra}`
  }),
)

const fileFormat = format.combine(
  format.timestamp(),
  format.json(),
)

const logger = createLogger({
  level: 'info',
  transports: [
    new transports.Console({ format: consoleFormat }),
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'server-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      zippedArchive: true,
      format: fileFormat,
    }),
  ],
})

export default logger

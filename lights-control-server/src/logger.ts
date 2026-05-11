import { createLogger, format, transports } from 'winston'
import { mkdirSync } from 'fs'
import { resolve } from 'path'

const LOG_DIR = resolve(__dirname, '../logs')
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
    new transports.File({
      filename: resolve(LOG_DIR, 'server.log'),
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5 MB per file
      maxFiles: 5,              // keep up to 5 rotated files
      tailable: true,           // newest data always in server.log
    }),
  ],
})

export default logger

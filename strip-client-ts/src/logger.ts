import { createLogger, format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { mkdirSync } from 'fs'
import { resolve } from 'path'
import { homedir } from 'os'

const LOG_DIR = resolve(homedir(), '.local', 'lights-control', 'logs')
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

export type Logger = ReturnType<typeof createLogger>

export function createStripLogger(stripId: string): Logger {
  return createLogger({
    level: 'info',
    transports: [
      new transports.Console({ format: consoleFormat }),
      new DailyRotateFile({
        dirname: LOG_DIR,
        filename: `strip-${stripId}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        zippedArchive: true,
        format: fileFormat,
      }),
    ],
  })
}

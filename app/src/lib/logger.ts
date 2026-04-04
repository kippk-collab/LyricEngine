// ─── Logger ───────────────────────────────────────────────────────────────────
// Structured logger with swappable transports.
// Runs on the server (API routes) — logs to console + daily rotating file.
// Each log line is a JSON object (JSON Lines format), easy to parse or grep.
// Log files: app/logs/YYYY-MM-DD.log

import fs from 'fs'
import path from 'path'

type Level = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  ts: string
  level: Level
  msg: string
  data?: Record<string, unknown>
}

type Transport = (entry: LogEntry) => void

// ─── Transports ───────────────────────────────────────────────────────────────

const consoleTransport: Transport = ({ ts, level, msg, data }) => {
  const prefix = `[${ts}] [${level.toUpperCase()}]`
  const line = data ? `${prefix} ${msg} ${JSON.stringify(data)}` : `${prefix} ${msg}`
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

const LOG_DIR = path.join(process.cwd(), 'logs')

const fileTransport: Transport = (entry) => {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    const date = entry.ts.slice(0, 10) // YYYY-MM-DD
    const file = path.join(LOG_DIR, `${date}.log`)
    fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf8')
  } catch {
    // Don't let logging errors crash the app
  }
}

const TRANSPORTS: Transport[] = [consoleTransport, fileTransport]

// ─── Core ─────────────────────────────────────────────────────────────────────

function emit(level: Level, msg: string, data?: Record<string, unknown>) {
  const entry: LogEntry = { ts: new Date().toISOString(), level, msg, data }
  for (const t of TRANSPORTS) t(entry)
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => emit('debug', msg, data),
  info:  (msg: string, data?: Record<string, unknown>) => emit('info',  msg, data),
  warn:  (msg: string, data?: Record<string, unknown>) => emit('warn',  msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit('error', msg, data),
}

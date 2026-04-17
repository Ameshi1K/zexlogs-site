// lib/db.js — server-side only
import mysql from 'mysql2/promise'

let pool = null

export function getDbConfig() {
  // 1. Try env var (set in Vercel dashboard or .env.local)
  const raw = process.env.DB_CONFIG || ''
  if (raw) {
    try { return JSON.parse(Buffer.from(raw, 'base64').toString()) } catch {}
  }
  // 2. Hardcoded fallback — your server
  return {
    host:     '45.116.104.78',
    port:     3306,
    user:     'u2350_SN29Awh3Os',
    password: '@SrKpsPnT@hLl!ShnmxN6U2G',
    database: 's2350_zexmrp',
  }
}

export async function getDb() {
  if (pool) return pool
  const cfg = getDbConfig()
  pool = await mysql.createPool({
    host:               cfg.host,
    port:               parseInt(cfg.port) || 3306,
    user:               cfg.user,
    password:           cfg.password,
    database:           cfg.database,
    waitForConnections: true,
    connectionLimit:    5,
    connectTimeout:     10000,
    ssl:                { rejectUnauthorized: false },
  })
  return pool
}

export async function query(sql, params = []) {
  const db = await getDb()
  const [rows] = await db.execute(sql, params)
  return rows
}

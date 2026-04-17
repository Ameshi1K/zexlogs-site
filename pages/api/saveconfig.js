// pages/api/saveconfig.js
import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { host, port, user, password, database, fivemIp, fivemKey } = req.body
  if (!host || !user || !database) return res.status(400).json({ ok: false, error: 'host, user and database are required' })
  const dbCfg = Buffer.from(JSON.stringify({ host, port: port || 3306, user, password, database })).toString('base64')
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    let existing = ''
    try { existing = fs.readFileSync(envPath, 'utf8') } catch {}
    const lines = existing.split('\n').filter(l => !l.startsWith('DB_CONFIG=') && !l.startsWith('FIVEM_IP=') && !l.startsWith('FIVEM_KEY='))
    lines.push(`DB_CONFIG=${dbCfg}`)
    if (fivemIp) lines.push(`FIVEM_IP=${fivemIp}`)
    if (fivemKey) lines.push(`FIVEM_KEY=${fivemKey}`)
    fs.writeFileSync(envPath, lines.filter(Boolean).join('\n'))
  } catch {}
  process.env.DB_CONFIG = dbCfg
  if (fivemIp) process.env.FIVEM_IP = fivemIp
  if (fivemKey) process.env.FIVEM_KEY = fivemKey
  return res.status(200).json({ ok: true })
}

// pages/api/fivem.js
// Server-side proxy to the FiveM zex_logs HTTP API — bypasses CORS
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const { ip, key, endpoint, channel, limit } = req.query
  if (!ip || !key || !endpoint) {
    return res.status(400).json({ ok: false, error: 'Missing ip, key or endpoint' })
  }

  const params = new URLSearchParams({ key })
  if (channel) params.set('channel', channel)
  if (limit)   params.set('limit',   limit)

  const url = `${ip}/zex_logs/${endpoint}?${params}`

  try {
    const r    = await fetch(url, { signal: AbortSignal.timeout(7000) })
    const data = await r.json()
    return res.status(200).json(data)
  } catch(e) {
    return res.status(502).json({ ok: false, error: e.message })
  }
}

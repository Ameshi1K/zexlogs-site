// pages/api/db.js
// Runs server-side — no CORS, database credentials never sent to browser
import { query, getDbConfig } from '../../lib/db'

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query.action === 'test') {
    try {
      await query('SELECT 1')
      return res.status(200).json({ ok: true, message: 'Connected!' })
    } catch(e) {
      return res.status(200).json({ ok: false, error: e.message })
    }
  }

  const { action, license, identifier } = req.query
  const id = license || identifier

  try {
    if (action === 'money') {
      if (!id) return res.status(400).json({ ok: false, error: 'license required' })
      let cash = 0, bank = 0, black = 0
      try {
        const rows = await query('SELECT account_name, money FROM user_accounts WHERE identifier = ?', [id])
        for (const r of rows) {
          if (r.account_name === 'money') cash = r.money
          if (r.account_name === 'bank') bank = r.money
          if (r.account_name === 'black_money') black = r.money
        }
      } catch {
        try { const rows = await query('SELECT money, bank FROM users WHERE identifier = ?', [id]); if (rows[0]) { cash = rows[0].money || 0; bank = rows[0].bank || 0 } } catch {}
      }
      return res.status(200).json({ ok: true, cash, bank, black })
    }
    if (action === 'inventory') {
      if (!id) return res.status(400).json({ ok: false, error: 'license required' })
      let items = []
      try { const rows = await query('SELECT item, count, label FROM user_inventory WHERE identifier = ? AND count > 0 ORDER BY item', [id]); items = rows.map(r => ({ name: r.item, label: r.label || r.item, count: r.count })) } catch {}
      return res.status(200).json({ ok: true, items })
    }
    if (action === 'vehicles') {
      if (!id) return res.status(400).json({ ok: false, error: 'license required' })
      let vehicles = []
      try { const rows = await query('SELECT model, plate, fuel, engine, body FROM owned_vehicles WHERE owner = ? LIMIT 20', [id]); vehicles = rows } catch {}
      return res.status(200).json({ ok: true, vehicles })
    }
    return res.status(400).json({ ok: false, error: 'Unknown action: ' + action })
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}

import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

const fmt$ = n => '$' + (Number(n) || 0).toLocaleString()
const ago  = ts => {
  if (!ts) return '?'
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60)    return d + 's ago'
  if (d < 3600)  return Math.floor(d/60) + 'm ago'
  if (d < 86400) return Math.floor(d/3600) + 'h ago'
  return Math.floor(d/86400) + 'd ago'
}
const pingColor = p => p < 80 ? '#22c55e' : p < 150 ? '#f59e0b' : '#ef4444'
const itemIcon = name => {
  if (!name) return '📦'
  const n = name.toLowerCase()
  if (n.startsWith('weapon_')) return '🔫'
  return '📦'
}
const isWeapon = n => (n||'').toLowerCase().startsWith('weapon_')
const isDrug   = n => ['cocaine','weed','heroin','meth','crack','xtc','mdma'].some(d => (n||'').toLowerCase().includes(d))

async function fivem(endpoint, extra = {}) {
  const cfg = JSON.parse(localStorage.getItem('zx_cfg') || '{}')
  if (!cfg.ip || !cfg.key) return { ok: false, error: 'Not configured' }
  const q = new URLSearchParams({ ip: cfg.ip, key: cfg.key, endpoint, ...extra })
  const r = await fetch(`/api/fivem?${q}`)
  return r.json()
}

async function db(action, extra = {}) {
  const q = new URLSearchParams({ action, ...extra })
  const r = await fetch(`/api/db?${q}`)
  return r.json()
}

const S = {
  root:   { display:'flex', height:'100vh', overflow:'hidden', position:'relative', zIndex:1 },
  sidebar:{ width:260, flexShrink:0, background:'#101115', borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', overflow:'hidden' },
  main:   { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  topbar: { height:52, display:'flex', alignItems:'center', padding:'0 20px', background:'#101115', borderBottom:'1px solid rgba(255,255,255,.06)', gap:12, flexShrink:0 },
  logo:   { fontSize:16, fontWeight:800, letterSpacing:'-.02em', display:'flex', alignItems:'center', gap:8 },
  dot:    { width:7, height:7, borderRadius:'50%', background:'#5b73ff', boxShadow:'0 0 10px #5b73ff' },
  sbHead: { padding:'14px 16px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  sbTitle:{ fontSize:10, fontFamily:'var(--mono)', color:'#4b4f62', letterSpacing:'.09em', textTransform:'uppercase' },
  sbCount:{ fontSize:10, fontFamily:'var(--mono)', background:'rgba(91,115,255,.12)', color:'#5b73ff', borderRadius:4, padding:'1px 6px' },
  sbList: { flex:1, overflowY:'auto', padding:'4px 8px 8px' },
  plItem: { display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:8, cursor:'pointer', transition:'background .12s', marginBottom:2 },
  plName: { fontSize:13, fontWeight:600, flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  plID:   { fontSize:10, fontFamily:'var(--mono)', color:'#4b4f62' },
  content:{ flex:1, overflowY:'auto', padding:20 },
  card:   { background:'#101115', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, overflow:'hidden', marginBottom:16 },
  cardHd: { padding:'13px 16px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:8, background:'#16181f' },
  cardT:  { fontSize:13, fontWeight:700 },
  cardB:  { padding:16 },
  tabs:   { display:'flex', borderBottom:'1px solid rgba(255,255,255,.06)', background:'#16181f', padding:'0 4px' },
  tab:    { padding:'10px 14px', fontSize:12, cursor:'pointer', color:'#4b4f62', borderBottom:'2px solid transparent', transition:'all .15s', whiteSpace:'nowrap' },
  tabOn:  { color:'#5b73ff', borderBottomColor:'#5b73ff' },
  moneyGrid:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 },
  moneyCard:{ background:'#16181f', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:'13px 16px' },
  moneyLbl: { fontSize:10, fontFamily:'var(--mono)', color:'#4b4f62', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 },
  moneyVal: { fontSize:22, fontWeight:700 },
  itemGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:7 },
  itemCard: { background:'#16181f', border:'1px solid rgba(255,255,255,.06)', borderRadius:9, padding:11, position:'relative' },
  itemIco:  { fontSize:22, marginBottom:5, display:'block' },
  itemName: { fontSize:11, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  itemSub:  { fontSize:10, color:'#4b4f62', marginTop:1 },
  itemCnt:  { position:'absolute', top:7, right:7, fontSize:10, fontFamily:'var(--mono)', fontWeight:700, background:'#5b73ff', color:'#fff', padding:'1px 5px', borderRadius:4 },
  vehCard:  { background:'#16181f', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:'12px 14px', marginBottom:7, display:'flex', alignItems:'center', gap:12 },
  logEntry: { display:'flex', gap:10, padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,.06)' },
  logBar:   { width:3, borderRadius:2, flexShrink:0, alignSelf:'stretch', minHeight:28 },
  logBody:  { flex:1, minWidth:0 },
  logCh:    { fontSize:10, fontFamily:'var(--mono)', color:'#4b4f62', marginBottom:2 },
  logTitle: { fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  logDesc:  { fontSize:11, color:'#8b8fa8', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  logTime:  { fontSize:10, fontFamily:'var(--mono)', color:'#4b4f62', flexShrink:0, marginTop:2 },
  infoRow:  { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,.06)', fontSize:13 },
  infoKey:  { fontSize:11, fontFamily:'var(--mono)', color:'#4b4f62' },
  infoVal:  { fontSize:12, fontFamily:'var(--mono)', fontWeight:600, textAlign:'right', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis' },
  empty:    { textAlign:'center', padding:'36px 20px', color:'#4b4f62', fontSize:12, fontFamily:'var(--mono)' },
  btn:      { background:'rgba(91,115,255,.12)', border:'1px solid rgba(91,115,255,.3)', borderRadius:8, color:'#5b73ff', fontFamily:'var(--mono)', fontSize:12, padding:'7px 16px', transition:'all .15s' },
  btnSm:    { background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:6, color:'#8b8fa8', fontFamily:'var(--mono)', fontSize:11, padding:'5px 11px', transition:'all .15s' },
  fGroup:   { marginBottom:14 },
  fLabel:   { fontSize:11, fontFamily:'var(--mono)', color:'#4b4f62', marginBottom:5, display:'block', textTransform:'uppercase', letterSpacing:'.07em' },
  fGrid2:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  badge:    { fontSize:10, fontFamily:'var(--mono)', padding:'2px 7px', borderRadius:4, display:'inline-block' },
  navItem:  { display:'flex', alignItems:'center', gap:8, padding:'8px 14px', fontSize:13, color:'#4b4f62', cursor:'pointer', borderLeft:'2px solid transparent', transition:'all .15s' },
  navOn:    { color:'#5b73ff', background:'rgba(91,115,255,.08)', borderLeftColor:'#5b73ff' },
}

const Spin = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
    <div style={{ width:22, height:22, border:'2px solid rgba(255,255,255,.1)', borderTopColor:'#5b73ff', borderRadius:'50%', animation:'spin .6s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

function MoneyPanel({ license }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!license) return
    setLoading(true)
    db('money', { license }).then(d => { setData(d); setLoading(false) })
  }, [license])
  if (loading) return <Spin />
  if (!data?.ok) return <div style={S.empty}>{data?.error || 'No data'}</div>
  return (
    <div style={S.moneyGrid}>
      {[
        { label:'💵 Cash', val: data.cash, color:'#22c55e' },
        { label:'🏦 Bank', val: data.bank, color:'#5b73ff' },
        { label:'🖤 Black', val: data.black, color:'#a855f7' },
      ].map(m => (
        <div key={m.label} style={S.moneyCard}>
          <div style={S.moneyLbl}>{m.label}</div>
          <div style={{ ...S.moneyVal, color: m.color }}>{fmt$(m.val)}</div>
        </div>
      ))}
    </div>
  )
}

function InventoryPanel({ license, liveItems }) {
  const [dbItems, setDbItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [src, setSrc] = useState('live')
  useEffect(() => {
    if (src !== 'db' || !license) return
    setLoading(true)
    db('inventory', { license }).then(d => { setDbItems(d); setLoading(false) })
  }, [src, license])
  const items = src === 'live' ? liveItems : (dbItems?.items || [])
  if (loading) return <Spin />
  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        <button style={{ ...S.btnSm, ...(src==='live' ? { color:'#5b73ff', borderColor:'rgba(91,115,255,.4)' } : {}) }} onClick={() => setSrc('live')}>Live</button>
        <button style={{ ...S.btnSm, ...(src==='db' ? { color:'#5b73ff', borderColor:'rgba(91,115,255,.4)' } : {}) }} onClick={() => setSrc('db')}>Database</button>
      </div>
      {!items || items.length === 0
        ? <div style={S.empty}>Empty inventory</div>
        : <div style={S.itemGrid}>
            {items.map((item, i) => (
              <div key={i} style={{ ...S.itemCard, borderColor: isWeapon(item.name) ? 'rgba(239,68,68,.25)' : isDrug(item.name) ? 'rgba(168,85,247,.25)' : undefined }}>
                <span style={S.itemCnt}>{item.count}</span>
                <span style={S.itemIco}>{itemIcon(item.name)}</span>
                <div style={S.itemName}>{item.label || item.name}</div>
                <div style={S.itemSub}>{item.name}</div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

function VehiclesPanel({ license }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!license) return
    db('vehicles', { license }).then(d => { setData(d); setLoading(false) })
  }, [license])
  if (loading) return <Spin />
  if (!data?.ok || !data.vehicles?.length) return <div style={S.empty}>No vehicles</div>
  return (
    <div>
      {data.vehicles.map((v, i) => (
        <div key={i} style={S.vehCard}>
          <div style={{ fontSize:28 }}>🚗</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>{(v.model||'?').toUpperCase()}</div>
            <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'#4b4f62' }}>Plate: {v.plate}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LogsPanel({ playerName, logs }) {
  const filtered = (logs||[]).filter(l => !playerName || (l.title+l.desc).toLowerCase().includes(playerName.toLowerCase()))
  if (!filtered.length) return <div style={S.empty}>No logs for this player</div>
  return (
    <div>
      {filtered.map((l, i) => (
        <div key={i} style={S.logEntry}>
          <div style={{ ...S.logBar, background: l.color||'#5b73ff' }} />
          <div style={S.logBody}>
            <div style={S.logCh}>#{l.channel}</div>
            <div style={S.logTitle}>{l.title}</div>
            <div style={S.logDesc}>{l.desc}</div>
          </div>
          <div style={S.logTime}>{ago(l.ts)}</div>
        </div>
      ))}
    </div>
  )
}

function PlayerDetail({ player, logs }) {
  const [tab, setTab] = useState('inventory')
  const tabs = [
    { id:'inventory', label:'🎒 Inventory' },
    { id:'money', label:'💰 Money' },
    { id:'vehicles', label:'🚗 Vehicles' },
    { id:'logs', label:'📋 Logs' },
    { id:'info', label:'🪪 Info' },
  ]
  return (
    <div>
      <div style={S.card}>
        <div style={{ ...S.cardHd, background:'#1d2029' }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'rgba(91,115,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>👤</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>{player.name}</div>
            <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'#4b4f62' }}>ID: {player.id} · {player.ping}ms</div>
          </div>
        </div>
        <div style={S.tabs}>
          {tabs.map(t => (
            <div key={t.id} style={{ ...S.tab, ...(tab===t.id ? S.tabOn : {}) }} onClick={() => setTab(t.id)}>{t.label}</div>
          ))}
        </div>
        <div style={S.cardB}>
          {tab === 'inventory' && <InventoryPanel license={player.license} liveItems={player.items||[]} />}
          {tab === 'money'     && <MoneyPanel license={player.license} />}
          {tab === 'vehicles'  && <VehiclesPanel license={player.license} />}
          {tab === 'logs'      && <LogsPanel playerName={player.name} logs={logs} />}
          {tab === 'info'      && (
            <div>
              {[['Name',player.name],['ID',player.id],['Ping',player.ping+'ms'],['License',player.license],['Discord',player.discord],['Job',player.job||'?']].map(([k,v]) => (
                <div key={k} style={S.infoRow}>
                  <span style={S.infoKey}>{k}</span>
                  <span style={S.infoVal}>{String(v||'?')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AllLogs({ logs, loading }) {
  const [filter, setFilter] = useState('all')
  const filters = [
    { id:'all', label:'All' },
    { id:'combat', label:'⚔️ Combat' },
    { id:'economy', label:'💰 Economy' },
    { id:'inventory', label:'🎒 Items' },
    { id:'admin', label:'🛡️ Admin' },
    { id:'anticheat', label:'🚨 Anticheat' },
  ]
  const shown = filter === 'all' ? logs : logs.filter(l => {
    const ch = l.channel
    if (filter==='combat') return ['deaths','kills','pvp','shooting'].includes(ch)
    if (filter==='economy') return ['money','money_add','money_remove','bank'].includes(ch)
    if (filter==='inventory') return ['item_give','item_remove','item_use','stash','trunk'].includes(ch)
    if (filter==='admin') return ['bans','kicks','warns','admin_actions'].includes(ch)
    if (filter==='anticheat') return ch === 'anticheat'
    return true
  })
  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {filters.map(f => (
          <button key={f.id} style={{ ...S.btnSm, ...(filter===f.id ? { color:'#5b73ff', borderColor:'rgba(91,115,255,.4)' } : {}) }} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      <div style={S.card}>
        <div style={{ padding:'0 16px' }}>
          {loading ? <Spin /> : shown.length === 0 ? <div style={S.empty}>No logs yet</div> : shown.map((l,i) => (
            <div key={i} style={S.logEntry}>
              <div style={{ ...S.logBar, background: l.color||'#5b73ff' }} />
              <div style={S.logBody}>
                <div style={S.logCh}>#{l.channel}</div>
                <div style={S.logTitle}>{l.title}</div>
                <div style={S.logDesc}>{l.desc}</div>
              </div>
              <div style={S.logTime}>{ago(l.ts)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Settings({ onSave }) {
  const [form, setForm] = useState({ host:'45.116.104.78', port:'3306', user:'u2350_SN29Awh3Os', password:'@SrKpsPnT@hLl!ShnmxN6U2G', database:'s2350_zexmrp', fivemIp:'', fivemKey:'' })
  const [status, setStatus] = useState('')
  const [testing, setTesting] = useState(false)
  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem('zx_cfg')||'{}'); setForm(f => ({ ...f, fivemIp: c.ip||'', fivemKey: c.key||'' })) } catch {}
  }, [])
  async function testDb() {
    setTesting(true)
    const r = await fetch('/api/db?action=test')
    const d = await r.json()
    setStatus(d.ok ? '✅ Connected!' : '❌ ' + d.error)
    setTesting(false)
  }
  async function save() {
    const r = await fetch('/api/saveconfig', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    const d = await r.json()
    if (d.ok) { localStorage.setItem('zx_cfg', JSON.stringify({ ip: form.fivemIp, key: form.fivemKey })); setStatus('✅ Saved!'); if (onSave) onSave() }
    else setStatus('❌ ' + d.error)
  }
  const F = ({ label, name, type='text', placeholder='' }) => (
    <div style={S.fGroup}>
      <label style={S.fLabel}>{label}</label>
      <input type={type} value={form[name]||''} placeholder={placeholder} onChange={e => setForm(f => ({...f,[name]:e.target.value}))} />
    </div>
  )
  return (
    <div style={{ maxWidth:640 }}>
      <div style={S.card}>
        <div style={S.cardHd}><span style={S.cardT}>🗄️ Database</span></div>
        <div style={S.cardB}>
          <div style={S.fGrid2}><F label="Host" name="host" /><F label="Port" name="port" /></div>
          <div style={S.fGrid2}><F label="Username" name="user" /><F label="Password" name="password" type="password" /></div>
          <F label="Database" name="database" />
          <button style={S.btn} onClick={testDb} disabled={testing}>{testing ? 'Testing...' : '🔌 Test Connection'}</button>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardHd}><span style={S.cardT}>🎮 FiveM Server</span></div>
        <div style={S.cardB}>
          <F label="Server address" name="fivemIp" placeholder="http://151.242.16.66:30120" />
          <F label="ZexLogs key" name="fivemKey" placeholder="ZEX-XXXX-XXXX-XXXX-XXXX" />
        </div>
      </div>
      {status && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, fontSize:13, fontFamily:'var(--mono)', background: status.startsWith('✅') ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', border: `1px solid ${status.startsWith('✅') ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`, color: status.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{status}</div>}
      <button style={{ ...S.btn, fontSize:14, padding:'11px 24px', display:'block', width:'100%' }} onClick={save}>💾 Save Configuration</button>
    </div>
  )
}

function Overview({ players, logs, loading }) {
  const metrics = [
    { label:'Online Players', val: players.length, color:'#22c55e' },
    { label:'Logs Buffered', val: logs.length, color:'#5b73ff' },
    { label:'Avg Ping', val: players.length ? Math.round(players.reduce((s,p)=>s+p.ping,0)/players.length)+'ms' : '—', color:'#f59e0b' },
    { label:'Total Items', val: players.reduce((s,p)=>s+(p.items||[]).length,0), color:'#a855f7' },
  ]
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background:'#101115', border:'1px solid rgba(255,255,255,.06)', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'#4b4f62', marginBottom:5, textTransform:'uppercase', letterSpacing:'.07em' }}>{m.label}</div>
            <div style={{ fontSize:26, fontWeight:700, color: m.color }}>{m.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div style={S.card}>
          <div style={S.cardHd}><span style={S.cardT}>🟢 Online Players</span></div>
          <div style={{ padding:'4px 8px 8px' }}>
            {players.length === 0 ? <div style={S.empty}>No players online</div> : players.slice(0,10).map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:7 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e' }} />
                <span style={{ fontSize:13, flex:1 }}>{p.name}</span>
                <span style={{ fontSize:10, fontFamily:'var(--mono)', color: pingColor(p.ping) }}>{p.ping}ms</span>
              </div>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.cardHd}><span style={S.cardT}>📋 Recent Logs</span></div>
          <div style={{ padding:'0 12px 8px' }}>
            {loading ? <Spin /> : logs.slice(0,8).map((l,i) => (
              <div key={i} style={S.logEntry}>
                <div style={{ ...S.logBar, background: l.color||'#5b73ff' }} />
                <div style={S.logBody}>
                  <div style={S.logTitle}>{l.title}</div>
                  <div style={S.logDesc}>{l.desc}</div>
                </div>
                <div style={S.logTime}>{ago(l.ts)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [page, setPage]           = useState('overview')
  const [players, setPlayers]     = useState([])
  const [logs, setLogs]           = useState([])
  const [selPlayer, setSelPlayer] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    const cfg = JSON.parse(localStorage.getItem('zx_cfg') || '{}')
    if (cfg.ip && cfg.key) setConfigured(true)
    else setPage('settings')
  }, [])

  const poll = useCallback(async () => {
    if (!configured) return
    try {
      const [pd, ld] = await Promise.all([fivem('players'), fivem('recentlogs', { limit: 100 })])
      if (pd.ok) setPlayers(pd.players || [])
      if (ld.ok) setLogs(ld.logs || [])
    } catch {}
  }, [configured])

  useEffect(() => {
    if (!configured) return
    setLoading(true)
    poll().then(() => setLoading(false))
    const t = setInterval(poll, 8000)
    return () => clearInterval(t)
  }, [configured, poll])

  const filteredPlayers = players.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search))
  const navItems = [
    { id:'overview', label:'⚡ Overview' },
    { id:'players', label:'👥 Players', badge: players.length },
    { id:'logs', label:'📋 Live Logs' },
    { id:'settings', label:'⚙️ Settings' },
  ]

  return (
    <>
      <Head>
        <title>ZexLogs — Dashboard</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(91,115,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(91,115,255,.025) 1px,transparent 1px)', backgroundSize:'52px 52px', pointerEvents:'none', zIndex:0 }} />
      <div style={S.root}>
        <div style={S.sidebar}>
          <div style={S.topbar}>
            <div style={S.logo}><div style={S.dot} />ZexLogs</div>
          </div>
          <div style={{ padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
            {navItems.map(n => (
              <div key={n.id} style={{ ...S.navItem, ...(page===n.id && !selPlayer ? S.navOn : {}) }} onClick={() => { setPage(n.id); if (n.id !== 'players') setSelPlayer(null) }}>
                <span>{n.label}</span>
                {n.badge !== undefined && <span style={{ marginLeft:'auto', fontSize:10, fontFamily:'var(--mono)', background:'rgba(34,197,94,.12)', color:'#22c55e', borderRadius:4, padding:'1px 5px' }}>{n.badge}</span>}
              </div>
            ))}
          </div>
          <div style={S.sbHead}>
            <span style={S.sbTitle}>Online</span>
            <span style={S.sbCount}>{players.length}</span>
          </div>
          <div style={{ padding:'0 8px 8px' }}>
            <input style={{ fontSize:12, padding:'6px 10px', marginBottom:6 }} placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={S.sbList}>
            {filteredPlayers.length === 0
              ? <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'#4b4f62', textAlign:'center', padding:16 }}>{configured ? 'No players online' : 'Not connected'}</div>
              : filteredPlayers.map(p => (
                <div key={p.id} style={{ ...S.plItem, background: selPlayer?.id===p.id ? 'rgba(91,115,255,.1)' : undefined, border: selPlayer?.id===p.id ? '1px solid rgba(91,115,255,.3)' : '1px solid transparent' }} onClick={() => { setSelPlayer(p); setPage('players') }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={S.plName}>{p.name}</div>
                    <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'#4b4f62' }}>{p.job||'?'}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:10, fontFamily:'var(--mono)', color: pingColor(p.ping) }}>{p.ping}ms</div>
                    <div style={S.plID}>ID:{p.id}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        <div style={S.main}>
          <div style={S.topbar}>
            <div style={{ fontSize:13, fontWeight:700, flex:1 }}>
              {selPlayer ? `👤 ${selPlayer.name}` : page==='overview' ? '⚡ Overview' : page==='players' ? '👥 Players' : page==='logs' ? '📋 Live Logs' : '⚙️ Settings'}
            </div>
            {configured && <div style={{ fontSize:11, fontFamily:'var(--mono)', display:'flex', alignItems:'center', gap:6, color:'#22c55e', background:'rgba(34,197,94,.07)', border:'1px solid rgba(34,197,94,.15)', borderRadius:6, padding:'4px 10px' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e' }} />{players.length} online
            </div>}
          </div>
          <div style={S.content}>
            {page === 'overview' && <Overview players={players} logs={logs} loading={loading} />}
            {page === 'players' && selPlayer && <PlayerDetail player={selPlayer} logs={logs} />}
            {page === 'players' && !selPlayer && (
              <div>
                <div style={{ fontSize:13, color:'#4b4f62', marginBottom:14 }}>Select a player from the sidebar.</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8 }}>
                  {players.map(p => (
                    <div key={p.id} style={{ ...S.card, cursor:'pointer', marginBottom:0 }} onClick={() => setSelPlayer(p)}>
                      <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600 }}>{p.name}</div>
                          <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'#4b4f62', marginTop:1 }}>{p.job||'?'} · ID:{p.id} · {p.ping}ms</div>
                        </div>
                        <span style={{ color:'#4b4f62', fontSize:14 }}>→</span>
                      </div>
                    </div>
                  ))}
                  {players.length === 0 && <div style={{ color:'#4b4f62', fontSize:13 }}>No players online.</div>}
                </div>
              </div>
            )}
            {page === 'logs'     && <AllLogs logs={logs} loading={loading} />}
            {page === 'settings' && <Settings onSave={() => { setConfigured(true); setPage('overview') }} />}
          </div>
        </div>
      </div>
    </>
  )
}

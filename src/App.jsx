import { useState, useEffect, useCallback } from 'react'
import { storage, uploadFile, deleteFile } from './supabase'

// ── Storage keys ──────────────────────────────────────────────────────────────
const K_INCOME   = 'income'
const K_EXPENSES = 'expenses'
const K_SETTINGS = 'settings'
const K_SALDOS   = 'saldos'

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_HOUSES = ['Casa 1', 'Casa 2']
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899']

const EXPENSE_CATS = [
  'Eletricidade','TV + NET','Água','Limpeza','Gás',
  'Manutenção (Obras, etc.)','Impostos','Comissões','Outros'
]

const INCOME_CATS = ['SmartHomes','Particular','Outros']

function currentYear() { return new Date().getFullYear() }
function currentMonth() { return new Date().getMonth() }

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function parseAmount(val) {
  return parseFloat(String(val).replace(',', '.')) || 0
}

function fmt(n) {
  return parseAmount(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState('dashboard')
  const [house, setHouse]       = useState(0)
  const [year, setYear]         = useState(currentYear())
  const [income, setIncome]     = useState([])
  const [expenses, setExpenses] = useState([])
  const [settings, setSettings] = useState({ password: '', houses: DEFAULT_HOUSES })
  const [saldos, setSaldos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [auth, setAuth]         = useState(false)
  const [pwInput, setPwInput]   = useState('')
  const [pwError, setPwError]   = useState(false)

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [inc, exp, set_, sal] = await Promise.all([
        storage.get(K_INCOME),
        storage.get(K_EXPENSES),
        storage.get(K_SETTINGS),
        storage.get(K_SALDOS)
      ])
      setIncome(inc   ? JSON.parse(inc.value)   : [])
      setExpenses(exp ? JSON.parse(exp.value)   : [])
      setSaldos(sal   ? JSON.parse(sal.value)   : [])
      const s = set_ ? JSON.parse(set_.value) : { password: '', houses: DEFAULT_HOUSES }
      if (!s.houses) s.houses = DEFAULT_HOUSES
      setSettings(s)
      if (!s.password) setAuth(true)
      setLoading(false)
    }
    load()
  }, [])

  // ── Keep Supabase alive (ping every 3 days) ────────────────────────────────
  useEffect(() => {
    const PING_KEY = 'supabase_last_ping'
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000
    async function ping() {
      try {
        const last = localStorage.getItem(PING_KEY)
        if (last && Date.now() - Number(last) < THREE_DAYS) return
        await storage.set('_ping', String(Date.now()))
        localStorage.setItem(PING_KEY, String(Date.now()))
      } catch (_) {}
    }
    ping()
  }, [])

  const houses = settings.houses || DEFAULT_HOUSES

  // ── Persist helpers ────────────────────────────────────────────────────────
  const saveIncome   = useCallback(async d => { await storage.set(K_INCOME,   JSON.stringify(d)) }, [])
  const saveExpenses = useCallback(async d => { await storage.set(K_EXPENSES, JSON.stringify(d)) }, [])
  const saveSettings = useCallback(async d => { await storage.set(K_SETTINGS, JSON.stringify(d)) }, [])
  const saveSaldos   = useCallback(async d => { await storage.set(K_SALDOS,   JSON.stringify(d)) }, [])

  const addSaldoUser = async name => {
    const next = [...saldos, { id: genId(), name, entries: [] }]
    setSaldos(next); await saveSaldos(next)
  }
  const delSaldoUser = async id => {
    const next = saldos.filter(u => u.id !== id)
    setSaldos(next); await saveSaldos(next)
  }
  const renameSaldoUser = async (id, name) => {
    const next = saldos.map(u => u.id === id ? { ...u, name } : u)
    setSaldos(next); await saveSaldos(next)
  }
  const addSaldoEntry = async (userId, entry) => {
    const next = saldos.map(u => u.id === userId ? { ...u, entries: [...u.entries, { ...entry, id: genId() }] } : u)
    setSaldos(next); await saveSaldos(next)
  }
  const delSaldoEntry = async (userId, entryId) => {
    const next = saldos.map(u => u.id === userId ? { ...u, entries: u.entries.filter(e => e.id !== entryId) } : u)
    setSaldos(next); await saveSaldos(next)
  }
  const editSaldoEntry = async (userId, entryId, fields) => {
    const next = saldos.map(u => u.id === userId ? { ...u, entries: u.entries.map(e => e.id === entryId ? { ...e, ...fields } : e) } : u)
    setSaldos(next); await saveSaldos(next)
  }

  const addIncome = async entry => {
    const next = [...income, { ...entry, id: genId() }]
    setIncome(next); await saveIncome(next)
  }
  const delIncome = async id => {
    const next = income.filter(i => i.id !== id)
    setIncome(next); await saveIncome(next)
  }
  const editIncome = async (id, fields) => {
    const next = income.map(i => i.id === id ? { ...i, ...fields } : i)
    setIncome(next); await saveIncome(next)
  }
  const addExpense = async entry => {
    const next = [...expenses, { ...entry, id: genId() }]
    setExpenses(next); await saveExpenses(next)
  }
  const delExpense = async id => {
    const next = expenses.filter(e => e.id !== id)
    setExpenses(next); await saveExpenses(next)
  }
  const editExpense = async (id, fields) => {
    const next = expenses.map(e => e.id === id ? { ...e, ...fields } : e)
    setExpenses(next); await saveExpenses(next)
  }

  const handleLogin = () => {
    if (pwInput === settings.password) { setAuth(true); setPwError(false) }
    else setPwError(true)
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">A carregar…</div>

  if (!auth) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-8 w-80">
        <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">Gestão Casas SMP</h1>
        <input
          type="password"
          placeholder="Password"
          value={pwInput}
          onChange={e => setPwInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {pwError && <p className="text-red-500 text-sm mb-3">Password incorreta</p>}
        <button onClick={handleLogin} className="w-full bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700">
          Entrar
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
          <h1 className="font-bold text-gray-800 text-sm shrink-0">🏡 SMP</h1>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {houses.map((h, i) => (
              <button key={i}
                onClick={() => setHouse(i)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${house === i ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {h}
              </button>
            ))}
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto flex overflow-x-auto scrollbar-hide">
          {[
            { key: 'dashboard', label: '📊', full: 'Dashboard' },
            { key: 'income',    label: '💰', full: 'Rendimentos' },
            { key: 'expenses',  label: '💸', full: 'Despesas' },
            { key: 'saldos',    label: '🤝', full: 'Saldos' },
            { key: 'settings',  label: '⚙️', full: 'Definições' },
          ].map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 min-w-0 px-2 py-2.5 text-xs font-medium border-b-2 transition whitespace-nowrap ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
              <span className="block">{t.label}</span>
              <span className="block truncate">{t.full}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 py-4">
        {tab === 'dashboard' && <Dashboard  house={house} year={year} setYear={setYear} income={income} expenses={expenses} houses={houses} saldos={saldos} />}
        {tab === 'income'    && <Income     house={house} year={year} setYear={setYear} income={income} addIncome={addIncome} delIncome={delIncome} editIncome={editIncome} houses={houses} />}
        {tab === 'expenses'  && <Expenses   house={house} year={year} setYear={setYear} expenses={expenses} addExpense={addExpense} delExpense={delExpense} editExpense={editExpense} houses={houses} />}
        {tab === 'saldos'    && <Saldos     saldos={saldos} addSaldoUser={addSaldoUser} delSaldoUser={delSaldoUser} renameSaldoUser={renameSaldoUser} addSaldoEntry={addSaldoEntry} delSaldoEntry={delSaldoEntry} editSaldoEntry={editSaldoEntry} />}
        {tab === 'settings'  && <Settings   settings={settings} setSettings={setSettings} saveSettings={saveSettings} />}
      </main>
    </div>
  )
}

// ── Year selector ─────────────────────────────────────────────────────────────
function YearSelector({ year, setYear }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setYear(y => y - 1)} className="p-1 rounded hover:bg-gray-100">‹</button>
      <span className="font-semibold text-gray-700 w-12 text-center">{year}</span>
      <button onClick={() => setYear(y => y + 1)} className="p-1 rounded hover:bg-gray-100">›</button>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ house, year, setYear, income, expenses, houses, saldos }) {
  const [openCat, setOpenCat]       = useState(null)
  const [openIncCat, setOpenIncCat] = useState(null)

  const hIncome   = income.filter(i   => i.house === house && Number(i.year) === year)
  const hExpenses = expenses.filter(e => e.house === house && Number(e.year) === year)

  const totalIncome   = hIncome.reduce((s, i) => s + parseAmount(i.amount), 0)
  const totalExpenses = hExpenses.reduce((s, e) => s + parseAmount(e.amount), 0)
  const profit        = totalIncome - totalExpenses

  const expByCat = EXPENSE_CATS.map(cat => ({
    name: cat,
    value: hExpenses.filter(e => e.category === cat).reduce((s, e) => s + parseAmount(e.amount), 0),
    items: hExpenses.filter(e => e.category === cat).sort((a, b) => a.month - b.month)
  })).filter(d => d.value > 0)

  const incByCat = INCOME_CATS.map(cat => ({
    name: cat,
    value: hIncome.filter(i => i.category === cat).reduce((s, i) => s + parseAmount(i.amount), 0),
    items: hIncome.filter(i => i.category === cat).sort((a, b) => a.month - b.month)
  })).filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Dashboard — {houses[house]}</h2>
        <YearSelector year={year} setYear={setYear} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Rendimento" value={fmt(totalIncome)} color="text-green-600" />
        <KpiCard label="Despesas"   value={fmt(totalExpenses)} color="text-red-500" />
        <KpiCard label="Lucro"      value={fmt(profit)} color={profit >= 0 ? 'text-indigo-600' : 'text-red-600'} />
      </div>

      {/* Resumo de reservas */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-700">Reservas {year}</h3>
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-gray-500 text-sm">Número de reservas</span>
          <span className="font-bold text-gray-800">{hIncome.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">Total de rendimentos</span>
          <span className="font-bold text-green-600">{fmt(totalIncome)}</span>
        </div>
      </div>

      {/* Rendimentos por categoria */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-2">
        <h3 className="font-semibold text-gray-700 mb-1">Rendimentos por Categoria {year}</h3>
        {incByCat.length === 0
          ? <p className="text-gray-400 text-sm text-center py-4">Sem rendimentos registados</p>
          : <>
              {incByCat.map((cat, i) => (
                <div key={cat.name} className="border-b last:border-0">
                  <button
                    onClick={() => setOpenIncCat(openIncCat === cat.name ? null : cat.name)}
                    className="w-full flex items-center justify-between py-2.5 text-left hover:bg-gray-50 rounded-lg px-1 transition">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-gray-700">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-600">{fmt(cat.value)}</span>
                      <span className="text-gray-400 text-xs">{openIncCat === cat.name ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {openIncCat === cat.name && (
                    <div className="mb-2 ml-4 space-y-1">
                      {cat.items.map(i => (
                        <div key={i.id} className="flex justify-between items-center py-1.5 px-2 bg-gray-50 rounded-lg text-sm">
                          <div>
                            <span className="text-gray-500">{MONTHS[i.month]}</span>
                            {i.notes && <span className="text-gray-400 ml-2 text-xs">— {i.notes}</span>}
                          </div>
                          <span className="font-medium text-green-600">{fmt(i.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 font-semibold">
                <span className="text-gray-600">Total</span>
                <span className="text-green-700">{fmt(totalIncome)}</span>
              </div>
            </>
        }
      </div>

      {/* Despesas por categoria */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-2">
        <h3 className="font-semibold text-gray-700 mb-1">Despesas por Categoria {year}</h3>
        {expByCat.length === 0
          ? <p className="text-gray-400 text-sm text-center py-4">Sem despesas registadas</p>
          : <>
              {expByCat.map((cat, i) => (
                <div key={cat.name} className="border-b last:border-0">
                  <button
                    onClick={() => setOpenCat(openCat === cat.name ? null : cat.name)}
                    className="w-full flex items-center justify-between py-2.5 text-left hover:bg-gray-50 rounded-lg px-1 transition">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-gray-700">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-amber-600">{fmt(cat.value)}</span>
                      <span className="text-gray-400 text-xs">{openCat === cat.name ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {openCat === cat.name && (
                    <div className="mb-2 ml-4 space-y-1">
                      {cat.items.map(e => (
                        <div key={e.id} className="flex justify-between items-center py-1.5 px-2 bg-gray-50 rounded-lg text-sm">
                          <div>
                            <span className="text-gray-500">{MONTHS[e.month]}</span>
                            {e.notes && <span className="text-gray-400 ml-2 text-xs">— {e.notes}</span>}
                          </div>
                          <span className="font-medium text-amber-600">{fmt(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 font-semibold">
                <span className="text-gray-600">Total</span>
                <span className="text-amber-700">{fmt(totalExpenses)}</span>
              </div>
            </>
        }
      </div>

      {/* Saldos resumo */}
      {saldos.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-2">
          <h3 className="font-semibold text-gray-700 mb-1">Saldos</h3>
          {saldos.map(u => {
            const total = u.entries.reduce((s, e) => s + parseAmount(e.amount), 0)
            return (
              <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-700">{u.name}</span>
                <span className={`font-semibold text-sm ${total >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(total)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

// ── Income form ───────────────────────────────────────────────────────────────
function IncomeForm({ data, setData, onSave, onCancel, saveLabel, saveClass, uploading }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-gray-500">Mês</label>
        <select value={data.month} onChange={e => setData(f => ({...f, month: Number(e.target.value)}))}
          className="w-full border rounded-lg px-3 py-2 text-base mt-0.5">
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Categoria</label>
        <select value={data.category} onChange={e => setData(f => ({...f, category: e.target.value}))}
          className="w-full border rounded-lg px-3 py-2 text-base mt-0.5">
          {INCOME_CATS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Valor (€)</label>
        <input type="text" inputMode="decimal" placeholder="0" value={data.amount} onChange={e => setData(f => ({...f, amount: e.target.value}))}
          className="w-full border rounded-lg px-3 py-2 text-base mt-0.5" />
      </div>
      <div>
        <label className="text-xs text-gray-500">Notas</label>
        <input type="text" placeholder="Opcional" value={data.notes} onChange={e => setData(f => ({...f, notes: e.target.value}))}
          className="w-full border rounded-lg px-3 py-2 text-base mt-0.5" />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-gray-500">Anexo</label>
        <input type="file" onChange={e => setData(f => ({...f, file: e.target.files[0] || null}))}
          className="w-full border rounded-lg px-3 py-2 text-base mt-0.5 bg-white" />
        {data.attachmentName && !data.file && (
          <p className="text-xs text-indigo-600 mt-1">📎 {data.attachmentName} (já anexado)</p>
        )}
      </div>
      <div className="col-span-2 flex gap-2">
        <button onClick={onSave} disabled={uploading} className={`${saveClass} text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-60`}>
          {uploading ? 'A carregar…' : saveLabel}
        </button>
        <button onClick={onCancel} className="text-gray-500 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100">Cancelar</button>
      </div>
    </div>
  )
}

// ── Income ────────────────────────────────────────────────────────────────────
function Income({ house, year, setYear, income, addIncome, delIncome, editIncome, houses }) {
  const [form, setForm]         = useState({ month: currentMonth(), category: INCOME_CATS[0], amount: '', notes: '', file: null })
  const [adding, setAdding]     = useState(false)
  const [editId, setEditId]     = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const hIncome = income.filter(i => i.house === house && Number(i.year) === year)
  const total   = hIncome.reduce((s, i) => s + parseAmount(i.amount), 0)

  const handleAdd = async () => {
    if (!form.amount) return
    setUploading(true); setUploadError(null)
    try {
      let attachmentUrl = null, attachmentName = null
      if (form.file) {
        const path = `income/${genId()}_${form.file.name}`
        attachmentUrl = await uploadFile(form.file, path)
        attachmentName = form.file.name
      }
      await addIncome({ ...form, house, year, attachmentUrl, attachmentName, file: undefined })
      setForm({ month: currentMonth(), category: INCOME_CATS[0], amount: '', notes: '', file: null })
      setAdding(false)
    } catch (e) { setUploadError(e.message) }
    setUploading(false)
  }

  const startEdit = i => {
    setEditId(i.id)
    setUploadError(null)
    setEditForm({ month: i.month, category: i.category, amount: String(i.amount), notes: i.notes || '', attachmentUrl: i.attachmentUrl || null, attachmentName: i.attachmentName || null, file: null })
  }

  const handleEdit = async () => {
    if (!editForm.amount) return
    setUploading(true); setUploadError(null)
    try {
      let attachmentUrl = editForm.attachmentUrl
      let attachmentName = editForm.attachmentName
      if (editForm.file) {
        const path = `income/${genId()}_${editForm.file.name}`
        attachmentUrl = await uploadFile(editForm.file, path)
        attachmentName = editForm.file.name
      }
      await editIncome(editId, { ...editForm, attachmentUrl, attachmentName, file: undefined })
      setEditId(null); setEditForm(null)
    } catch (e) { setUploadError(e.message) }
    setUploading(false)
  }

  const cancelEdit = () => { setEditId(null); setEditForm(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Rendimentos — {houses[house]}</h2>
        <div className="flex items-center gap-3">
          <YearSelector year={year} setYear={setYear} />
          <button onClick={() => setAdding(true)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700">
            + Rendimento
          </button>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
        <span className="text-gray-600">Total {year}</span>
        <span className="text-2xl font-bold text-indigo-600">{fmt(total)}</span>
      </div>

      {adding && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-700">Novo Rendimento</h3>
          <IncomeForm data={form} setData={setForm} onSave={handleAdd} onCancel={() => { setAdding(false); setUploadError(null) }} saveLabel="Guardar" saveClass="bg-indigo-600 hover:bg-indigo-700" uploading={uploading} />
          {uploadError && <p className="text-red-500 text-xs">{uploadError}</p>}
        </div>
      )}

      {hIncome.length === 0
        ? <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">Sem rendimentos em {year}</div>
        : <>
            {/* Cartões — mobile */}
            <div className="space-y-3 md:hidden">
              {hIncome.sort((a,b) => a.month - b.month).map(i => (
                <div key={i.id} className="bg-white rounded-xl p-4 shadow-sm">
                  {editId === i.id
                    ? <div className="space-y-3">
                        <p className="font-semibold text-gray-700 text-sm">Editar rendimento</p>
                        <IncomeForm data={editForm} setData={setEditForm} onSave={handleEdit} onCancel={cancelEdit} saveLabel="Guardar" saveClass="bg-indigo-600 hover:bg-indigo-700" uploading={uploading} />
                        {uploadError && <p className="text-red-500 text-xs">{uploadError}</p>}
                      </div>
                    : <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">{MONTHS[i.month]}</p>
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{i.category}</span>
                          {i.notes && <p className="text-xs text-gray-400">{i.notes}</p>}
                          {i.attachmentUrl && <a href={i.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">📎 {i.attachmentName || 'Anexo'}</a>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-green-600">{fmt(i.amount)}</span>
                          <button onClick={() => startEdit(i)} className="text-indigo-400 hover:text-indigo-600 text-lg leading-none">✎</button>
                          <button onClick={() => delIncome(i.id)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                        </div>
                      </div>
                  }
                </div>
              ))}
              <div className="bg-indigo-50 rounded-xl p-4 flex justify-between font-semibold">
                <span className="text-gray-600">Total</span>
                <span className="text-green-600">{fmt(total)}</span>
              </div>
            </div>

            {/* Tabela — desktop */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Mês</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-left">Notas</th>
                    <th className="px-4 py-3 text-left">Anexo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {hIncome.sort((a,b) => a.month - b.month).map(i => (
                    editId === i.id
                      ? <tr key={i.id} className="bg-indigo-50">
                          <td colSpan={6} className="px-4 py-3">
                            <IncomeForm data={editForm} setData={setEditForm} onSave={handleEdit} onCancel={cancelEdit} saveLabel="Guardar" saveClass="bg-indigo-600 hover:bg-indigo-700" uploading={uploading} />
                          </td>
                        </tr>
                      : <tr key={i.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{MONTHS[i.month]}</td>
                          <td className="px-4 py-3"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{i.category}</span></td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">{fmt(i.amount)}</td>
                          <td className="px-4 py-3 text-gray-400">{i.notes}</td>
                          <td className="px-4 py-3">{i.attachmentUrl && <a href={i.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline text-xs">📎 {i.attachmentName || 'Anexo'}</a>}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => startEdit(i)} className="text-indigo-400 hover:text-indigo-600 text-xs">✎</button>
                              <button onClick={() => delIncome(i.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            </div>
                          </td>
                        </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-semibold text-gray-600">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(total)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
      }
    </div>
  )
}

// ── Expense form (shared between add and edit) ────────────────────────────────
function ExpenseForm({ data, setData, onSave, onCancel, saveLabel, saveClass, uploading }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-gray-500">Mês</label>
        <select value={data.month} onChange={e => setData(f => ({...f, month: Number(e.target.value)}))}
          className="w-full border rounded-lg px-3 py-2 text-base mt-0.5">
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Categoria</label>
        <select value={data.category} onChange={e => setData(f => ({...f, category: e.target.value}))}
          className="w-full border rounded-lg px-3 py-2 text-base mt-0.5">
          {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Valor (€)</label>
        <input type="text" inputMode="decimal" placeholder="0" value={data.amount} onChange={e => setData(f => ({...f, amount: e.target.value}))}
          className="w-full border rounded-lg px-3 py-2 text-base mt-0.5" />
      </div>
      <div>
        <label className="text-xs text-gray-500">Notas</label>
        <input type="text" placeholder="Opcional" value={data.notes} onChange={e => setData(f => ({...f, notes: e.target.value}))}
          className="w-full border rounded-lg px-3 py-2 text-base mt-0.5" />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-gray-500">Anexo</label>
        <input type="file" onChange={e => setData(f => ({...f, file: e.target.files[0] || null}))}
          className="w-full border rounded-lg px-3 py-2 text-base mt-0.5 bg-white" />
        {data.attachmentName && !data.file && (
          <p className="text-xs text-indigo-600 mt-1">📎 {data.attachmentName} (já anexado)</p>
        )}
      </div>
      <div className="col-span-2 flex gap-2">
        <button onClick={onSave} disabled={uploading} className={`${saveClass} text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-60`}>
          {uploading ? 'A carregar…' : saveLabel}
        </button>
        <button onClick={onCancel} className="text-gray-500 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100">Cancelar</button>
      </div>
    </div>
  )
}

// ── Expenses ──────────────────────────────────────────────────────────────────
function Expenses({ house, year, setYear, expenses, addExpense, delExpense, editExpense, houses }) {
  const [form, setForm]         = useState({ month: currentMonth(), category: EXPENSE_CATS[0], amount: '', notes: '', file: null })
  const [adding, setAdding]     = useState(false)
  const [editId, setEditId]     = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const hExpenses = expenses.filter(e => e.house === house && Number(e.year) === year)
  const total     = hExpenses.reduce((s, e) => s + parseAmount(e.amount), 0)

  const handleAdd = async () => {
    if (!form.amount) return
    setUploading(true); setUploadError(null)
    try {
      let attachmentUrl = null, attachmentName = null
      if (form.file) {
        const path = `expenses/${genId()}_${form.file.name}`
        attachmentUrl = await uploadFile(form.file, path)
        attachmentName = form.file.name
      }
      await addExpense({ ...form, house, year, attachmentUrl, attachmentName, file: undefined })
      setForm({ month: currentMonth(), category: EXPENSE_CATS[0], amount: '', notes: '', file: null })
      setAdding(false)
    } catch (e) { setUploadError(e.message) }
    setUploading(false)
  }

  const startEdit = e => {
    setEditId(e.id)
    setUploadError(null)
    setEditForm({ month: e.month, category: e.category, amount: String(e.amount), notes: e.notes || '', attachmentUrl: e.attachmentUrl || null, attachmentName: e.attachmentName || null, file: null })
  }

  const handleEdit = async () => {
    if (!editForm.amount) return
    setUploading(true); setUploadError(null)
    try {
      let attachmentUrl = editForm.attachmentUrl
      let attachmentName = editForm.attachmentName
      if (editForm.file) {
        const path = `expenses/${genId()}_${editForm.file.name}`
        attachmentUrl = await uploadFile(editForm.file, path)
        attachmentName = editForm.file.name
      }
      await editExpense(editId, { ...editForm, attachmentUrl, attachmentName, file: undefined })
      setEditId(null)
      setEditForm(null)
    } catch (e) { setUploadError(e.message) }
    setUploading(false)
  }

  const cancelEdit = () => { setEditId(null); setEditForm(null); setUploadError(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Despesas — {houses[house]}</h2>
        <div className="flex items-center gap-3">
          <YearSelector year={year} setYear={setYear} />
          <button onClick={() => setAdding(true)} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600">
            + Despesa
          </button>
        </div>
      </div>

      <div className="bg-amber-50 rounded-xl p-4 flex items-center justify-between">
        <span className="text-gray-600">Total {year}</span>
        <span className="text-2xl font-bold text-amber-600">{fmt(total)}</span>
      </div>

      {adding && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-700">Nova Despesa</h3>
          <ExpenseForm data={form} setData={setForm} onSave={handleAdd} onCancel={() => { setAdding(false); setUploadError(null) }} saveLabel="Guardar" saveClass="bg-amber-500 hover:bg-amber-600" uploading={uploading} />
          {uploadError && <p className="text-red-500 text-xs">{uploadError}</p>}
        </div>
      )}

      {hExpenses.length === 0
        ? <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">Sem despesas em {year}</div>
        : <>
            {/* Cartões — mobile */}
            <div className="space-y-3 md:hidden">
              {hExpenses.sort((a,b) => a.month - b.month).map(e => (
                <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm">
                  {editId === e.id
                    ? <div className="space-y-3">
                        <p className="font-semibold text-gray-700 text-sm">Editar despesa</p>
                        <ExpenseForm data={editForm} setData={setEditForm} onSave={handleEdit} onCancel={cancelEdit} saveLabel="Guardar" saveClass="bg-amber-500 hover:bg-amber-600" uploading={uploading} />
                        {uploadError && <p className="text-red-500 text-xs">{uploadError}</p>}
                      </div>
                    : <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">{MONTHS[e.month]}</p>
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{e.category}</span>
                          {e.notes && <p className="text-xs text-gray-400">{e.notes}</p>}
                          {e.attachmentUrl && <a href={e.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">📎 {e.attachmentName || 'Anexo'}</a>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-600">{fmt(e.amount)}</span>
                          <button onClick={() => startEdit(e)} className="text-indigo-400 hover:text-indigo-600 text-lg leading-none">✎</button>
                          <button onClick={() => delExpense(e.id)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                        </div>
                      </div>
                  }
                </div>
              ))}
              <div className="bg-amber-50 rounded-xl p-4 flex justify-between font-semibold">
                <span className="text-gray-600">Total</span>
                <span className="text-amber-600">{fmt(total)}</span>
              </div>
            </div>

            {/* Tabela — desktop */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Mês</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-left">Notas</th>
                    <th className="px-4 py-3 text-left">Anexo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {hExpenses.sort((a,b) => a.month - b.month).map(e => (
                    editId === e.id
                      ? <tr key={e.id} className="bg-amber-50">
                          <td colSpan={6} className="px-4 py-3">
                            <ExpenseForm data={editForm} setData={setEditForm} onSave={handleEdit} onCancel={cancelEdit} saveLabel="Guardar" saveClass="bg-amber-500 hover:bg-amber-600" uploading={uploading} />
                          </td>
                        </tr>
                      : <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{MONTHS[e.month]}</td>
                          <td className="px-4 py-3"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{e.category}</span></td>
                          <td className="px-4 py-3 text-right font-medium text-amber-600">{fmt(e.amount)}</td>
                          <td className="px-4 py-3 text-gray-400">{e.notes}</td>
                          <td className="px-4 py-3">{e.attachmentUrl && <a href={e.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline text-xs">📎 {e.attachmentName || 'Anexo'}</a>}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => startEdit(e)} className="text-indigo-400 hover:text-indigo-600 text-xs">✎</button>
                              <button onClick={() => delExpense(e.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            </div>
                          </td>
                        </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-semibold text-gray-600">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">{fmt(total)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
      }
    </div>
  )
}

// ── Equalize algorithm (minimum transactions) ─────────────────────────────────
function settleDebts(saldos) {
  if (saldos.length < 2) return {}
  const totals = saldos.map(u => ({
    name: u.name,
    total: Math.round(u.entries.reduce((s, e) => s + parseAmount(e.amount), 0) * 100) / 100
  }))
  const sum = totals.reduce((s, u) => s + u.total, 0)
  const avg = Math.round(sum / totals.length * 100) / 100
  const isPositive = sum >= 0

  const diffs = totals.map(u => ({ name: u.name, diff: Math.round((u.total - avg) * 100) / 100 }))

  const txs = []
  if (isPositive) {
    // House pays each person who received less than the top earner
    const maxTotal = Math.max(...totals.map(u => u.total))
    totals.filter(u => maxTotal - u.total > 0.005).forEach(u => {
      txs.push({ to: u.name, amount: Math.round((maxTotal - u.total) * 100) / 100 })
    })
  } else {
    // User-to-user: those who spent less pay those who spent more
    // more negative diff = spent more = receiver; more positive diff = spent less = payer
    const receivers = diffs.filter(u => u.diff < -0.005).map(u => ({...u, diff: -u.diff})).sort((a,b) => b.diff - a.diff)
    const payers    = diffs.filter(u => u.diff > 0.005).map(u => ({...u})).sort((a,b) => b.diff - a.diff)
    let ri = 0, pi = 0
    while (ri < receivers.length && pi < payers.length) {
      const r = receivers[ri], p = payers[pi]
      const amount = Math.min(r.diff, p.diff)
      txs.push({ from: p.name, to: r.name, amount: Math.round(amount * 100) / 100 })
      r.diff -= amount; p.diff -= amount
      if (r.diff < 0.005) ri++
      if (p.diff < 0.005) pi++
    }
  }
  const target = isPositive ? Math.max(...totals.map(u => u.total)) : avg
  return { txs, avg: target, isPositive }
}

// ── Saldos ────────────────────────────────────────────────────────────────────
function Saldos({ saldos, addSaldoUser, delSaldoUser, renameSaldoUser, addSaldoEntry, delSaldoEntry, editSaldoEntry }) {
  const [newName, setNewName]   = useState('')
  const [openUser, setOpenUser] = useState(null)
  const [editingName, setEditingName] = useState(null)
  const [tempName, setTempName] = useState('')

  const { txs = [], avg = 0, isPositive = false } = saldos.length >= 2 ? settleDebts(saldos) : {}
  const allZero = saldos.length >= 2 && txs.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Saldos</h2>
      </div>

      {/* Adicionar utilizador */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex gap-2">
        <input
          type="text"
          placeholder="Nome do utilizador"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { addSaldoUser(newName.trim()); setNewName('') } }}
          className="flex-1 border rounded-lg px-3 py-2 text-base"
        />
        <button
          onClick={() => { if (newName.trim()) { addSaldoUser(newName.trim()); setNewName('') } }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">
          + Utilizador
        </button>
      </div>

      {/* Liquidação */}
      {saldos.length >= 2 && (
        <div className={`rounded-xl p-4 shadow-sm space-y-2 ${allZero ? 'bg-green-50' : 'bg-amber-50'}`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-700 text-sm">
              {allZero ? '✅ Contas equilibradas' : `⚖️ Para acertar contas`}
            </h3>
            <span className="text-xs text-gray-500">Média: <span className="font-semibold text-gray-700">{fmt(avg)}</span></span>
          </div>
          {allZero
            ? <p className="text-green-700 text-sm">
                {isPositive ? `Cada um recebeu exatamente ${fmt(avg)}.` : `Cada um gastou exatamente ${fmt(avg)}.`} Não há nada a acertar.
              </p>
            : <>
                <p className="text-xs text-gray-500 pb-1">{txs.length} acerto{txs.length !== 1 ? 's' : ''} necessário{txs.length !== 1 ? 's' : ''}:</p>
                {txs.map((tx, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-3 py-3">
                    {isPositive
                      ? <div className="flex-1 min-w-0">
                          <span className="font-semibold text-indigo-600">A casa</span>
                          <span className="text-gray-400 text-xs mx-1.5">→ paga →</span>
                          <span className="font-semibold text-green-700">{tx.to}</span>
                        </div>
                      : <div className="flex-1 min-w-0">
                          <span className="font-semibold text-red-600">{tx.from}</span>
                          <span className="text-gray-400 text-xs mx-1.5">→ transfere para →</span>
                          <span className="font-semibold text-green-700">{tx.to}</span>
                        </div>
                    }
                    <span className="font-bold text-gray-800 shrink-0">{fmt(tx.amount)}</span>
                  </div>
                ))}
              </>
          }
        </div>
      )}

      {saldos.length === 0
        ? <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">Sem utilizadores. Adiciona um acima.</div>
        : saldos.map(u => (
            <SaldoUser key={u.id} user={u}
              isOpen={openUser === u.id}
              onToggle={() => setOpenUser(openUser === u.id ? null : u.id)}
              editingName={editingName === u.id}
              tempName={tempName}
              setTempName={setTempName}
              onStartRename={() => { setEditingName(u.id); setTempName(u.name) }}
              onSaveRename={() => { renameSaldoUser(u.id, tempName); setEditingName(null) }}
              onCancelRename={() => setEditingName(null)}
              onDelUser={() => { if (confirm(`Apagar "${u.name}" e todos os seus lançamentos?`)) delSaldoUser(u.id) }}
              addEntry={entry => addSaldoEntry(u.id, entry)}
              delEntry={entryId => delSaldoEntry(u.id, entryId)}
              editEntry={(entryId, fields) => editSaldoEntry(u.id, entryId, fields)}
            />
          ))
      }
    </div>
  )
}

function SaldoUser({ user, isOpen, onToggle, editingName, tempName, setTempName, onStartRename, onSaveRename, onCancelRename, onDelUser, addEntry, delEntry, editEntry }) {
  const total = user.entries.reduce((s, e) => s + parseAmount(e.amount), 0)
  const [adding, setAdding]     = useState(false)
  const [form, setForm]         = useState({ amount: '', notes: '', sign: -1 })
  const [editId, setEditId]     = useState(null)
  const [editForm, setEditForm] = useState(null)

  const handleAdd = () => {
    if (!form.amount) return
    const signed = String(form.sign * Math.abs(parseAmount(form.amount)))
    addEntry({ amount: signed, notes: form.notes, date: new Date().toISOString().slice(0,10) })
    setForm({ amount: '', notes: '', sign: -1 }); setAdding(false)
  }

  const startEdit = e => { setEditId(e.id); setEditForm({ amount: String(Math.abs(parseAmount(e.amount))), notes: e.notes || '', sign: parseAmount(e.amount) >= 0 ? 1 : -1 }) }
  const handleEdit = () => {
    if (!editForm.amount) return
    const signed = String(editForm.sign * Math.abs(parseAmount(editForm.amount)))
    editEntry(editId, { ...editForm, amount: signed })
    setEditId(null); setEditForm(null)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header do utilizador */}
      <div className="flex items-center justify-between px-4 py-4 border-b">
        {editingName
          ? <div className="flex gap-2 flex-1 mr-2">
              <input value={tempName} onChange={e => setTempName(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') onSaveRename(); if (e.key === 'Escape') onCancelRename() }}
                className="flex-1 border rounded-lg px-3 py-2 text-base" />
              <button onClick={onSaveRename} className="text-indigo-600 text-xl font-medium px-2">✓</button>
              <button onClick={onCancelRename} className="text-gray-400 text-xl px-2">✕</button>
            </div>
          : <button onClick={onToggle} className="flex-1 text-left font-semibold text-gray-800">{user.name}</button>
        }
        <div className="flex items-center gap-3">
          <span className={`font-bold ${total >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(total)}</span>
          {!editingName && <>
            <button onClick={onStartRename} className="text-gray-400 hover:text-indigo-500 text-xl p-1">✎</button>
            <button onClick={onDelUser} className="text-gray-400 hover:text-red-500 text-xl p-1">✕</button>
            <button onClick={onToggle} className="text-gray-500 text-sm p-1">{isOpen ? '▲' : '▼'}</button>
          </>}
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-3">
          {/* Lançamentos */}
          {user.entries.length === 0 && !adding
            ? <p className="text-gray-400 text-sm text-center py-4">Sem lançamentos</p>
            : <div className="space-y-2">
                {user.entries.map(e => (
                  <div key={e.id}>
                    {editId === e.id
                      ? <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                          <div className="flex gap-2">
                            <button onClick={() => setEditForm(f => ({...f, sign: -1}))}
                              className={`flex-1 py-3 rounded-xl font-semibold border-2 transition ${editForm.sign === -1 ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-red-300'}`}>
                              − Gastou
                            </button>
                            <button onClick={() => setEditForm(f => ({...f, sign: 1}))}
                              className={`flex-1 py-3 rounded-xl font-semibold border-2 transition ${editForm.sign === 1 ? 'bg-green-500 text-white border-green-500' : 'bg-white text-green-600 border-green-300'}`}>
                              + Recebeu
                            </button>
                          </div>
                          <input type="text" inputMode="decimal" value={editForm.amount}
                            onChange={ev => setEditForm(f => ({...f, amount: ev.target.value}))}
                            placeholder="Valor" className="w-full border rounded-xl px-4 py-3 text-base bg-white" />
                          <input type="text" value={editForm.notes}
                            onChange={ev => setEditForm(f => ({...f, notes: ev.target.value}))}
                            placeholder="Notas (opcional)" className="w-full border rounded-xl px-4 py-3 text-base bg-white" />
                          <div className="flex gap-2">
                            <button onClick={handleEdit} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold">Guardar</button>
                            <button onClick={() => { setEditId(null); setEditForm(null) }} className="flex-1 bg-white text-gray-500 py-3 rounded-xl font-medium border">Cancelar</button>
                          </div>
                        </div>
                      : <div className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-xl">
                          <div>
                            <div className="text-xs text-gray-400 mb-0.5">{e.date}</div>
                            {e.notes && <div className="text-sm text-gray-700">{e.notes}</div>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-bold ${parseAmount(e.amount) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {parseAmount(e.amount) >= 0 ? '+' : ''}{fmt(e.amount)}
                            </span>
                            <button onClick={() => startEdit(e)} className="text-indigo-400 hover:text-indigo-600 text-xl p-1">✎</button>
                            <button onClick={() => delEntry(e.id)} className="text-red-400 hover:text-red-600 text-xl p-1">✕</button>
                          </div>
                        </div>
                    }
                  </div>
                ))}
              </div>
          }

          {/* Formulário novo lançamento */}
          {adding
            ? <div className="space-y-3 bg-indigo-50 rounded-xl p-4">
                <div className="flex gap-2">
                  <button onClick={() => setForm(f => ({...f, sign: -1}))}
                    className={`flex-1 py-3 rounded-xl font-semibold border-2 transition ${form.sign === -1 ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-red-300'}`}>
                    − Gastou
                  </button>
                  <button onClick={() => setForm(f => ({...f, sign: 1}))}
                    className={`flex-1 py-3 rounded-xl font-semibold border-2 transition ${form.sign === 1 ? 'bg-green-500 text-white border-green-500' : 'bg-white text-green-600 border-green-300'}`}>
                    + Recebeu
                  </button>
                </div>
                <input type="text" inputMode="decimal" value={form.amount}
                  onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                  placeholder="Valor (ex: 50)" className="w-full border rounded-xl px-4 py-3 text-base bg-white" />
                <input type="text" value={form.notes}
                  onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Notas (opcional)" className="w-full border rounded-xl px-4 py-3 text-base bg-white" />
                <div className="flex gap-2">
                  <button onClick={handleAdd} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-base">Guardar</button>
                  <button onClick={() => { setAdding(false); setForm({ amount: '', notes: '', sign: -1 }) }} className="flex-1 bg-white text-gray-500 py-3 rounded-xl font-medium text-base border">Cancelar</button>
                </div>
              </div>
            : <button onClick={() => setAdding(true)}
                className="w-full text-indigo-600 font-medium py-3 border-2 border-dashed border-indigo-300 rounded-xl hover:bg-indigo-50 transition">
                + Novo Lançamento
              </button>
          }
        </div>
      )}
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────
function Settings({ settings, setSettings, saveSettings }) {
  const [pw, setPw]         = useState(settings.password || '')
  const [houses, setHouses] = useState(settings.houses || DEFAULT_HOUSES)
  const [saved, setSaved]   = useState(false)
  const [newHouse, setNewHouse] = useState('')

  const handleSave = async () => {
    const next = { ...settings, password: pw, houses }
    setSettings(next)
    await saveSettings(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateHouseName = (i, val) => {
    const next = [...houses]
    next[i] = val
    setHouses(next)
  }

  const addHouse = () => {
    if (!newHouse.trim()) return
    setHouses(h => [...h, newHouse.trim()])
    setNewHouse('')
  }

  const removeHouse = i => {
    if (houses.length <= 1) return
    setHouses(h => h.filter((_, idx) => idx !== i))
  }

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-bold text-gray-800">Definições</h2>

      {/* Casas */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-700">Casas</h3>
        <div className="space-y-2">
          {houses.map((h, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={h}
                onChange={e => updateHouseName(i, e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-base"
              />
              <button
                onClick={() => removeHouse(i)}
                disabled={houses.length <= 1}
                className="text-red-400 hover:text-red-600 disabled:opacity-30 text-sm px-2">
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nome da nova casa"
            value={newHouse}
            onChange={e => setNewHouse(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHouse()}
            className="flex-1 border rounded-lg px-3 py-2 text-base"
          />
          <button onClick={addHouse} className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm">
            + Adicionar
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-700">Password de acesso</h3>
        <p className="text-sm text-gray-500">Se ficar em branco, não é pedida autenticação.</p>
        <input
          type="text"
          placeholder="Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
        {saved ? '✓ Guardado' : 'Guardar alterações'}
      </button>
    </div>
  )
}

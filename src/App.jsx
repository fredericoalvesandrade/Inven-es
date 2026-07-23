import { useState, useEffect, useCallback } from 'react'
import { storage } from './supabase'

// ── Storage keys ──────────────────────────────────────────────────────────────
const K_INCOME   = 'income'
const K_EXPENSES = 'expenses'
const K_SETTINGS = 'settings'

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_HOUSES = ['Casa 1', 'Casa 2']
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899']

const EXPENSE_CATS = [
  'Eletricidade','TV + NET','Água','Limpeza','Gás',
  'Manutenção (Obras, etc.)','Impostos','Comissões','Outros'
]

const INCOME_CATS = ['Airbnb','Booking.com','Direto','Outros']

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
  const [loading, setLoading]   = useState(true)
  const [auth, setAuth]         = useState(false)
  const [pwInput, setPwInput]   = useState('')
  const [pwError, setPwError]   = useState(false)

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [inc, exp, set_] = await Promise.all([
        storage.get(K_INCOME),
        storage.get(K_EXPENSES),
        storage.get(K_SETTINGS)
      ])
      setIncome(inc   ? JSON.parse(inc.value)   : [])
      setExpenses(exp ? JSON.parse(exp.value)   : [])
      const s = set_ ? JSON.parse(set_.value) : { password: '', houses: DEFAULT_HOUSES }
      if (!s.houses) s.houses = DEFAULT_HOUSES
      setSettings(s)
      if (!s.password) setAuth(true)
      setLoading(false)
    }
    load()
  }, [])

  const houses = settings.houses || DEFAULT_HOUSES

  // ── Persist helpers ────────────────────────────────────────────────────────
  const saveIncome   = useCallback(async d => { await storage.set(K_INCOME,   JSON.stringify(d)) }, [])
  const saveExpenses = useCallback(async d => { await storage.set(K_EXPENSES, JSON.stringify(d)) }, [])
  const saveSettings = useCallback(async d => { await storage.set(K_SETTINGS, JSON.stringify(d)) }, [])

  const addIncome = async entry => {
    const next = [...income, { ...entry, id: genId() }]
    setIncome(next); await saveIncome(next)
  }
  const delIncome = async id => {
    const next = income.filter(i => i.id !== id)
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
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-gray-800">🏡 Gestão Casas SMP</h1>
          <div className="flex gap-2 flex-wrap">
            {houses.map((h, i) => (
              <button key={i}
                onClick={() => setHouse(i)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${house === i ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {h}
              </button>
            ))}
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {[
            { key: 'dashboard', label: '📊 Dashboard' },
            { key: 'income',    label: '💰 Rendimentos' },
            { key: 'expenses',  label: '💸 Despesas' },
            { key: 'settings',  label: '⚙️ Definições' },
          ].map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'dashboard' && <Dashboard  house={house} year={year} setYear={setYear} income={income} expenses={expenses} houses={houses} />}
        {tab === 'income'    && <Income     house={house} year={year} setYear={setYear} income={income} addIncome={addIncome} delIncome={delIncome} houses={houses} />}
        {tab === 'expenses'  && <Expenses   house={house} year={year} setYear={setYear} expenses={expenses} addExpense={addExpense} delExpense={delExpense} houses={houses} />}
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
function Dashboard({ house, year, setYear, income, expenses, houses }) {
  const hIncome   = income.filter(i   => i.house === house && Number(i.year) === year)
  const hExpenses = expenses.filter(e => e.house === house && Number(e.year) === year)

  const totalIncome   = hIncome.reduce((s, i) => s + parseAmount(i.amount), 0)
  const totalExpenses = hExpenses.reduce((s, e) => s + parseAmount(e.amount), 0)
  const profit        = totalIncome - totalExpenses

  const expByCat = EXPENSE_CATS.map(cat => ({
    name: cat,
    value: hExpenses.filter(e => e.category === cat).reduce((s, e) => s + parseAmount(e.amount), 0)
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

      {/* Despesas por categoria */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-700">Despesas por Categoria {year}</h3>
        {expByCat.length === 0
          ? <p className="text-gray-400 text-sm text-center py-4">Sem despesas registadas</p>
          : <div className="space-y-2">
              {expByCat.map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-gray-700">{cat.name}</span>
                  </div>
                  <span className="font-medium text-amber-600">{fmt(cat.value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-semibold">
                <span className="text-gray-600">Total</span>
                <span className="text-amber-700">{fmt(totalExpenses)}</span>
              </div>
            </div>
        }
      </div>
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

// ── Income ────────────────────────────────────────────────────────────────────
function Income({ house, year, setYear, income, addIncome, delIncome, houses }) {
  const [form, setForm] = useState({
    category: INCOME_CATS[0], amount: '', notes: '',
    checkIn: '', checkOut: ''
  })
  const [adding, setAdding] = useState(false)

  const hIncome = income.filter(i => i.house === house && Number(i.year) === year)
  const total   = hIncome.reduce((s, i) => s + parseAmount(i.amount), 0)

  const handleAdd = async () => {
    if (!form.amount) return
    await addIncome({ ...form, house, year })
    setForm({ category: INCOME_CATS[0], amount: '', notes: '', checkIn: '', checkOut: '' })
    setAdding(false)
  }

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Check-in</label>
              <input type="date" value={form.checkIn} onChange={e => setForm(f => ({...f, checkIn: e.target.value}))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Check-out</label>
              <input type="date" value={form.checkOut} onChange={e => setForm(f => ({...f, checkOut: e.target.value}))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5">
                {INCOME_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Valor (€)</label>
              <input type="text" inputMode="decimal" placeholder="0" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Notas</label>
              <input type="text" placeholder="Opcional" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700">Guardar</button>
            <button onClick={() => setAdding(false)} className="text-gray-500 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100">Cancelar</button>
          </div>
        </div>
      )}

      {hIncome.length === 0
        ? <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">Sem rendimentos em {year}</div>
        : <>
            {/* Cartões — mobile */}
            <div className="space-y-3 md:hidden">
              {hIncome.sort((a,b) => (a.checkIn || '') > (b.checkIn || '') ? 1 : -1).map(i => (
                <div key={i.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex gap-2 text-sm text-gray-600">
                        <span>{i.checkIn || '—'}</span>
                        <span>→</span>
                        <span>{i.checkOut || '—'}</span>
                      </div>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{i.category}</span>
                      {i.notes && <p className="text-xs text-gray-400">{i.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-600">{fmt(i.amount)}</span>
                      <button onClick={() => delIncome(i.id)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                    </div>
                  </div>
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
                    <th className="px-4 py-3 text-left">Check-in</th>
                    <th className="px-4 py-3 text-left">Check-out</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-left">Notas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {hIncome.sort((a,b) => (a.checkIn || '') > (b.checkIn || '') ? 1 : -1).map(i => (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{i.checkIn || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{i.checkOut || '—'}</td>
                      <td className="px-4 py-3"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{i.category}</span></td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">{fmt(i.amount)}</td>
                      <td className="px-4 py-3 text-gray-400">{i.notes}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => delIncome(i.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-semibold text-gray-600">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(total)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
      }
    </div>
  )
}

// ── Expenses ──────────────────────────────────────────────────────────────────
function Expenses({ house, year, setYear, expenses, addExpense, delExpense, houses }) {
  const [form, setForm] = useState({ month: currentMonth(), category: EXPENSE_CATS[0], amount: '', notes: '' })
  const [adding, setAdding] = useState(false)

  const hExpenses = expenses.filter(e => e.house === house && Number(e.year) === year)
  const total     = hExpenses.reduce((s, e) => s + parseAmount(e.amount), 0)

  const handleAdd = async () => {
    if (!form.amount) return
    await addExpense({ ...form, house, year })
    setForm({ month: currentMonth(), category: EXPENSE_CATS[0], amount: '', notes: '' })
    setAdding(false)
  }

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Mês</label>
              <select value={form.month} onChange={e => setForm(f => ({...f, month: Number(e.target.value)}))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5">
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5">
                {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Valor (€)</label>
              <input type="text" inputMode="decimal" placeholder="0" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Notas</label>
              <input type="text" placeholder="Opcional" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-amber-600">Guardar</button>
            <button onClick={() => setAdding(false)} className="text-gray-500 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100">Cancelar</button>
          </div>
        </div>
      )}

      {hExpenses.length === 0
        ? <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">Sem despesas em {year}</div>
        : <>
            {/* Cartões — mobile */}
            <div className="space-y-3 md:hidden">
              {hExpenses.sort((a,b) => a.month - b.month).map(e => (
                <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">{MONTHS[e.month]}</p>
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{e.category}</span>
                      {e.notes && <p className="text-xs text-gray-400">{e.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-amber-600">{fmt(e.amount)}</span>
                      <button onClick={() => delExpense(e.id)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                    </div>
                  </div>
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
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {hExpenses.sort((a,b) => a.month - b.month).map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{MONTHS[e.month]}</td>
                      <td className="px-4 py-3"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{e.category}</span></td>
                      <td className="px-4 py-3 text-right font-medium text-amber-600">{fmt(e.amount)}</td>
                      <td className="px-4 py-3 text-gray-400">{e.notes}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => delExpense(e.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-semibold text-gray-600">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">{fmt(total)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
      }
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
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
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
            className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
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

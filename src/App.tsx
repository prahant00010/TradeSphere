import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import './App.css'
import { getDashboardStats, fetchProducts, login, saveProduct } from './api/mockApi.ts'
import type { AuthResponse, Product, Role, User } from './types'

const THEME_KEY = 'cms-theme'
const SESSION_KEY = 'cms-session'

type Theme = 'light' | 'dark'
type DashboardStats = { totalProducts: number; active: number; lowStock: number; role: Role }

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null
    return stored || 'light'
  })

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  return [theme, setTheme]
}

function useSession() {
  const [session, setSession] = useState<AuthResponse | null>(() => {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? (JSON.parse(stored) as AuthResponse) : null
  })

  const saveSession = (value: AuthResponse | null) => {
    setSession(value)
    if (value) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(value))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }

  return { session, saveSession }
}

function ProtectedRoute({
  user,
  allowRoles,
  children,
}: {
  user: User | null
  allowRoles?: Role[]
  children: ReactNode
}) {
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (allowRoles && !allowRoles.includes(user.role)) {
    return <Navigate to="/products" replace />
  }
  return <>{children}</>
}

function Shell({
  user,
  theme,
  onThemeToggle,
  onLogout,
  children,
}: {
  user: User
  theme: Theme
  onThemeToggle: () => void
  onLogout: () => void
  children: ReactNode
}) {
  const menu = useMemo(
    () => [
      { label: 'Dashboard', to: '/dashboard', roles: ['manager'] as Role[] },
      { label: 'Products', to: '/products', roles: ['manager', 'keeper'] as Role[] },
    ],
    [],
  )

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand">Commodities CMS</div>
        <div className="nav">
          <span className="muted">{user.name} | {user.role}</span>
          <button className="btn secondary" onClick={onThemeToggle}>
            {theme === 'light' ? 'Dark' : 'Light'} mode
          </button>
          <button className="btn" onClick={onLogout}>Logout</button>
        </div>
      </header>
      <div className="container">
        <aside className="sidebar">
          <div className="section-title">Navigation</div>
          <div className="stacked">
            {menu
              .filter((item) => item.roles.includes(user.role))
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'menu-item active' : 'menu-item')}
                >
                  <span>{item.label}</span>
                </NavLink>
              ))}
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
    </div>
  )
}

function LoginPage({ onLogin, isAuthenticated }: { onLogin: (res: AuthResponse) => void; isAuthenticated: boolean }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('manager@acme.com')
  const [password, setPassword] = useState('password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await login({ email, password })
      onLogin(res)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main">
      <div className="card" style={{ maxWidth: 420, margin: '48px auto' }}>
        <h2>Login</h2>
        <p className="muted">Use demo accounts: manager@acme.com or keeper@acme.com (password: password)</p>
        {error && <div className="alert">{error}</div>}
        <form className="stacked" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

function DashboardPage({ role }: { role: Role }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    getDashboardStats(role).then((data: DashboardStats) => {
      setStats(data)
      setLoading(false)
    })
  }, [role])

  if (loading) return <div>Loading dashboard...</div>

  return (
    <div className="stacked">
      <div className="top-row">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">Manager-only overview</p>
        </div>
      </div>
      <div className="card-grid">
        <div className="card metric">
          <span className="muted">Total products</span>
          <span className="metric-value">{stats?.totalProducts}</span>
        </div>
        <div className="card metric">
          <span className="muted">Active</span>
          <span className="metric-value">{stats?.active}</span>
        </div>
        <div className="card metric">
          <span className="muted">Low stock (&lt;50)</span>
          <span className="metric-value">{stats?.lowStock}</span>
        </div>
      </div>
    </div>
  )
}

function ProductsPage({ role }: { role: Role }) {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Omit<Product, 'id'> & { id?: string }>({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    status: 'active',
  })
  const [saving, setSaving] = useState(false)
  const canEdit = role === 'manager' || role === 'keeper'

  useEffect(() => {
    fetchProducts().then((data: Product[]) => {
      setItems(data)
      setLoading(false)
    })
  }, [])

  const startEdit = (p: Product) => {
    setForm({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      status: p.status,
    })
  }

  const resetForm = () =>
    setForm({ name: '', category: '', price: 0, stock: 0, status: 'active' })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const saved = await saveProduct(form)
    setItems((prev) => {
      const exists = prev.find((p) => p.id === saved.id)
      if (exists) return prev.map((p) => (p.id === saved.id ? saved : p))
      return [saved, ...prev]
    })
    resetForm()
    setSaving(false)
  }

  return (
    <div className="stacked">
      <div className="top-row">
        <div>
          <h2>Products</h2>
          <p className="muted">Managers and Store Keepers can view products</p>
        </div>
      </div>

      {canEdit && (
        <div className="card">
          <div className="top-row">
            <h3>{form.id ? 'Edit product' : 'Add product'}</h3>
            {form.id && (
              <button className="btn secondary" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
          <form className="form-row" onSubmit={handleSubmit}>
            <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <label>
                Name
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                Category
                <input
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                />
              </label>
              <label>
                Price
                <input
                  className="input"
                  type="number"
                  value={form.price}
                  min={0}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  required
                />
              </label>
              <label>
                Stock
                <input
                  className="input"
                  type="number"
                  value={form.stock}
                  min={0}
                  onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                  required
                />
              </label>
              <label>
                Status
                <select
                  className="select"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Product['status'] }))}
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : form.id ? 'Save changes' : 'Add product'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="top-row">
          <h3>Inventory</h3>
          <div className="badge">{items.length} items</div>
        </div>
        {loading ? (
          <div>Loading products...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Status</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.stock}</td>
                  <td>${p.price.toFixed(2)}</td>
                  <td>
                    <span className="status-chip">{p.status}</span>
                  </td>
                  {canEdit && (
                    <td>
                      <button className="btn secondary" onClick={() => startEdit(p)}>Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function AppInner() {
  const { session, saveSession } = useSession()
  const [theme, setTheme] = useTheme()

  const handleLogout = () => saveSession(null)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onLogin={saveSession} isAuthenticated={Boolean(session)} />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={session?.user ?? null} allowRoles={['manager']}>
              {session?.user && (
                <Shell user={session.user} theme={theme} onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} onLogout={handleLogout}>
                  <DashboardPage role={session.user.role} />
                </Shell>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute user={session?.user ?? null} allowRoles={['manager', 'keeper']}>
              {session?.user && (
                <Shell user={session.user} theme={theme} onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} onLogout={handleLogout}>
                  <ProductsPage role={session.user.role} />
                </Shell>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            session ? (
              <Navigate to={session.user.role === 'manager' ? '/dashboard' : '/products'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppInner />
}

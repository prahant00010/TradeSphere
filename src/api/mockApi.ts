import type { AuthResponse, LoginPayload, Product, Role, User } from '../types'

const demoUsers: Record<string, { password: string; user: User }> = {
  'manager@acme.com': {
    password: 'password',
    user: {
      id: 'u1',
      name: 'Alex Manager',
      email: 'manager@acme.com',
      role: 'manager',
    },
  },
  'keeper@acme.com': {
    password: 'password',
    user: {
      id: 'u2',
      name: 'Sam Keeper',
      email: 'keeper@acme.com',
      role: 'keeper',
    },
  },
}

let products: Product[] = [
  { id: 'p1', name: 'Arabica Beans', category: 'Coffee', stock: 120, price: 12.5, status: 'active' },
  { id: 'p2', name: 'Basmati Rice', category: 'Grains', stock: 80, price: 18, status: 'active' },
  { id: 'p3', name: 'Olive Oil', category: 'Oils', stock: 45, price: 22, status: 'active' },
]

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const record = demoUsers[payload.email.toLowerCase()]
  if (!record || record.password !== payload.password) {
    throw new Error('Invalid credentials')
  }
  return delay({ token: `fake-token-${record.user.role}`, user: record.user })
}

export async function fetchProducts(): Promise<Product[]> {
  return delay([...products])
}

export async function saveProduct(data: Omit<Product, 'id'> & { id?: string }): Promise<Product> {
  if (data.id) {
    products = products.map((p) => (p.id === data.id ? { ...p, ...data } : p))
    const updated = products.find((p) => p.id === data.id)!
    return delay(updated)
  }
  const created: Product = {
    ...data,
    id: `p-${crypto.randomUUID?.() || Math.random().toString(36).slice(2, 8)}`,
  }
  products = [created, ...products]
  return delay(created)
}

export async function getDashboardStats(userRole: Role) {
  const totalProducts = products.length
  const active = products.filter((p) => p.status === 'active').length
  const lowStock = products.filter((p) => p.stock < 50).length
  return delay({
    totalProducts,
    active,
    lowStock,
    role: userRole,
  })
}


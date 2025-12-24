export type Role = 'manager' | 'keeper'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface LoginPayload {
  email: string
  password: string
}

export interface Product {
  id: string
  name: string
  category: string
  stock: number
  price: number
  status: 'active' | 'archived'
}

export interface AuthResponse {
  token: string
  user: User
}

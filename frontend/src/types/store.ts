export type paid = 'none' | 'partial' | 'full'
export type status = 'pending' | 'in progress' | 'completed' | 'cancelled'

export interface ICartItem {
  id: string
  name: string
  price: number
  quantity: number
  description: string
  details: string // user-added details
  paid: paid
  status: status
}
export interface IInfo {
  email: string
  name: string
  companyName?: string
  businessID?: string
  zip?: string
  city?: string
  address?: string
  country?: string
  phone?: string
}

export interface ICart {
  orderID: string
  info: IInfo
  items: ICartItem[]
  total: number
  extra: string
  status: status
  createdAt: Date
  updatedAt: Date
}

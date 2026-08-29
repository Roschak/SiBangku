// PRD §36-40: Menu & Order Types

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  categoryId: string;
  available: boolean;
  stock: number | null;
  preparationTime: number | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes: string | null;
}

export interface Order {
  id: string;
  reservationId: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

// PRD §31-34: Reservation Types

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'SEATED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'EXPIRED';

export type ReservationMode = 'RESERVATION_ONLY' | 'RESERVATION_WITH_PREORDER';

export interface Reservation {
  id: string;
  reservationNumber: string;
  customerId: string | null;
  tableId: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: ReservationStatus;
  paymentStatus: string;
  preOrderEnabled: boolean;
  totalAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TableStatus = 'AVAILABLE' | 'SELECTED' | 'RESERVED' | 'OCCUPIED' | 'BLOCKED' | 'MAINTENANCE';

export type TableShape = 'ROUND' | 'SQUARE' | 'RECTANGLE' | 'BOOTH' | 'BAR' | 'CUSTOM';

export interface Table {
  id: string;
  tableNumber: number;
  tableName: string;
  capacity: number;
  shape: TableShape;
  positionX: number;
  positionY: number;
  rotation: number;
  section: string | null;
  status: TableStatus;
  minReservationTime: number;
  maxReservationTime: number;
  createdAt: Date;
  updatedAt: Date;
}

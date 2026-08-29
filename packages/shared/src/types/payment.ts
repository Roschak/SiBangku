// PRD §41-45: Payment Types

export type PaymentMode = 'FULL_PAYMENT' | 'DEPOSIT' | 'PAY_AT_RESTAURANT' | 'MANUAL_CONFIRMATION';

export type PaymentProvider = 'MIDTRANS' | 'XENDIT' | 'MANUAL_TRANSFER' | 'CASH';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED' | 'EXPIRED';

export interface PaymentTransaction {
  id: string;
  reservationId: string;
  provider: PaymentProvider;
  providerTransactionId: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// PRD §43: Payment Provider Adapter Interface
export interface IPaymentProviderAdapter {
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>;
  cancelPayment(transactionId: string): Promise<void>;
  refundPayment(transactionId: string, amount?: number): Promise<void>;
  verifyWebhook(payload: unknown, signature: string): Promise<boolean>;
}

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  transactionId: string;
  redirectUrl?: string;
  status: PaymentStatus;
}

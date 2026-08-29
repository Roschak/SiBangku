import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { payments, reservations, orders } from '@sibangku/db';
import { requireTenantUser } from '../middleware/auth.js';
import type { TenantContext } from '../middleware/tenant.js';
import { nanoid } from 'nanoid';
import type { PaymentProvider, PaymentStatus, PaymentMode } from '@sibangku/shared';

const paymentRoutes = new Hono<TenantContext>();

// POST /payments/checkout - Trigger payment checkout for reservation (PRD §42, §43, §84)
paymentRoutes.post('/payments/checkout', async (c) => {
  try {
    const { reservationId, provider = 'MANUAL_TRANSFER' } = await c.req.json();
    const tenantDb = c.get('tenantDb');

    if (!reservationId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'reservationId is required',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // Retrieve reservation details
    const resResult = await tenantDb
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);

    const reservation = resResult[0];

    if (!reservation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Reservation not found',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    if (reservation.paymentStatus === 'PAID') {
      return c.json(
        {
          success: false,
          error: {
            code: 'ALREADY_PAID',
            message: 'Reservation is already paid',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    const providerTransactionId = `tx-${nanoid(12)}`;
    const paymentId = `pay-${nanoid(8)}`;

    // Create a pending payment transaction record
    await tenantDb.insert(payments).values({
      id: paymentId,
      reservationId,
      provider: provider as PaymentProvider,
      providerTransactionId,
      status: 'PENDING',
      amount: reservation.totalAmount,
      currency: 'IDR',
      metadata: { checkoutTimestamp: new Date().toISOString() },
    });

    // Mock payment gateway links based on provider
    let redirectUrl = `/checkout/confirmation?reservationId=${reservationId}`;
    if (provider === 'MIDTRANS') {
      redirectUrl = `https://mock-midtrans-checkout.sibangku.example/snap/v2/vtweb/${providerTransactionId}`;
    } else if (provider === 'XENDIT') {
      redirectUrl = `https://mock-xendit-checkout.sibangku.example/invoice/${providerTransactionId}`;
    }

    return c.json({
      success: true,
      data: {
        paymentId,
        provider,
        providerTransactionId,
        amount: reservation.totalAmount,
        redirectUrl,
      },
    });

  } catch (err: any) {
    console.error('[Payment Routes] Checkout error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Checkout process failed',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// POST /payments/webhook/:provider - Idempotent Payment Webhook (PRD §45, §133, §205)
paymentRoutes.post('/payments/webhook/:provider', async (c) => {
  try {
    const provider = c.req.param('provider') as PaymentProvider;
    const body = await c.req.json();
    const tenantDb = c.get('tenantDb');

    // Extract transaction details from webhook payload
    // For our unified mock, we expect: { transactionId: '...', status: 'PAID' | 'FAILED' }
    const { transactionId, status } = body;

    if (!transactionId || !status) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'transactionId and status are required in webhook payload',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    console.info(`[Payment Webhook] Received webhook for ${provider} (Tx: ${transactionId}, Status: ${status})`);

    // Fetch the transaction
    const txResult = await tenantDb
      .select()
      .from(payments)
      .where(eq(payments.providerTransactionId, transactionId))
      .limit(1);

    const txRecord = txResult[0];

    if (!txRecord) {
      return c.json(
        {
          success: false,
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction ID not recognized',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    // PRD §45, §133, §205: Webhook Idempotency check!
    // If the payment is already processed, return 200 OK without repeating logic.
    if (txRecord.status === 'PAID') {
      console.info(`[Payment Webhook] Idempotency triggered. Tx ${transactionId} is already paid. Skipping.`);
      return c.json({
        success: true,
        message: 'Webhook processed (already paid)',
      });
    }

    // Process payment state transition inside a database transaction
    await tenantDb.transaction(async (dbTx: any) => {
      // 1. Update payment transaction status
      const mappedStatus = status === 'PAID' ? 'PAID' : 'FAILED';
      await dbTx
        .update(payments)
        .set({
          status: mappedStatus as PaymentStatus,
          updatedAt: new Date(),
          metadata: { ...txRecord.metadata, webhookReceived: new Date().toISOString() },
        })
        .where(eq(payments.id, txRecord.id));

      if (mappedStatus === 'PAID') {
        // 2. Update reservation payment status & status
        await dbTx
          .update(reservations)
          .set({
            paymentStatus: 'PAID',
            status: 'CONFIRMED', // Set to CONFIRMED once paid
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, txRecord.reservationId));

        // 3. Update order status if exists
        await dbTx
          .update(orders)
          .set({
            status: 'CONFIRMED',
            updatedAt: new Date(),
          })
          .where(eq(orders.reservationId, txRecord.reservationId));

        console.info(`[Payment Webhook] Reservation ${txRecord.reservationId} successfully confirmed via paid webhook.`);
      }
    });

    return c.json({
      success: true,
      message: 'Payment webhook processed successfully',
    });

  } catch (err: any) {
    console.error('[Payment Webhook] Process error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Webhook processing failed',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

export { paymentRoutes };

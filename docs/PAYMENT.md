# Payment Integration Architecture

This document describes the payment flow, signature verification rules, and idempotency handling implemented for pre-ordered reservations in **SiBangku**.

## 1. Snap Integration Workflow

For Mode 2 reservations, upfront checkout requires deposit clearing.

```text
Customer            Booking Wizard         Tenant API            Midtrans
   |                      |                    |                    |
   |-- Trigger checkout ->|                    |                    |
   |                      |-- Create Booking ->|                    |
   |                      |   (State: PENDING) |                    |
   |                      |                    |-- Request Snap --->|
   |                      |                    |<-- Return Token ---|
   |                      |<-- Return Token ---|                    |
   |<-- Load Payment UI --|                    |                    |
   |                      |                    |                    |
   |==== Complete Payment =========================================>|
   |                      |                    |                    |
   |                      |                    |--- Webhook Msg --->|
   |                      |                    |    (State: PAID)   |
   |                      |                    |<-- Ack Receipt ----|
```

1.  **Booking Init**: System saves the customer profile and reservation under a `PENDING` status.
2.  **Snap Token Request**: The `tenant-api` constructs a billing invoice and requests a transaction token from Midtrans Snap APIs.
3.  **Client Redirect**: Next.js loads the Snap overlay, allowing customers to pay via virtual accounts, e-wallets, or cards.
4.  **Pending Hold**: The table is held for 15 minutes. If no notification is received, the worker releases the lock.

## 2. Webhook Signature Verification

To prevent hackers from spoofing payments by calling the webhook endpoint manually, all incoming webhook payloads must be verified.

### Signature Validation Formula
Midtrans sends a `signature_key` header representing a SHA512 hash:
$$\text{signature\_key} = \text{SHA512}(\text{order\_id} + \text{status\_code} + \text{gross\_amount} + \text{server\_key})$$

The `tenant-api` verifies this security key:
1.  Constructs the payload string using the body contents (`order_id`, `status_code`, `gross_amount`) and the secret `server_key` retrieved from settings.
2.  Computes the local SHA512 hash.
3.  Compares it against the incoming `signature_key`. If they do not match, the request is instantly rejected with `401 Unauthorized`.

## 3. Idempotent State Transitions

Webhook messages can sometimes be delivered multiple times by gateways. To prevent duplicate billing/accounting records, the webhook handler is **idempotent**:

*   **Current State Check**: Prior to initiating state changes, the system fetches the current payment record.
*   **Duplicate Bypass**: If the payment status is already `SUCCESS` or `SETTLED`, the engine terminates immediately and returns `200 OK` to acknowledgment calls.
*   **Transactional State Updates**: Transitions from `PENDING` to `SUCCESS` are bound in database transactions, modifying the reservation status to `CONFIRMED`, decreasing menu item stock quantities, and creating audit entries as a single atomic operation.

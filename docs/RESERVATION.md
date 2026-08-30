# Reservation Engine Specification

This document details the mechanics of the **SiBangku** Reservation Engine, focusing on scheduling, mode configurations, concurrency safety, and notification interfaces.

## 1. Booking Modes (PRD §31, §39)

The platform supports two distinct reservation check-out workflows:

### Mode 1: Reservation Only
*   The guest reserves a table for a specific date and time slot.
*   No pre-ordered food items are included.
*   Payment is handled at the restaurant or via custom policies, but no upfront digital deposit is mandated by the booking wizard checkout.

### Mode 2: Reservation + Pre-Order
*   The guest selects a table AND selects menu items to pre-order.
*   The system calculates the subtotal, creates a Midtrans/Snap invoice, and holds the table.
*   If payment succeeds (received via snap webhook), the booking is transitioned from `PENDING` to `CONFIRMED` and menu stock counts are decremented.
*   If payment fails or expires, the reservation is released and stock counts are restored.

## 2. Concurrency Control (Overlap Slot Verification)

To prevent double-booking identical tables for overlapping time frames, reservations must satisfy a non-overlapping scheduling window.

### Time Collision Formula
Two bookings for the same table (`tableId`) on the same day overlap if:
$$\text{start}_1 < \text{end}_2 \quad \text{AND} \quad \text{end}_1 > \text{start}_2$$

Where:
*   $\text{start}_1, \text{end}_1$ is the time boundary of the new booking request.
*   $\text{start}_2, \text{end}_2$ is the boundary of an existing reservation.

### Implementation Protocol
1.  **PostgreSQL Transaction Scope**: The overlap verification query and subsequent record insert are bound inside a single transaction block.
2.  **Row Locking**: The check uses a strict database query checking for existing matching schedules:
    ```sql
    SELECT 1 FROM reservations 
    WHERE table_id = $1 
      AND date = $2 
      AND status NOT IN ('CANCELLED', 'REJECTED')
      AND start_time < $3 
      AND end_time > $4;
    ```
3.  **Cancellation & Rollback**: If the query returns a row, a collision is flagged, the transaction rolls back, and the client receives a booking conflict error response.

## 3. WhatsApp Notification Interface

When reservation states change, the system schedules notification events (PRD §171).

### Supported State Alerts
*   **On Provisioning**: Temporary passwords sent to Restaurant Owner.
*   **On Booking Request**: Reservation number and invoice link sent to Customer.
*   **On Confirmation**: Table lock confirmation sent to Customer.
*   **On Cancellation**: Notice of release sent to Customer and Restaurant Host.

### Mock Notification Dispatcher
Currently, messages are routed to a mock dispatcher console in `packages/worker/src/index.ts`. In production, this handler routes calls to WhatsApp Business API endpoints (e.g. Twilio, Fonnte, or Wablas).

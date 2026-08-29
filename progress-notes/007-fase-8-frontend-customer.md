# FASE 8: Frontend — Customer

**Status:** ✅ COMPLETED  
**Tanggal Mulai:** 2026-08-29  
**Terakhir Update:** 2026-08-29T19:08:00+07:00

## Yang Sudah Dikerjakan

### Frontend Customer (FASE 8)
- [x] Created Tenant dynamic host and API URL resolver utility (`src/app/utils/tenant.ts`).
- [x] Implemented Customer White-Label Landing Page (`src/app/page.tsx`):
  - [x] Dynamically fetches and applies custom branding configs (colors, fonts, hero header, WhatsApp number).
  - [x] Renders categorized list of available menu items for client browsing.
- [x] Implemented Customer Booking Wizard Flow (`src/app/booking/page.tsx`):
  - [x] Step 1: Schedule Selection (inputs for dates, pax guest counts, and dynamic operating slot hours).
  - [x] Step 2: Visual Table Selector Canvas: Renders absolute floor layout. Computes active overlapping bookings on selected dates and gray blocks/disables reserved tables instantly (PRD §28, §82).
  - [x] Step 3: Optional Pre-orders (Mode 2): Multi-item cart list with counters, notes, and auto pricing subtotal aggregates (PRD §39).
  - [x] Step 4: Checkout Credentials: Name, phone, email, and special notes. Sends payload to Tenant API.
  - [x] Payments integration: On Mode 2 success, requests checkout snap invoicing and redirects browser to gateway mock payment interface (PRD §42, §43).
- [x] Implemented Booking Confirmation page (`src/app/confirmation/page.tsx`):
  - [x] Fetches and renders submitted reservation code, dates, tables, guest counts, and pre-ordered billing breakdowns.
  - [x] Features Cancel Booking client button triggering policy cancellation POST requests (PRD §20).
- [x] Implemented Expired / Suspended Resto page (`src/app/expired/page.tsx`):
  - [x] Provides warnings when trial limits or license suspension states are hit (PRD §101).
- [x] Verified build compilation is green.

## Yang Belum / Selanjutnya
- [ ] FASE 9: CLI Tool
- [ ] FASE 10: Worker & Background Jobs
- [ ] FASE 11: Docker & Deployment
- [ ] FASE 12: Testing
- [ ] FASE 13: Documentation
- [ ] FASE 14: Final Audit

## Keputusan Arsitektur
1. **Dynamic Client Side Collision Checks**: Prior to table selection, the booking page queries existing schedules, allowing clients to calculate table overlaps beforehand and avoid double-booking errors.
2. **Unified Invoicing Redirection**: On pre-ordered flow, the page triggers payment creation and redirects immediately to the resolved transaction endpoint.
3. **Suspense Boundaries**: Wrapped search param hook components in standard Suspense boundaries to ensure clean static page generations under Next.js 15 routing.

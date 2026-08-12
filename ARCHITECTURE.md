# Architecture Overview

## 1. System Architecture
Vaira is a full-stack Next.js application utilizing the App Router paradigm. 
- **Client Components** are used exclusively for interactive UI elements (Search Bars, Charts, Forms, Dialogs).
- **Server Components** are used for data fetching and layout rendering to ensure zero-JS overhead where possible.
- **API Routes** handle external integrations (AI) and some client-side data mutations.
- **Server Actions** handle secure, form-based mutations (e.g., fulfilling orders, adjusting stock).

## 2. Database Design (Entity-Relationship)
The database is normalized for strict relational integrity using PostgreSQL via Prisma.

### Core Entities:
- **User**: System operators with RBAC (`ADMIN`, `MANAGER`, `STAFF`, `VIEWER`).
- **Warehouse**: Physical locations.
  - **Zone**: Sub-sections of a warehouse (e.g., "Cold Storage", "Electronics").
    - **Rack**: Shelving units within a zone.
      - **Bin**: Specific locations on a rack where items are placed.
- **Product**: SKUs and metadata.
- **Supplier & Customer**: Counterparties for orders.
- **Inventory**: A junction table linking exactly one `Product` to exactly one `Bin` with a `quantity`.
- **InventoryTransaction**: An immutable append-only ledger recording every stock movement (Receipts, Dispatches, Adjustments).
- **PurchaseOrder / SalesOrder**: Workflows for inbound and outbound goods.

## 3. AI Integration Pattern
Vaira implements a strict "Intent-to-Query" pattern for AI features to ensure zero risk of SQL injection or hallucinations.

1. **Natural Language Search**:
   - User inputs text -> Sent to Gemini API.
   - Gemini maps the intent to a strictly defined JSON Schema representing filters (e.g., `quantity < 10`).
   - The backend validates the JSON and executes a safe Prisma `findMany` query.
   - Gemini NEVER generates or executes raw SQL.

2. **AI Report Summaries**:
   - The server pre-aggregates verified metrics (Total value, low stock arrays).
   - This structured data is sent to Gemini.
   - Gemini formats a professional textual summary without inventing any underlying metrics.

## 4. Connection Pooling Strategy
To survive aggressive Hot Module Reloading (HMR) during local development with `prisma+postgres`, the application strictly caches the `pg.Pool` instance inside `globalThis`. The `@prisma/adapter-pg` is used to map this pool to the Prisma Client. This ensures the TCP connection limit is never exhausted by the Next.js dev server.

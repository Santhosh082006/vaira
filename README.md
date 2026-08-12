# Vaira - Intelligent Warehouse Management System

Vaira is a modern, AI-powered Warehouse Management System (WMS) built with Next.js, Prisma, and PostgreSQL. It provides a comprehensive suite of tools for managing inventory, tracking shipments, forecasting stock risks, and fulfilling orders—all wrapped in a premium, enterprise-grade UI.

## Features

- **Inventory Tracking:** Real-time visibility into stock levels across multiple warehouses, zones, racks, and bins.
- **Order Management:** End-to-end workflows for Purchase Orders (Inbound) and Sales Orders (Outbound).
- **AI-Powered Insights:** Uses Gemini AI to analyze stock trajectory, detect out-of-stock risks, and provide business summaries.
- **Natural Language Search:** Ask questions like *"Show me low stock electronics"* to instantly query the database without writing SQL.
- **Role-Based Access Control:** Secure authentication with NextAuth (Admin, Manager, Staff, Viewer).
- **Export & Reporting:** One-click Excel/PDF exports and interactive charts via Recharts.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui, Lucide Icons, Recharts
- **Backend:** Next.js Server Actions & API Routes, Prisma ORM
- **Database:** PostgreSQL
- **AI Integration:** Google GenAI SDK (Gemini 1.5 Flash/Pro)
- **Authentication:** NextAuth.js (Credentials Provider)

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- A local PostgreSQL instance (or use Prisma Postgres local dev)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your details:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
DATABASE_URL="postgres://postgres:password@localhost:5432/vaira?schema=public"
NEXTAUTH_SECRET="your-super-secret-string"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Database Setup
Push the schema to your database and generate the Prisma Client:
```bash
npx prisma generate
npx prisma db push
```

### 4. Seed Initial Data
Populate the database with a test admin user, warehouses, and products:
```bash
npx tsx prisma/seed.ts
```
*Note: The default admin login is `admin@vaira.app` / `password`.*

### 5. Run the Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel (Production)

Vaira is optimized for Vercel deployment. 

1. **Push your code to GitHub.**
2. **Import the project in Vercel.**
3. **Configure Environment Variables in Vercel:**
   - `DATABASE_URL`: Your production PostgreSQL URL (e.g., Supabase, Neon, AWS RDS).
   - `NEXTAUTH_SECRET`: Generate a secure random string (e.g., `openssl rand -base64 32`).
   - `NEXTAUTH_URL`: Your Vercel production URL (e.g., `https://vaira-wms.vercel.app`).
   - `GEMINI_API_KEY`: Your production Gemini API key.
4. **Deploy.** Vercel will automatically run `npm run build` which includes TypeScript checks and production optimizations.
5. **Post-Deployment:** Run the seed script on your production database if you need initial configuration.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed information on the database schema, API routing, and AI integration patterns.

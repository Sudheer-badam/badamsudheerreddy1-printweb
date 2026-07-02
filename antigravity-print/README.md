# Antigravity — Smart Online Printing Management System

**Production-ready SaaS for online printing management. Customers upload PDFs, Admin manages orders, printing, payments, and notifications.**

---

## 🚀 Quick Start

### 1. Configure Environment Variables

Copy and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your real credentials (see Environment Variables section below).

### 2. Set Up Database (Neon PostgreSQL)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project → copy the **Connection String**
3. Paste it into `.env.local` as `DATABASE_URL`

Push the schema:
```bash
npx prisma db push
```

### 3. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → Enable:
   - **Authentication → Phone** (OTP)
   - **Authentication → Email/Password**
   - **Authentication → Google**
   - **Authentication → Microsoft**
   - **Authentication → Apple** (requires Apple Developer Account)
3. Go to **Project Settings → General** → copy the Web App config
4. Go to **Project Settings → Service Accounts** → Generate a new private key (JSON)
5. Add all values to `.env.local`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | ✅ |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key | ✅ |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | ✅ |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | ✅ |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | ✅ |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender | ✅ |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | ✅ |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin project ID | ✅ |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin service account email | ✅ |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin private key (with `\n`) | ✅ |
| `ADMIN_EMAIL` | Your admin email — this grants admin role | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (for PDF storage) | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Optional |
| `RAZORPAY_KEY_ID` | Razorpay payment gateway key | Optional |
| `RAZORPAY_KEY_SECRET` | Razorpay payment secret | Optional |
| `RESEND_API_KEY` | Resend email API key | Optional |
| `TWILIO_ACCOUNT_SID` | Twilio SMS/WhatsApp SID | Optional |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Optional |
| `TWILIO_PHONE_NUMBER` | Twilio sender phone number | Optional |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g., `http://localhost:3000`) | Optional |

---

## 🗺️ Routes Overview

### Customer Routes
| Route | Description |
|---|---|
| `/` | Landing page |
| `/auth/login` | Login (Phone OTP, Email, Google, Microsoft, Apple) |
| `/auth/register` | Registration |
| `/dashboard` | Customer dashboard with stats & recent orders |
| `/dashboard/upload` | Upload PDF & configure print options |
| `/dashboard/orders` | Order list with search & filters |
| `/dashboard/orders/[id]` | Order detail with status timeline |
| `/dashboard/payments` | Payment history |
| `/dashboard/notifications` | Notifications |
| `/dashboard/profile` | Edit profile |
| `/dashboard/support` | Support, FAQ, contact |

### Admin Routes
| Route | Description |
|---|---|
| `/admin` | Admin dashboard with analytics |
| `/admin/orders` | All orders — update status, view details |
| `/admin/customers` | Customer list |
| `/admin/analytics` | Revenue charts |
| `/admin/payments` | All payment records |
| `/admin/notifications` | System notifications |
| `/admin/settings` | Pricing, service toggles, business info |

### API Routes
| Route | Description |
|---|---|
| `POST /api/auth/sync` | Sync Firebase user to database |
| `GET/PATCH /api/users` | User profile |
| `GET/POST /api/orders` | Order CRUD |
| `GET/PATCH/DELETE /api/orders/[id]` | Single order |
| `GET /api/admin/analytics` | Admin analytics |
| `GET/PATCH /api/pricing` | Pricing management |
| `GET/PATCH /api/notifications` | Notifications |
| `GET/POST /api/payments` | Payments |
| `GET/PATCH /api/admin/settings` | Business settings |
| `GET /api/admin/customers` | Customer list (admin) |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, Framer Motion, Glassmorphism design |
| Auth | Firebase Authentication (OTP, Google, Email, Microsoft, Apple) |
| Database | Neon PostgreSQL via Prisma ORM v5 |
| File Storage | Cloudinary (PDFs) |
| Payments | Razorpay / UPI |
| Email | Resend |
| SMS / WhatsApp | Twilio |
| Icons | Lucide React |
| Charts | Recharts |

---

## 👤 Admin Setup

1. Register on the app with the email set as `ADMIN_EMAIL` in `.env.local`
2. The system will automatically assign the **ADMIN** role on first sync
3. Access the admin panel at `/admin`

---

## 📦 Deployment (Netlify / Vercel)

```bash
# Build
npm run build

# Or deploy via Netlify MCP / Vercel CLI
```

Add all environment variables to your hosting provider's dashboard.

After deploying, run the database migration:
```bash
npx prisma db push
```

---

## 🔒 Security Features

- Role-based access control (Customer vs Admin)
- Firebase JWT authentication on every request
- HTTP security headers (CSP, X-Frame-Options, etc.)
- Data isolation (customers can only access their own data)
- Input validation with Zod on API routes

---

## 📋 Known Pending Integrations

| Feature | Status |
|---|---|
| PDF file upload to Cloudinary | Ready to wire (Cloudinary creds needed) |
| Razorpay checkout UI | API ready, frontend checkout pending |
| SMS via Twilio | API route ready, Twilio creds needed |
| WhatsApp notifications | Twilio API structure in place |
| Email via Resend | Structure in place |
| PDF invoice generation | Planned (use `@react-pdf/renderer`) |
| Apple Sign-In | Requires Apple Developer Account |

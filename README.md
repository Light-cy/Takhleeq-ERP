# Takhleeq ERP - Modular Facility Booking & Management System

A high-performance full-stack ERP system engineered with **React (Vite)** on the frontend and an **Express (Node.js)** server on the backend. This system integrates **Microsoft SSO OAuth 2.0 (Azure Active Directory / Entra ID)** for authentication and features a hybrid dual-mode database engine (**PostgreSQL** with an automatic **local JSON file fallback**).

---

## 🚀 Quick Start (Local Setup)

Follow these steps to run the complete system (frontend + backend) on your local machine:

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (Version 18.x or newer)
- [npm](https://www.npmjs.com/) (usually bundled with Node.js)
- *Optional:* [PostgreSQL](https://www.postgresql.org/) database. If you do not have PostgreSQL, the server will automatically fallback to a lightweight, built-in JSON-based database (`server/local_db.json`) so the app remains fully functional without any external services!

### 2. Installation
Open your terminal in the project root directory and run:
```bash
# Install all required npm packages for both frontend and backend
npm install
```

### 3. Setting up Environment Variables (`.env`)
The project utilizes a `.env` file to manage secrets and client configurations. Since `.env` is omitted from Git for security, you must create one:

1. Copy the `.env.example` file to create your `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Open the new `.env` file and configure your values:
   ```env
   # Gemini API Key (Optional, for AI features)
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

   # App hosting URL (For local development, keep it http://localhost:3000)
   APP_URL="http://localhost:3000"

   # PostgreSQL Connection String (Optional)
   # Leave this as is, or comment it out/leave empty if you want the app to automatically use the local JSON DB fallback (highly recommended for immediate offline testing!)
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/takhleeq"

   # Secret key used to sign session JWTs (Change to any secure random string)
   JWT_SECRET="your-secret-key-change-this-in-production"

   # Comma-separated list of Microsoft domains permitted to log in (e.g., ucp.edu.pk, pgc.edu.pk, gmail.com)
   ALLOWED_EMAIL_DOMAINS="ucp.edu.pk,pgc.edu.pk,gmail.com"

   # Your Microsoft Azure Active Directory App Registration Client ID (Details below)
   VITE_MICROSOFT_CLIENT_ID="your-microsoft-client-id-here"

   # Server port & environment configuration
   PORT=3000
   NODE_ENV=development
   ```

### 4. Running the Application (Development Mode)
This is a full-stack integrated application. You do **NOT** need to run separate commands for the frontend and backend. The Express server serves as a proxy and mounts the Vite bundler in development mode.

To boot up both parts simultaneously, run:
```bash
npm run dev
```

Your terminal will print:
`Takhleeq ERP Modular Express server running on http://localhost:3000`

Now, open your browser and navigate to **`http://localhost:3000`**.

---

## 🔑 Microsoft SSO (Azure Active Directory / Entra ID) Setup

To connect real Microsoft login flows to your application, you must register it on the Azure Portal. Follow these exact configuration steps:

### Step 1: Register the Application
1. Sign in to the [Azure Portal](https://portal.azure.com/).
2. Search for and select **Microsoft Entra ID** (formerly Azure Active Directory).
3. In the left navigation pane, select **App registrations** -> **New registration**.
4. Enter a name for your app (e.g., `Takhleeq ERP`).
5. Select **Supported account types**:
   - Choose *Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)* if you want users with both university/work accounts and personal hotmail/live accounts to sign in.
   - Choose *Single-tenant* if you want to restrict login strictly to your university domain users.

### Step 2: Configure Platforms & Redirect URIs
1. In the sidebar of your Registered App, click on **Authentication**.
2. Click **Add a platform** and choose **Single-page application (SPA)** (Important: Do not choose "Web").
3. In the Redirect URIs field, add your local callback address:
   ```text
   http://localhost:3000/microsoft-callback.html
   ```
   *(When deploying to production, add your deployed domain URL, e.g., `https://your-domain.com/microsoft-callback.html`)*

### Step 3: Enable Implicit & Hybrid Grant Flows
*(This solves the **`AADSTS700051`** error)*
1. Scroll down on the **Authentication** page to the section labeled **Implicit grant and hybrid flows**.
2. Check **both** checkboxes:
   - [x] **Access tokens (used for implicit flows)**
   - [x] **ID tokens (used for implicit and hybrid flows)**
3. Click the **Save** button at the bottom of the page.

### Step 4: Copy Client ID to your `.env`
1. Go back to the **Overview** page of your Azure app registration.
2. Copy the **Application (client) ID** (a long guid like `a1b2c3d4-e5f6-...`).
3. Paste this value into your `.env` file for **`VITE_MICROSOFT_CLIENT_ID`**.
4. Restart your local server (`npm run dev`) to apply the new environment variables.

---

## 🛠️ Production Build & Deployment

When you are ready to compile the application and bundle it for server-optimized production, run:

```bash
# 1. Clean previous builds and generate production client assets & optimized server bundles
npm run build

# 2. Start the production server
npm run start
```

### Production Build Mechanics
Under the hood:
- `vite build` compiles frontend assets into static HTML, CSS, and JS inside the `dist/` folder.
- `esbuild` bundles the Node.js TypeScript backend server into a single, high-performance CommonJS file at `dist/server.cjs` for lightning-fast container cold-start speeds.

---

## 📁 Directory Structure Overview

```text
├── server/
│   ├── db.ts             # Database layer (PostgreSQL connection pool & local JSON DB engine fallback)
│   ├── index.ts          # Express server entry and Vite integration middleware
│   ├── middleware/       # Authentication and session middlewares
│   └── routes/           # REST API routes (Users, Bookings, Rooms, Bans, Audit Logs)
├── src/
│   ├── components/       # React interactive components (LoginPage, AdminDashboard, BookingForm, etc.)
│   ├── App.tsx           # Main client-side router and state root
│   ├── types.ts          # Universal TypeScript type definitions shared across client & server
│   └── index.css         # Styling with Tailwind CSS
├── .env.example          # Template for local environment variable configuration
├── index.html            # Main SPA entry page
├── server.ts             # Root server execution entry
├── migration.sql         # PostgreSQL schema definition and seed scripts
└── package.json          # Node scripts and dependencies manifests
```

---

## 💡 Troubleshooting & FAQs

### Q1: I see PostgreSQL warnings in my terminal console?
```text
Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases...
```
This is a standard warning from the Node Postgres library (`pg` connection parser) alert regarding future changes to default SSL behaviors. **This warning is safe to ignore** and does not impact your database operations or app performance.

### Q2: What is the "Approval required" screen when logging in?
If you are logging in with a university/work Microsoft account (like `@ucp.edu.pk` or `@pgc.edu.pk`), your tenant's IT administrators have restricted non-admin users from registering or consenting to third-party enterprise apps.
- **Is this only for me?** No. Any user from that same tenant/organization who tries to log in will see the exact same screen until an IT administrator approves the application.
- **How to resolve?**
  1. **Submit justification:** You can fill out the form in the window and click "Request approval". Your university's IT department will receive an email to approve it.
  2. **Admin Consent:** If you have access to an administrator account, or can ask your IT team, they can log in once and select **"Consent on behalf of your organization"** on the consent screen. Once approved tenant-wide, all other students and staff can log in with zero barriers!
  3. **Alternative Accounts:** For personal testing, you can change your app registration to support personal accounts or register a free personal Microsoft developer tenant where you have full admin rights.

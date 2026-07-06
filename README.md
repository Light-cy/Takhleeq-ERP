# Takhleeq ERP - Modular Facility Booking & Management System

Takhleeq ERP is a high-performance, full-stack enterprise resource planning and room booking system engineered with **React (Vite)** on the frontend and a modular **Express (Node.js)** server on the backend. 

The application integrates **Microsoft SSO OAuth 2.0 (Azure Active Directory / Entra ID)** for secure authentication, features a **hybrid dual-mode database engine** (PostgreSQL with a seamless local JSON database fallback for zero-dependency local testing), and enforces strict domain-driven business rules.

---

## ✨ Architectural Features & Key Milestones

### 1. Domain-Driven Modular Backend Restructuring
We have evolved the backend from a traditional flat router layout into a clean, modern **Modular/Domain-driven directory structure** located under `/server/modules/`. Each major functional boundary is isolated with its own dedicated controller, router, and business models:
*   **`users/`**: Manages Microsoft Graph authentication, local simulated logins for development bypass, and administrative user registration.
*   **`roles/`**: Controls role definition, privilege assignments, and safeguards against administrative role deletion or system privilege escalation.
*   **`rooms/`**: Administers workspace details (capacities, operating hours, active statuses, and minimum/maximum reservation windows).
*   **`bookings/`**: Handles public submission validation, automated overlapping conflict detection, and staff calendar overrides.
*   **`bans/`**: Handles email-based user banning with duration ceilings aligned with staff-member seniority levels.
*   **`audit/`**: Tracks system actions, compiling precise JSON diff logs and summarizing key administrative reports.

### 2. Deep-Tiered Privilege Enforcement (Security & Business Logic)
*   **Privilege Escalation Block**: A role creator is strictly forbidden from granting permissions to custom roles that they do not hold themselves.
*   **System Integrity Safeguards**: System-critical roles (such as `Administrator` or `UCP Member`) and custom roles with active users assigned to them are locked against deletion.
*   **Staff Ban Ceilings**: Enforces ban-issuance restrictions based on the issuer's role. Non-administrative staff have set duration ceilings (e.g., 7, 30, or 90 days) and cannot grant unlimited or permanent bans without explicit administrator clearance.
*   **Administrator Restrictions (BR-11)**: Prevents custom roles from being assigned sensitive permissions like `MANAGE_ROLES`, `VIEW_AUDIT_LOGS`, `MANAGE_USERS`, `CONFIGURE_ROOMS`, `CONFIGURE_POLICIES`, or `LIFT_BAN`.
*   **Conflict & Notice Auto-Detection**: Real-time calendar overlap checks flag incoming requests as `CONFLICT_DETECTED` when overlapping with approved entries. Additionally, cancellations under a 1-hour notice period are marked with a policy-violation flag.

### 3. Shared Type & Constant Synchronization
We established `/server/shared/` to serve as a bridge between the frontend React application and the backend Express server, guaranteeing complete type safety:
*   **`/server/shared/types/index.ts`**: Implements custom type interfaces (e.g., `AuthenticatedRequest`) to extend the standard Express Request handler.
*   **`/server/shared/constants/`**: Directly exports status lists and permission values from `/src/constants/` to ensure frontend and backend validators are aligned.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (Version 18.x or newer)
*   [npm](https://www.npmjs.com/) (usually bundled with Node.js)
*   *Optional:* [PostgreSQL](https://www.postgresql.org/) database. If you do not have PostgreSQL, the server will automatically fall back to a lightweight, built-in JSON-based database (`server/local_db.json`) so the app remains fully functional out of the box!

### 2. Installation
Open your terminal in the project root directory and run:
```bash
# Install all required npm packages for both frontend and backend
npm install
```

### 3. Setting up Environment Variables (`.env`)
The project utilizes a `.env` file to manage secrets and client configurations. Copy the template and customize your settings:

```bash
cp .env.example .env
```

Open the new `.env` file and configure your values:
```env
# Gemini API Key (Optional, for AI assistance)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# App hosting URL (For local development, keep http://localhost:3000)
APP_URL="http://localhost:3000"

# PostgreSQL Connection String (Optional)
# Leave empty to automatically use the built-in local JSON DB fallback for immediate offline testing
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/takhleeq"

# Secret key used to sign session JWTs (Change to any secure random string)
JWT_SECRET="your-secret-key-change-this-in-production"

# Comma-separated list of Microsoft domains permitted to log in
ALLOWED_EMAIL_DOMAINS="ucp.edu.pk,pgc.edu.pk,gmail.com"

# Your Microsoft Azure Active Directory App Registration Client ID
VITE_MICROSOFT_CLIENT_ID="your-microsoft-client-id-here"

# Server port & environment configuration
PORT=3000
NODE_ENV=development
```

### 4. Running the Application (Development Mode)
This is a unified, full-stack application. You do **not** need to run separate terminals for the frontend and backend. The Express server serves as a proxy and mounts the Vite dev server dynamically.

To boot up the integrated application, run:
```bash
npm run dev
```

Now, navigate to **`http://localhost:3000`** in your browser.

---

## 🔑 Microsoft SSO Integration Setup
To connect Microsoft login flows to your application, register it on the Azure/Entra ID Portal:

### Step 1: Register the Application
1. Sign in to the [Azure Portal](https://portal.azure.com/).
2. Search for and select **Microsoft Entra ID**.
3. Navigate to **App registrations** -> **New registration**.
4. Enter a name (e.g., `Takhleeq ERP`) and select your target organizational tenancy type.

### Step 2: Configure Platforms & Redirect URIs
1. Under **Authentication** inside your registered app sidebar, select **Add a platform** and choose **Single-page application (SPA)**.
2. In the Redirect URIs field, add your callback address:
   ```text
   http://localhost:3000/microsoft-callback.html
   ```
   *(For production, swap this with your deployed domain, e.g., `https://your-domain.com/microsoft-callback.html`)*

### Step 3: Enable Implicit & Hybrid Grant Flows
*(This solves the **`AADSTS700051`** token authorization error)*
1. Scroll down on the **Authentication** page to the section labeled **Implicit grant and hybrid flows**.
2. Check **both** checkboxes:
   *   [x] **Access tokens (used for implicit flows)**
   *   [x] **ID tokens (used for implicit and hybrid flows)**
3. Click the **Save** button.

### Step 4: Configure Client ID
1. Navigate back to the **Overview** page.
2. Copy the **Application (client) ID** GUID.
3. Paste this value into your `.env` file as `VITE_MICROSOFT_CLIENT_ID`.
4. Restart your development server (`npm run dev`) to apply.

---

## 📁 Updated Directory Structure Overview

```text
├── server/
│   ├── db.ts               # Database layer (Postgres connection pool & Local JSON Fallback DB)
│   ├── index.ts            # Express server entry point, routing hooks, and Vite middlewares
│   ├── server.ts           # Root server execution point
│   ├── middleware/
│   │   └── auth.ts         # Session JWT validation and role-based permissions gates
│   ├── shared/             # Shared validation models and constants
│   │   ├── constants/      # Shared status lists and permissions mapping
│   │   └── types/          # Express Request typings (AuthenticatedRequest)
│   └── modules/            # Isolated domain boundaries
│       ├── audit/          # Change tracking, JSON diff logs & aggregated reports
│       ├── bans/           # Safety bans, duration limits & active ban filters
│       ├── bookings/       # Overlap checks, submissions & override endpoints
│       ├── roles/          # Custom roles & privilege escalation rules
│       ├── rooms/          # Workspace capacities and hours configurations
│       └── users/          # SSO auth, Simulated Dev bypass and member indexing
├── src/
│   ├── app/                # Frontend main router, app contexts & page headers
│   ├── components/         # Highly stylized interactive layouts (Calendar, BookingForm, UsersManager, etc.)
│   ├── constants/          # Client-side statuses and systems configurations
│   ├── features/           # Component-specific sub-features
│   ├── types/              # Client-side schema definitions
│   ├── index.css           # Global custom styles and Tailwind variables
│   ├── main.tsx            # React root bootstrap element
│   └── App.tsx             # Universal layout and auth state managers
├── .env.example            # Environment variables placeholder definitions
├── index.html              # Main single-page application document
└── package.json            # Node project configuration and run scripts
```

---

## 🛠️ Production Build & Optimization

When compiling the application for high-performance server hosting, run:

```bash
# Clean previous builds and bundle both frontend & backend
npm run build

# Start the production bundle
npm run start
```

### Production Build Mechanics
*   `npm run build` initiates `vite build` to compile frontend assets into static HTML, CSS, and JS files inside the `dist/` directory.
*   Simultaneously, `esbuild` bundles the Node.js TypeScript backend server into a single, high-performance, self-contained CommonJS file at `dist/server.cjs`, minimizing server container filesystem I/O and boosting container cold-start speeds.

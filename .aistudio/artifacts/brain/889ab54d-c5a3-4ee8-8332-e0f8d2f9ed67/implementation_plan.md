# User Booking History & Request Details System

A comprehensive booking dossier and history tracking system for the Takhleeq Management Console and Public Portal. This feature enables administrative staff to inspect in-depth booking request details, view complete user historical dossiers (lifetime bookings, approval rates, cancellation habits, active bans), and provides users with a self-service "My Bookings" timeline tracker.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience decisions have been aligned based on user clarification:

- **Confirmed Decision 1 (Admin Access Point)**: Implement a dedicated, searchable **"User History"** back-office tab under Booking Operations in the admin sidebar, along with quick-access **User History Profile Modals** triggered directly from the Review Queue and Booking Register.
- **Confirmed Decision 2 (Dossier Analytics & History View)**: The user history view includes high-level summary KPIs (Total Bookings, Approved, Force-Rejected, Cancelled, Completion Rate), active restriction/ban indicators, and a chronologically sorted booking history table with quick actions.
- **Confirmed Decision 3 (Public Portal Self-Service)**: Expand the public `/track` route into a full-featured **"My Bookings Tracker"** allowing regular users to look up their entire booking history by email address, view booking receipts, and manage upcoming reservations.
- **Booking Request Inspection (User Question)**: Provide an explicit **"View Full Details"** modal in the Admin Review Queue and Booking Calendar Register, exposing all request metadata: event description, attendee count, department/cohort affiliation, room equipment, conflict logs, and audit trails.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Staff Booking Request Inspection**: Admins can open any incoming or existing space reservation request in a full modal to inspect comprehensive event metadata, requester notes, space setup, conflict diagnostics, and historical context.
  2. **Staff User History Dossier**: Admins can search any user by name, email, or department to inspect their lifetime reservation history, calculate reliability metrics (e.g., approval vs. cancellation ratio), identify frequent bookers, and cross-reference active bans.
  3. **Public Self-Service Tracker**: Requesters can enter their email address to retrieve all their upcoming and past reservations, view live approval status, download or review booking confirmation tokens, and cancel reservations compliant with cut-off policies.
- **Target Audience / Persona**:
  - *Operational Staff / Facilities Managers*: Need to verify whether an applicant has a history of cancellations or conflicting bookings before approving high-demand spaces.
  - *Incubator Founders & University Members*: Need a transparent view of all space bookings made under their email address with real-time status updates.
- **Key Value**: Eliminates administrative blind spots by making historical user behavior accessible during the review decision, while providing users with self-service booking transparency.

---

### 2. User Experience & Visual Design

#### Key User Flows

```
[Staff Review Queue / Register] ──(Click "View Details")──> [Booking Request Details Modal]
                                                                     │
                                                      (Click "View Requester History")
                                                                     │
                                                                     ▼
[Admin Sidebar] ──(Click "User History")───────> [User History Hub] ──> [User Profile Dossier Modal]
                                                        │                         │
                                                 (Live Search)             (Filter Bookings)
                                                        │                         │
                                                        ▼                         ▼
                                                [User Roster Table]       [User Booking History List]

[Public Header / Nav] ──(Click "My Bookings")─> [/track Self-Service] ──> [Email Lookup / Active User History]
```

#### Visual Identity & Theme
- **Design System Standards**: Complies with the SaaS Dashboard Constitution (`references/3_saas_dashboard.md`).
- **Color Budget (60-30-10)**:
  - `60% Neutral Canvas`: Pure crisp light slate/gray background (`bg-gray-50/50`, `bg-white`).
  - `30% Structural Surfaces`: Elevated 1px bordered surfaces (`border border-gray-200/80`), flat single-elevation depth.
  - `10% Accent Energy`: University Crimson brand token (`bg-primary`, `#800000` / `#990000`) for primary interactive actions, alongside emerald for approved states and amber for pending reviews.
- **Zero-Pill Discipline**: Metadata (timestamps, room capacities, reference IDs, departments) rendered as unboxed typography separated by quiet mid-dots (`·`) rather than nested colored pill capsules.
- **Tabular Figures**: All counts, percentages, dates, and times strictly formatted with `font-mono tabular-nums` to ensure zero layout jitter.
- **Typography**: Clean sans-serif hierarchy (`Plus Jakarta Sans` / `Outfit`) paired with monospace reference codes (`JetBrains Mono`).

#### Component Highlights
1. **Booking Details Modal (`BookingDetailModal.tsx`)**:
   - Clean header with status indicator and unique reference ID (`TBK-YYYY-XXX`).
   - Requester identification panel (Full Name, verified email, department, role, ban status check).
   - Space & schedule specifications (Room name, capacity, booking type, exact time slot, duration).
   - Event purpose & attendee count.
   - Action toolbar: Quick actions to Approve, Reject with reason, Override schedule, or jump directly to the user's booking history.
2. **User History Admin Page (`UserHistoryPage.tsx`)**:
   - Search bar with live multi-field filtering (Name, Email, Department).
   - Aggregated requester summary metrics: Total Requesters, Active Bookers This Month, Average Approval Rate.
   - Roster table with columns: Requester, Contact Email, Department/Role, Total Bookings, Lifetime Status (Approved / Rejected / Cancelled), Ban Status, and Action ("Open Dossier").
3. **User Profile Dossier Modal (`UserProfileHistoryModal.tsx`)**:
   - Quick header card with user avatar, name, email, department, and account status.
   - Metric strip: 4 tabular KPI cards showing Total Requests, Approved, Rejected/Cancelled, and Reliability Score.
   - Filterable timeline table of all bookings made by this user, with status filter tabs (`All`, `Upcoming`, `Past`, `Rejected/Cancelled`).
   - Option to launch the rejection or details modal directly for any specific booking in the list.
4. **Public My Bookings Tracker (`TrackPage.tsx` Enhancement)**:
   - Simplified email search input with auto-fill if the user is authenticated.
   - Summary statistics bar for the user's personal activity.
   - Grouped tabs for `Upcoming Bookings` vs `Past Reservations`.
   - Cancellation trigger modal with real-time policy validation and instant cancellation confirmation.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Aggregation vs. New Server Endpoints**:
  - *Chosen Approach*: Implement a dedicated backend route `GET /api/users/history` and `GET /api/users/:email/bookings` backed by SQL queries, while maintaining client-side reactive filtering for sub-millisecond response times.
  - *Why*: Enables instant searching across hundreds of historical bookings while offloading heavy aggregation (lifetime stats, status counts) to the server when necessary.
  - *Alternatives Considered*: Pure client-side filtering only on the current bookings state. While workable, it fails if bookings are paginated or if older historical bookings are archived. Dedicated endpoints ensure production resilience.
- **Decision 2: Universal Booking Details Modal Reuse**:
  - *Chosen Approach*: Create a shared `BookingDetailModal` usable across `StaffReviewQueue`, `BookingCalendarDashboard`, and the new `UserHistoryPage`.
  - *Why*: Eliminates code duplication, maintains consistent UX across all administrative workspaces, and gives staff identical inspection capabilities regardless of where they encounter a booking.
- **Decision 3: Seamless Cross-Linking Between Features**:
  - *Chosen Approach*: In every booking row and modal, clicking the user's name or the "User History" icon immediately opens that specific user's complete historical profile without losing the current review context.
  - *Why*: Dramatically streamlines staff review workflows—an administrator can verify a requester's track record in 1 click before confirming or rejecting a reservation.

---

### 4. Technical Architecture & Data Strategy

#### System & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Takhleeq Frontend (React)                          │
├───────────────────────────────────────┬─────────────────────────────────────────┤
│          Admin Back-Office            │             Public Portal               │
│                                       │                                         │
│  ┌─────────────────────────────────┐  │  ┌───────────────────────────────────┐  │
│  │ StaffLayout                     │  │  │ PublicLayout                      │  │
│  │ ├─ Sidebar Navigation           │  │  │ ├─ Header Navigation              │  │
│  │ │  └─ "User History" Tab        │  │  │ └─ "My Bookings" Tracker (/track) │  │
│  │ ├─ StaffReviewQueue             │  │  └─────────────────┬─────────────────┘  │
│  │ ├─ BookingCalendarDashboard     │  │                    │                    │
│  │ └─ UserHistoryPage (NEW)        │  │                    │                    │
│  │     ├─ Requesters Table         │  │                    ▼                    │
│  │     └─ Search & Metric Filters  │  │  ┌───────────────────────────────────┐  │
│  └────────────────┬────────────────┘  │  │ Enhanced TrackPage Component      │  │
│                   │                   │  │ ├─ Email / Token Lookup Bar       │  │
│                   ▼                   │  │ ├─ Personal KPI Summary Metrics   │  │
│  ┌─────────────────────────────────┐  │  │ ├─ Upcoming vs. Past Tabs         │  │
│  │ Shared Modals                   │  │  │ └─ Self-Service Cancellation      │  │
│  │ ├─ BookingDetailModal (NEW)     │  │  └───────────────────────────────────┘  │
│  │ ├─ UserProfileHistoryModal (NEW)│  │                                         │
│  │ └─ BookingRejectModal           │  │                                         │
│  └────────────────┬────────────────┘  │                                         │
└───────────────────┼───────────────────┴─────────────────────────────────────────┘
                    │
                    ▼ HTTP Fetch / REST API
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Express Server & Postgres DB                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│  GET /api/bookings                  -> Fetch all system bookings                │
│  GET /api/bookings/:id              -> Fetch specific booking details + audits  │
│  GET /api/users/history             -> Aggregate requesters & lifetime stats    │
│  GET /api/users/:email/bookings     -> Fetch full booking history for one user  │
│  POST /api/bookings/:id/reject      -> Force reject booking with reason         │
│  POST /api/bookings/:id/cancel      -> User or staff cancellation with policy   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Data Entities & State Contracts

```typescript
// Requester Historical Summary Profile
export interface UserHistorySummary {
  email: string;
  name: string;
  department?: string;
  totalBookings: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  cancelledCount: number;
  activeBan?: {
    reason: string;
    expiresAt: string;
    daysRemaining: number;
  } | null;
  firstBookingDate: string;
  lastBookingDate: string;
}

// User Profile Dossier State
export interface UserProfileDossier {
  user: UserHistorySummary;
  bookings: Booking[];
}
```

#### Interactive Handlers & Transitions
- **`onViewBookingDetails(booking)`**: Opens `BookingDetailModal` with full event metadata, conflict check, and direct navigation links.
- **`onViewUserHistory(email)`**: Opens `UserProfileHistoryModal` pre-populated with lifetime metrics and reservations for that individual.
- **`onSearchRequesters(query)`**: Real-time filtering across name, email, and department in `UserHistoryPage`.
- **`onPublicTrackSearch(emailOrToken)`**: Resolves personal bookings list with status tab switching in `TrackPage`.

# Takhleeq ERP - Module 02: Cohort Management & Tracking
## Complete System Architecture & Operational Specification (V1.0)

---

### Executive Summary & Alignment (Urdu/Hindi Context)
Boss, humne jitni bhi discussions ki hain, un sab ke gaps, business rules, enums, login mechanisms, aur application flows ko is single document mein consolidate kar diya hai. Is specification ko follow karke jab hum code likhenge, toh database design se lekar UI/UX tak koi compliance issue nahi aega. 

Aap is document ko direct view bhi kar sakte hain aur `/public/cohort-spec.html` ko browser mein open karke beautifully styled PDF format mein save/export bhi kar sakte hain.

---

## 1. Resolved Gaps & Structural Decisions

### A. Applicant Resubmission & Audit Trail (FRD §5.2.24 Compliance)
* **The Problem**: If an applicant is rejected but asked to modify and resubmit, reusing the same `Applicant` record would overwrite the previous status, timeline, and reviewer comments, violating the audit log integrity requirements.
* **The Resolution**:
  * **Linked-Chain Data Model**: Every fresh application submission (including resubmissions) creates a **new** record in the `applicants` table.
  * **Lineage Tracking**: A self-referential foreign key column `parent_applicant_id` will link the new submission to the previous one.
  * **Timeline Projection**: In the admin review panel, staff will see a unified "Submission History Timeline" grouping all versions under the same startup concept, while maintaining distinct review comments, dates, and scores for every single turn.

### B. "Accepted" vs. "Confirmed" Status Distinction
* **The Problem**: Confusing "Accepted" and "Confirmed" as a single state causes confusion during the onboarding/orientation window.
* **The Resolution**: They are treated as distinct sequential states in the state machine:
  1. **Accepted**: The startup evaluation panel has approved the startup, and the system sends an automated admission offer email.
  2. **Confirmed**: The startup team formally accepts the offer via the confirmation email link, triggering Microsoft Account creation.

### C. Cohort Status vs. Startup Program Status (The Isolation Principle)
To prevent UI/UX conflation (which FRD warns against), we strictly decouple these two state engines:
* **Cohort Status** (Global Temporal States):
  * `DRAFT` (Configuration phase)
  * `ACTIVE` (Ongoing sessions and tracking)
  * `COMPLETED` (Cohort has graduated, locked for editing except for historical audits)
* **Startup Program Status** (Individual Performance States):
  * `ACTIVE` (Default enrolled state)
  * `PAUSED` (Temporarily suspended, typically triggered during Warning workflow under review)
  * `GRADUATED` (Successfully completed program requirements)
  * `KICKED_OUT` (Formally dismissed due to unresolved warnings/conduct issues)

### D. Centralized Governance Center & Granular Permission Nodes (Unified ERP Architecture)
* **The Reuse Strategy**: Takhleeq ERP already has a centralized **Governance Center** on the admin side that manages roles and custom user permissions. Instead of creating a separate, hardcoded, or siloed access control layer for Module 02, we will directly **extend** this existing Governance engine.
* **Granular Permission Nodes**: We will register new, modular permission nodes under the existing database's permissions schema. Every feature in Module 02 will perform a strict node check before granting API/UI access.
  * **Intake & Applications**:
    * `cohort:form_manage` (Allows editing the Dynamic Form builder & availability)
    * `cohort:applicant_review` (Allows screening, score-entry, status updates)
  * **Cohort Operations**:
    * `cohort:session_manage` (Allows scheduling and deleting cohort sessions)
    * `cohort:attendance_write` (Allows marking daily startup attendance)
    * `cohort:checkin_log` (Allows entering team/mentor check-in structured notes)
    * `cohort:warning_write` (Allows issuing or resolving warning notifications)
  * **Student/Founder Actions (Delegated Permissions)**:
    * `cohort:profile_write` (Allows editing basic startup self-service fields)
    * `cohort:feedback_submit` (Allows submitting anonymous feedback reviews)
    * `cohort:assignment_upload` (Allows uploading files against deadlines)
* **Centralized Governance UI**: Through the existing Admin Governance Center, administrators will be able to check/uncheck these new cohort nodes for any role (such as a custom `PROGRAM_MANAGER` or basic `STAFF` profile), entirely avoiding permission leaks and code duplication.

---

## 2. Updated Lifecycle Flow (Enum Sync with Diagram)

We have added the two missing statuses from the flowchart diagram that were missing in the preliminary specifications:

```
[Applied] ──> [Screening] ──> [Selected for Presentation] ──> [Presentation Review]
                                                                     │
                                         ┌───────────────────────────┴───────────────────────────┐
                                         ▼                                                       ▼
                               [BACKUP_CANDIDATE] (Holding Pool)                              [Accepted]
                                         │                                                       │
                                         ▼                                                       ▼
                           (If space opens / email sent)                                    [Confirmed]
                                         │                                                       │
                                         └───────────────> [ORIENTATION_CONDUCTED] <─────────────┘
                                                                     │
                                                                     ▼
                                                              [ACTIVE COHORT]
                                                                     │
                                                   ┌─────────────────┴─────────────────┐
                                                   ▼                                   ▼
                                              [GRADUATED]                         [KICKED_OUT]
```

### New Status Definitions added to Enums:
1. **`BACKUP_CANDIDATE`**: An explicit holding state for qualified applicants who cannot fit into the initial cohort capacity limit. If a primary candidate withdraws or is a no-show, the system prompts the administrator to upgrade a backup candidate, triggering an automated space-opening offer email.
2. **`ORIENTATION_CONDUCTED`**: A lightweight stage represented in the startup profile history as a mandatory onboarding milestone (storing `orientation_date` and `attendance_notes`) before the startup program status transitions to `ACTIVE`.

### Auto-Graduation Business Rule (BR-COH-12 Compliance)
* **The Conflict**: Automatically graduating all startups once a cohort is marked `COMPLETED` violates **BR-COH-12** (only authorized staff may update startup statuses).
* **The Solution**: 
  * **The Bulk-Action Confirmation Modal**: When an Admin marks a cohort as `COMPLETED`, the system does **not** silently change statuses behind the scenes. Instead, it displays a compliance modal: *"You are about to complete the cohort. Would you like to bulk-graduate the remaining [X] Active startups?"* 
  * This ensures the action is explicit, authorized, logged in the audit trail with the administrator's ID, and fully compliant with BR-COH-12.

---

## 3. Core Operational Modules

### Module A: Admin Dynamic Application Form Builder
A powerful, code-free configuration panel inside the main ERP Admin Dashboard:
* **Form Availability Rules**:
  * **Always Visible to Admin**: The form configuration and fields builder are permanently visible, editable, and accessible to administrators.
  * **Manual Toggle Control**: Public access to the form is governed strictly by a single manual **ON/OFF Switch (Toggle)** in the Admin panel.
  * **No Automatic Schedules**: To avoid confusion and maintain absolute control, public submissions are allowed exclusively when this manual toggle is set to **ON**. If toggled **OFF**, the public page automatically renders a "Submissions Closed" status card.
* **Fields Editor**:
  * Dynamic JSON schema generation. Admins can add/delete fields with customizable validation types (e.g., Text, Email, CNIC, Roll Number, File Upload).
  * Seeded with baseline FRD questions (Startup Type, Business Model, Team Lead info, UCP Affiliation, CNIC, etc.).

### Module B: Public-Facing Applicant Status Lookup Portal
* **No-Login Needed**: Since unaccepted applicants do not have accounts yet, we keep their progress tracking completely separate from the core dashboard.
* **Secure Access**: Applicants receive a unique **Tracking ID** (e.g., `TK-2026-X892`) and access link on their registered email when they submit their application.
* **Real-time Tracker**: Displays a linear step-by-step progress visual:
  * `Applied` ──> `Screening` ──> `Presentation` ──> `Decision` (Accepted / Backup / Rejected).
  * If the status is "Resubmission Requested", it renders a customized upload box showing exact reviewer comments and changes needed to resubmit.

### Module C: Startup Identity & Microsoft SSO Authentication Flow
* **Unified Microsoft SSO**: To avoid maintaining complex, dual custom login engines, Takhleeq will provision official Microsoft accounts for accepted startups (e.g., `brandname@takhleeq.com`).
* **The Global Access Gate**:
  * All users log in through a single global sign-in screen.
  * **Normal booking users** (students, general faculty) are routed directly to the Room Booking screen. The Cohort Sidebar is completely hidden/locked for them.
  * **Cohort Startup Users** logging in with `@takhleeq.com` accounts are routed to their personal **Startup Self-Service Portal** while maintaining the right to request room bookings directly within the same session.

### Module D: Startup Self-Service & Progress Dashboard
A dedicated view for the enrolled startup founders:
* **Self-Service Profile Edit**: Upload logos, website URLs, and social links (restricted from editing staff-controlled fields like Stage or Program Status).
* **Assignments Desk**: View upcoming deadlines and upload deliverables (automatically flags submissions as `Late` if sent past the deadline).
* **Feedback Engine**: Anonymous feedback forms linked to completed sessions (Q1-Q7 rating scales on effectiveness, relevance, and qualitative notes).
* **Check-ins & Warnings Logs**: View upcoming mentor check-ins, recorded outcomes, and view/resolve active performance warnings.

---

## 4. Phase-by-Phase Implementation Roadmap

We will divide this massive module into 4 crisp, cohesive development sprints:

```
┌────────────────────────────────────────────────────────┐
│ PHASE 1: Core Database Schemas, SSO, & RBAC Gateway    │
├────────────────────────────────────────────────────────┤
│ PHASE 2: Dynamic Form Builder & Applicant Lookup Portal│
├────────────────────────────────────────────────────────┐
│ PHASE 3: Staff/Admin Workspace & Cohort Performance Hub│
├────────────────────────────────────────────────────────┤
│ PHASE 4: Startup Portal, Assignment engine & Reporting │
└────────────────────────────────────────────────────────┘
```

### Phase 1: Core Database Schemas, SSO, & RBAC Gateway
* Provision and seed Postgres tables with fully integrated roles and decoupled state columns.
* Establish routing guards based on Microsoft account domains.

### Phase 2: Dynamic Form Builder & Applicant Lookup Portal
* Develop the Admin Form Builder (Fields generator, date schedulers).
* Develop the Public Applicant Intake page and the secure Lookup Tracker page.

### Phase 3: Staff/Admin Workspace & Cohort Performance Hub
* Build the Cohort Dashboard: Session scheduler, Attendance loggers, check-in recorders, and the Warning Workflow meeting scheduler.
* Implement the manual bulk-action confirmation engine for graduating cohorts.

### Phase 4: Startup Portal, Assignment engine & Reports
* Create the Founder Dashboard, anonymous feedback system, and assignment uploader.
* Deploy reporting summaries (Investment Readiness charts, feedback metrics, and audit log history logs).

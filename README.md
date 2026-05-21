# HealthPass Insurance Panel

An Insurance Provider Portal built to seamlessly integrate with the HealthPass ecosystem. This application enables insurer partners to manage policyholders, process medical claims, run real-time AI-assisted fraud audits, query business intelligence metrics, and inspect system log trails.

---

The application is structured as a decoupled monorepo:
*   **Frontend**: React 19 web application powered by Vite, managed using Zustand for client-side state, styled using Tailwind CSS, and featuring smooth animations using Framer Motion and custom analytics widgets via Recharts.
*   **Backend**: Node.js API Gateway built with TypeScript and Express.js, utilizing Prisma ORM to interface with a SQLite transactional database.

---

##  Core Features

### 1. Interactive Executive Dashboard
*   Real-time aggregation of premium pipeline, active enrollment metrics, and claim queues.
*   Interactive distribution graphs depicting claim categories, claim values, and AI urgency rankings using Recharts.
*   Fast-access quick actions panel for claim processing and insurer configuration.

### 2. Claims Processing & Auditing Center
*   A robust, paginated and searchable Claim Registry containing diagnostic codes, requested amounts, and patient timelines.
*   Interactive Claim Detail Drawer containing:
    *   **AI Priority Ranking** & **Urgency Matrix** (Low / Medium / High / Critical).
    *   Dynamic timeline tracking audit logs.
    *   Ad-hoc decision tools (Approve, Query, Docs Pending, Reject).
    *   Document attachments viewer and interactive staff discussion board.

### 3. Sentinel AI Analytics & Chat Hub
*   **Real-time AI Chat Assistant**: An interactive chatbot interface that connects to live database endpoints. Allows staff to execute queries such as:
    *   *"List all recent claims"*
    *   *"Show me high risk fraud outliers"*
    *   *"What is our premium collection pipeline?"*
*   **AI Fraud Analytics Breakdown**: Automatically detects duplicate claims, consecutive file submittals within a 30-day window, and outlier medical invoice padding.

### 4. Policy & Enrollment Registry
*   Unified panel managing active, expired, suspended, and grace-period member policies.
*   Includes AI-predicted **renewal probabilities** for proactive customer success outreach.

### 5. Partner Settings & Audit Trails
*   Insurer profile management (API keys, support details, logo configurations).
*   Live security feeds containing session logs and administrative audit trails (`AuditLog` and `SessionLog`).

---

## Technology Stack

| Layer | Technology | Key Libraries / Frameworks |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Zustand, Framer Motion, Recharts, Axios, Tailwind CSS, Lucide Icons, React Router DOM v6 |
| **Backend** | Node.js, TypeScript | Express.js, JWT, bcryptjs, Prisma Client |
| **Database** | SQLite | Prisma ORM Schema & SQLite Database Engine |

---

## Repository Structure

```
Insurance Panel/
├── backend/
│   ├── prisma/
│   │   ├── migrations/      # SQL Database migrations
│   │   ├── dev.db           # SQLite local database file
│   │   └── schema.prisma    # Prisma relational model definition
│   ├── src/
│   │   ├── middleware/      # JWT Authentication & Authorization
│   │   ├── modules/         # Modular domain-driven design controllers
│   │   │   ├── ai/          # AI Chat assistant & fraud engines
│   │   │   ├── analytics/   # Analytics aggregation controllers
│   │   │   ├── auth/        # Login, registration, & MFA verification
│   │   │   ├── claims/      # Claim actions, status updates, & timelines
│   │   │   ├── insurer/     # Partner configuration endpoints
│   │   │   └── policies/    # Enrollment lists & renewal calculations
│   │   ├── app.ts           # Express routing and config setup
│   │   └── server.ts        # Server entry point listener
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/          # Static icons & mock documents
│   │   ├── layouts/         # App layouts (Dashboard/Auth Layout wrappers)
│   │   ├── pages/           # High-fidelity dashboard modules
│   │   │   ├── AIHub/       # AI Analytics and Sentinel Chat Assistant
│   │   │   ├── Auth/        # Enterprise SSO and Login Screen
│   │   │   ├── Claims/      # Interactive Claims Center Drawer & List
│   │   │   ├── Dashboard/   # Executive analytics visual widgets
│   │   │   ├── Policies/    # Member roster & probability meters
│   │   │   └── Settings/    # MFA, integrations, and Audit trail views
│   │   ├── store/           # Zustand state directories (auth, etc.)
│   │   ├── utils/           # Global Axios API clients and formatters
│   │   ├── App.tsx          # Client routing structure
│   │   └── index.css        # Tailored Tailwind configurations
│   ├── package.json
│   └── tailwind.config.js
```

---

##  Database Schema & Models

The SQLite database is managed using the [Prisma Schema](file:///c:/Users/Arpitha Medharametla/Downloads/Projects/Insurance Panel/backend/prisma/schema.prisma):

*   **`User`**: Admin/Audit/Claims staff user identities, roles, hashed passwords, and two-factor configurations.
*   **`InsurerProfile`**: Central partner parameters, integration endpoints, and secure API tokens.
*   **`Policy`**: Customer coverages, premium amounts, due dates, statuses, and AI-predicted renewal conversion probabilities.
*   **`Claim`**: Reimbursement records including requested amounts, diagnostics, custom staff threads (`comments`), historical changes (`timeline`), AI risk evaluations, and priority matrices.
*   **`AuditLog`**: Permanent log track record recording actions, IP addresses, client devices, and timestamps.
*   **`SessionLog`**: Live active sessions for administrators logging geographical login locations.

---

##  Setup & Installation

### Prerequisites
Make sure you have [Node.js (v18+)](https://nodejs.org/) installed on your machine.

---

### Step 1: Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   *   Copy the template env file:
       ```bash
       cp .env.example .env
       ```
   *   Verify that your `.env` contains:
       ```env
       DATABASE_URL="file:./dev.db"
       JWT_SECRET="your_jwt_secret_token_here_change_for_production"
       PORT=3000
       ```
4. Run the database migrations & seed initial database mock data:
   ```bash
   npm run prisma:setup
   ```
5. Start the development API server:
   ```bash
   npm run dev
   ```
   *   The server will start running on `http://localhost:3000`.

---

### Step 2: Frontend Setup
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite dev server:
   ```bash
   npm run dev
   ```
   *   The client application will run on `http://localhost:5173`.

---

## API Reference Roster

The backend server registers the following endpoint structure:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Register new portal administrative user | No |
| **POST** | `/api/auth/login` | Authenticate portal user and return JWT bearer | No |
| **GET** | `/api/auth/profile` | Read current administrative profile metadata | **Yes** |
| **GET** | `/api/claims` | List paginated claims with search queries | **Yes** |
| **PUT** | `/api/claims/:id` | Update claim statuses and append audit changes | **Yes** |
| **POST** | `/api/claims/:id/comments` | Add administrative threads to a claim record | **Yes** |
| **GET** | `/api/policies` | Retrieve member coverages & renewal factors | **Yes** |
| **GET** | `/api/ai/fraud-stats` | AI Fraud and duplicate submittal scanner metrics | **Yes** |
| **POST** | `/api/ai/chat-assistant` | Converse with the live Sentinel AI Agent | **Yes** |
| **GET** | `/api/analytics/kpis` | Dashboard statistics, category counts & chart data | **Yes** |
| **GET** | `/api/insurer/profile` | Fetch insurer integrations and partner params | **Yes** |

---

## 📝 License

This project is licensed under the MIT License. Refer to [LICENSE](LICENSE) for details.

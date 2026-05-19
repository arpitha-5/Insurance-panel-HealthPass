# Insurance Panel

This repository contains a full-stack Insurance Panel application with a backend (Node.js, TypeScript, Prisma) and a frontend (React, Vite, Tailwind CSS).

## Project Structure

```
backend/      # Node.js, TypeScript, Prisma backend
frontend/     # React, Vite, Tailwind CSS frontend
```

---

## Backend

- **Location:** `backend/`
- **Tech Stack:** Node.js, TypeScript, Express, Prisma ORM
- **Key Folders:**
  - `src/` - Application source code
    - `modules/` - Feature modules (AI, Analytics, Auth, Claims, Insurer, Policies)
    - `middleware/` - Express middleware
    - `prisma/` - Prisma seed scripts
  - `prisma/` - Prisma schema and migrations
- **Main Files:**
  - `app.ts`, `server.ts` - Entry points
  - `prisma/schema.prisma` - Database schema

### Setup
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

---

## Frontend

- **Location:** `frontend/`
- **Tech Stack:** React, Vite, TypeScript, Tailwind CSS
- **Key Folders:**
  - `src/pages/` - Main application pages (AIHub, Auth, Claims, Dashboard, Policies, Settings)
  - `src/layouts/` - Layout components
  - `src/store/` - State management
  - `src/utils/` - Utility functions
- **Main Files:**
  - `main.tsx`, `App.tsx` - Entry points

### Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Development

- Start backend and frontend servers separately.
- Backend runs on default port (e.g., 3000), frontend on Vite's default (e.g., 5173).
- Update `.env` files as needed for configuration.

---

## License

MIT

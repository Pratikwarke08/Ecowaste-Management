# Ecowaste Management System – Technical Overview & Workflow

> This document explains the overall workflow and the complete tech stack used in the Ecowaste project, including frontend, backend, database, and APIs.

---

## 1. High-Level Workflow

- **Step 1 – User Interaction (Frontend):**  
  Users (admin/staff) interact with the React-based web UI in the browser.

- **Step 2 – API Requests (Frontend → Backend):**  
  The frontend sends HTTP requests (mostly JSON) to the Express backend for actions like login, managing dustbins, viewing statistics, etc.

- **Step 3 – Business Logic (Backend):**  
  The backend validates requests, applies business rules (authentication, authorization, validation), and interacts with MongoDB via Mongoose models.

- **Step 4 – Database Operations (Backend ↔ MongoDB):**  
  Mongoose models read/write data (users, dustbins, records, etc.) from/to MongoDB.

- **Step 5 – Response Back to Frontend:**  
  The backend returns structured JSON responses, which the frontend uses to update UI state (tables, charts, maps, notifications, etc.).

---

## 2. Frontend Tech Stack

### 2.1 Core Technologies

- **React 18** (`react`, `react-dom`)  
  - Component-based UI for pages like dashboards, dustbin management, etc.  
  - Used with **TypeScript** for type safety across the codebase.

- **Vite** (`vite`, `@vitejs/plugin-react-swc`)  
  - Fast dev server and bundler for React + TypeScript.  
  - Handles hot module replacement (HMR) and optimized builds.

- **TypeScript** (`typescript`)  
  - Adds static typing to React components, hooks, and utilities.  
  - Reduces runtime errors and improves IDE support.

### 2.2 Styling & UI Components

- **Tailwind CSS** (`tailwindcss`, `postcss`, `autoprefixer`, `tailwindcss-animate`)  
  - Utility-first CSS framework used for rapid styling of layout, spacing, colors, and responsive behavior.  
  - Configured in `tailwind.config.ts` and used via class names directly in JSX/TSX.

- **shadcn/ui & Radix UI** (via `@radix-ui/react-*`, `class-variance-authority`, `tailwind-merge`, `cmdk`, etc.)  
  - Provides accessible, headless UI primitives (dialogs, dropdowns, navigation menus, inputs).  
  - shadcn-style components are implemented in `src/components` and styled using Tailwind.

- **Icons & Visuals** (`lucide-react`)  
  - Modern icon set for buttons, navigation, and status indicators.

### 2.3 Routing & State/Data Management

- **React Router** (`react-router-dom`)  
  - Client-side routing between pages in `src/pages` (e.g., dashboard, dustbins, login, reports).  
  - Defines routes in `App.tsx` or a dedicated routes file.

- **TanStack Query (React Query)** (`@tanstack/react-query`)  
  - Handles server state: fetching, caching, and updating API data.  
  - Typically used via custom hooks in `src/hooks` or `src/lib` for calling backend endpoints.

- **React Hook Form + Zod** (`react-hook-form`, `@hookform/resolvers`, `zod`)  
  - Used for building and validating forms (login, registration, dustbin forms, etc.).  
  - Zod schemas define validation rules, and the resolver integrates them with React Hook Form.

### 2.4 Mapping, Charts, and Utilities

- **Leaflet + React Leaflet** (`leaflet`, `react-leaflet`)  
  - Provides an interactive map component to visualize dustbin locations and zones (if used in your pages).  
  - Map tiles and markers are rendered inside React components.

- **Recharts** (`recharts`)  
  - Used for visualizing statistics (bar charts, line charts, pie charts) such as waste collected over time.

- **Date & Time Utilities** (`date-fns`, `react-day-picker`)  
  - For date selection components (filters, schedules) and formatting.

- **Notifications & Toasts** (`sonner`)  
  - Shows success/error messages for actions like saving data, login failures, etc.

- **Other helpers** (`clsx`, `tailwind-merge`)  
  - Clean conditional className construction and deduplication of Tailwind classes.

### 2.5 Frontend Implementation Flow (Step by Step)

1. **App bootstrap:**  
   - `main.tsx` renders `App.tsx` inside `ReactDOM.createRoot`.  
   - Global providers (React Router, React Query, theme providers) wrap the app.

2. **Routing:**  
   - `App.tsx` defines routes for pages in `src/pages` (e.g., `/login`, `/dashboard`, `/dustbins`).

3. **Authentication:**  
   - Login form uses `react-hook-form` + `zod` validation.  
   - On submit, it calls a backend `/auth/login`-style API using React Query or fetch/axios.  
   - Received JWT token is stored (e.g., in localStorage or memory) and attached to subsequent requests.

4. **Data Fetching:**  
   - Components use React Query hooks to call APIs like `/dustbins`, `/stats`, etc.  
   - Responses populate tables, charts, and map components.

5. **UI Rendering:**  
   - Tailwind classes plus shadcn/Radix components build the visual layout.  
   - Maps and charts show spatial and statistical data.

6. **User Actions:**  
   - Creating/updating entities (dustbins, routes, users) triggers POST/PUT requests.  
   - On success, React Query invalidates and refetches relevant queries to keep UI in sync.

---

## 3. Backend Tech Stack

### 3.1 Core Technologies

- **Node.js**  
  - JavaScript runtime environment used to run the backend server.

- **Express 5** (`express`)  
  - Web framework used to define API routes and middleware.

- **TypeScript** (`typescript`, `ts-node-dev`)  
  - Adds static typing to backend logic, models, and route handlers.  
  - `ts-node-dev` provides auto-reload during development with `npm run dev`.

### 3.2 Middleware & Utilities

- **CORS** (`cors`)  
  - Enables cross-origin requests from the frontend dev server / deployed frontend.

- **dotenv** (`dotenv`)  
  - Loads environment variables from `.env` (e.g., MongoDB URI, JWT secret, port).

- **Multer** (`multer`)  
  - Handles file uploads (e.g., images, documents) if used in modules like reports or user profiles.

### 3.3 Security & Authentication

- **bcryptjs** (`bcryptjs`)  
  - Password hashing for storing user passwords securely.

- **jsonwebtoken** (`jsonwebtoken`)  
  - Issues and verifies JWT tokens for authenticated API access.

- **Custom Middleware** (in `src/middleware`)  
  - Likely includes auth middleware to validate bearer tokens and attach user context to `req`.

### 3.4 Database Layer

- **MongoDB via Mongoose** (`mongoose`)  
  - ODM for defining schemas and models (e.g., `User`, `Dustbin`, `Record`, etc. in `src/models`).  
  - Handles validation, hooks, and easy query APIs.

### 3.5 Backend Implementation Flow (Step by Step)

1. **Server Entry Point** (`src/index.ts`):  
   - Imports Express, middleware (`cors`, JSON parser), environment configuration (`dotenv`).  
   - Connects to MongoDB using `mongoose.connect`.  
   - Registers route modules from `src/routes` (e.g., auth, dustbins, users, etc.).

2. **Routing:**  
   - Each file in `src/routes` defines endpoints for a specific domain (auth, waste, reports, etc.).  
   - Routes map HTTP methods and paths (e.g., `POST /auth/login`, `GET /dustbins`) to controller logic.

3. **Authentication Flow:**  
   - On login:  
     - Backend validates credentials against the `User` model.  
     - If valid, signs a JWT with user ID/role and returns it to the frontend.  
   - Protected routes use auth middleware to verify JWT and allow only authorized roles (e.g., admin vs staff).

4. **Business Logic:**  
   - Route handlers implement operations like:  
     - Create/update/delete dustbins.  
     - Record collection events.  
     - Generate statistics for dashboards.  
   - Mongoose models encapsulate schema validation and DB interactions.

5. **Error Handling:**  
   - Centralized error handlers send consistent JSON error responses (status, message, details) to the frontend.

6. **Development Workflow:**  
   - Run `npm run dev` in `backend/` to start an auto-reloading dev server.  
   - Use `.env` for configuration (port, database URI, JWT secret, etc.).

---

## 4. Database Design (MongoDB)

Although detailed E-R modeling belongs to the main report, technically the project uses:

- **MongoDB Collections** via Mongoose models:  
  - `users` – stores login credentials, roles (admin/staff), profile data.  
  - `dustbins` – stores bin location, capacity, fill-level status, and metadata.  
  - `records` / `logs` – tracks collection events, timestamps, and performance data.  
  - Additional domain-specific collections as per your models.

- **Indexes & Constraints:**  
  - Unique indexes on fields like email/username.  
  - References between collections using ObjectId fields.

---

## 5. API Design & Integration

### 5.1 REST API Style

- APIs are organized under logical route groups (e.g., `/auth`, `/users`, `/dustbins`, `/reports`).  
- Follows standard HTTP methods:  
  - `GET` – retrieve data.  
  - `POST` – create data / login.  
  - `PUT/PATCH` – update data.  
  - `DELETE` – remove data.

### 5.2 Request–Response Pattern

- **Request:**  
  - Frontend sends JSON payloads and JWT tokens (in headers) to backend.  
  - For file uploads, `multipart/form-data` is used with Multer.

- **Response:**  
  - Backend responds with JSON: `{ success, data, message }` pattern (or similar).  
  - Errors include HTTP status code and error message used for UI toasts.

### 5.3 Frontend Consumption

- APIs are called via:  
  - React Query hooks for automatic caching, invalidation, and loading/error states.  
  - Custom API helpers in `src/lib` (if present) to centralize base URLs and headers.

- Secure endpoints require attaching the JWT token to `Authorization: Bearer <token>` header.

---

## 6. Putting It All Together – End-to-End Example

1. **Login:**  
   - User opens login page.  
   - Frontend validates input and calls `POST /auth/login`.  
   - Backend verifies credentials, returns JWT on success.  
   - Frontend stores token and navigates to dashboard.

2. **Viewing Dustbins:**  
   - Dashboard component uses React Query to call `GET /dustbins`.  
   - Backend queries MongoDB for dustbins and returns the list.  
   - Frontend renders a table/list, map markers (via React Leaflet), and charts (via Recharts).

3. **Recording Collection / Update:**  
   - Staff triggers an action (e.g., mark dustbin collected).  
   - Frontend calls `POST /records` or `PUT /dustbins/:id`.  
   - Backend updates MongoDB and returns updated data.  
   - React Query invalidates queries to refresh dashboard stats.

---

## 7. How to Run (Typical Setup)

> Adjust exact commands according to your environment.

- **Frontend:**  
  1. `cd frontend`  
  2. `npm install`  
  3. `npm run dev`  
  4. Open browser at the dev URL (e.g., `http://localhost:5173`).

- **Backend:**  
  1. `cd backend`  
  2. `npm install`  
  3. Configure `.env` (MongoDB URI, JWT secret, port).  
  4. `npm run dev` to start the API server.

- **Integration:**  
  - Ensure frontend environment points to backend base URL (e.g., in `frontend/.env.local`).

---

## 8. Summary of Tech Choices – Why These Stacks?

- **React + Vite + TypeScript:**  
  - Fast development, strong typing, and component reusability for a complex dashboard-style UI.

- **Tailwind CSS + shadcn/Radix UI:**  
  - Rapid, consistent, and responsive design with reusable, accessible components.

- **React Query:**  
  - Simplifies API data fetching and caching, essential for a data-heavy app like Ecowaste.

- **Express + TypeScript Backend:**  
  - Well-known, minimalist, and flexible framework with strong ecosystem support.  
  - TypeScript reduces runtime errors and clarifies data contracts.

- **MongoDB + Mongoose:**  
  - Document database fits well with semi-structured waste management data and rapid iteration.

- **JWT Authentication:**  
  - Stateless authentication suitable for SPAs and scalable deployments.

This README should give a complete, step-by-step understanding of how the frontend, backend, database, and APIs work together in your Ecowaste project.

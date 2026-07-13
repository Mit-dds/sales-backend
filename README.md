# Property Sales Backend API

Node.js + Express + Prisma + PostgreSQL backend for Shujjaudin Property Sales.

## Setup

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment: copy `.env.example` to `.env` and update values.

3. Run database migration:
   ```bash
   npx prisma migrate dev
   ```

4. Start dev server:
   ```bash
   npm run dev
   ```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register new agent account |
| POST | `/api/auth/login` | No | Login by email or phone |
| GET | `/api/auth/me` | Yes | Get current user profile |
| POST | `/api/auth/logout` | Yes | Logout (invalidates client token) |
| GET | `/api/health` | No | Health check |

## API Docs

Swagger UI available at [http://localhost:3001/api-docs/](http://localhost:3001/api-docs/)

Raw spec: [http://localhost:3001/api/swagger.json](http://localhost:3001/api/swagger.json)

All responses follow the shape:
- Success: `{ success: true, data?, message? }`
- Error: `{ success: false, message }`



To seed an admin: npm run prisma:seed

To start: npm run dev (nodemon, port 3001)# sales-backend

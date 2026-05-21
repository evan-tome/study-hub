# study-hub
Create and discover study sessions for your courses at Ontario Tech University

## Project Structure

This is a full-stack monorepo with the following structure:

```
├── backend/          # Express.js API server (TypeScript)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── frontend/         # Angular web application
│   ├── src/
│   ├── package.json
│   └── angular.json
└── README.md
```

## Setup

### Prerequisites
- Node.js (v18+)
- npm (v10+)

### Installation

```bash
# Install dependencies for both frontend and backend
npm run install-all
```

Or install separately:
```bash
cd backend && npm install
cd ../frontend && npm install
```

## Development

### Run Both Frontend and Backend
```bash
npm run dev
```

This will start:
- **Backend API** on `http://localhost:3000`
- **Frontend** on `http://localhost:4200` (default Angular dev server)

### Run Individually

Backend only:
```bash
npm run backend:dev
```

Frontend only:
```bash
npm run frontend:start
```

## Build

```bash
# Build both frontend and backend
npm run build

# Build individually
npm run backend:build
npm run frontend:build
```

## API Communication

The frontend is configured to communicate with the backend API:
- **Development**: Proxy configured in `frontend/proxy.conf.json` routes `/api` requests to `http://localhost:3000`
- **Production**: Update environment configuration in `frontend/src/environments/environment.prod.ts`

## Frontend Configuration

Environment files for API URLs:
- `frontend/src/environments/environment.ts` - Development
- `frontend/src/environments/environment.prod.ts` - Production

## Backend Configuration

Copy `.env.example` to `.env` and configure as needed:
```bash
cp backend/.env.example backend/.env
```

The backend runs on port 3000 by default and provides:
- Health check endpoint: `GET /api/health`

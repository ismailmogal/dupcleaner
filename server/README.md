# OneDrive Duplicate Finder BFF

Backend for Frontend (BFF) server for the OneDrive Duplicate Finder application.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp env.example .env
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## Available Endpoints

- `GET /health` - Health check
- `GET /api` - API information

## Development

- **Start server:** `npm run dev` (with nodemon)
- **Start server:** `npm start` (without nodemon)

## Architecture

This BFF serves as a secure bridge between the React frontend and Microsoft Graph API, providing:

- Secure token handling
- API orchestration
- Caching
- Error handling 
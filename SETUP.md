# Quick Setup Guide

## Step 1: Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:
```
GEMINI_API_KEY=your_gemini_api_key_here
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=amazon_ai
DB_PORT=5432
PORT=5000
```

Make sure PostgreSQL is running and create the database:
```sql
CREATE DATABASE amazon_ai;
```

Then start the backend:
```bash
npm start
```

## Step 2: Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Step 3: Test the Application

1. Open http://localhost:3000
2. Enter an Amazon ASIN (e.g., B08N5WRWNW)
3. Click "Search"
4. Review the fetched data
5. Click "Optimize Now" to generate AI-optimized content
6. View the side-by-side comparison

## Troubleshooting

- **PostgreSQL Connection Error**: Make sure PostgreSQL is running and credentials are correct. The database must exist before starting the server.
- **Gemini API Error**: Verify your API key is valid and you have quota in Google AI Studio
- **Scraping Fails**: Amazon may block requests. Try a different ASIN or check your internet connection


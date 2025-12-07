# Amazon Product Listing Optimizer

A web application that uses AI (Google Gemini 1.5 Flash) to optimize Amazon product listings by improving titles, bullet points, descriptions, and suggesting relevant keywords.

## Features

- **Product Fetching**: Enter an Amazon ASIN to automatically fetch product details (title, bullet points, description) from Amazon's product page
- **AI Optimization**: Uses Google Gemini 1.5 Flash to generate optimized, keyword-rich content that's both readable and compliant with Amazon's guidelines
- **Side-by-Side Comparison**: View original and optimized versions side-by-side for easy comparison
- **History Tracking**: All fetched and optimized data is stored in PostgreSQL database for tracking improvements over time
- **Clean UI**: Simple, Amazon-style interface with clean spacing and intuitive design

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React
- **Database**: PostgreSQL
- **AI**: Google Gemini 1.5 Flash API
- **Scraping**: Cheerio + Axios

## Project Structure

```
.
├── backend/
│   ├── api/
│   ├── product/
│   │     └── [asin].js
│   └── optimize.js
│
|   ├── db.js
|   ├── scraper.js
|   ├── gemini.js
|   ├── package.json
|   └── .env  
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchBar.jsx
│   │   │   ├── ProductForm.jsx
│   │   │   ├── SideBySideView.jsx
│   │   │   ├── Loader.jsx
│   │   │   └── ErrorMessage.jsx
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── public/
│   └── package.json
|   ├── .env.local
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Google Gemini API key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Update `.env` with your credentials:
```
GEMINI_API_KEY=your_gemini_api_key_here
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=amazon_ai
DB_PORT=5432
PORT=5000
```

5. Make sure PostgreSQL is running and create the database (the app will create tables automatically):
```sql
CREATE DATABASE amazon_ai;
```

6. Start the backend server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000` and automatically proxy API requests to the backend.

## Database Schema

### Table 1: `original_listings`
Stores the original product data fetched from Amazon.

| Column | Type | Description |
|--------|------|-------------|
| asin | VARCHAR(20) PRIMARY KEY | Amazon ASIN |
| title | TEXT | Product title |
| bullets | TEXT | JSON array of bullet points |
| description | TEXT | Product description |
| created_at | TIMESTAMP | Timestamp of creation |

### Table 2: `optimized_listings`
Stores the AI-optimized product data.

| Column | Type | Description |
|--------|------|-------------|
| asin | VARCHAR(20) PRIMARY KEY | Amazon ASIN (foreign key) |
| opt_title | TEXT | Optimized title |
| opt_bullets | TEXT | JSON array of optimized bullet points |
| opt_description | TEXT | Optimized description |
| keywords | TEXT | Comma-separated keyword suggestions |
| created_at | TIMESTAMP | Timestamp of optimization |

## API Endpoints

### GET `/api/product/:asin`
Fetches product data for a given ASIN.

**Behavior:**
- If ASIN exists in database → returns both original and optimized data
- If ASIN not found → scrapes Amazon product page and returns only original data

**Response:**
```json
{
  "original": {
    "title": "...",
    "bullets": ["...", "..."],
    "description": "..."
  },
  "optimized": {
    "opt_title": "...",
    "opt_bullets": ["...", "..."],
    "opt_description": "...",
    "keywords": "..."
  } // or null if not optimized yet
}
```

### POST `/api/optimize`
Optimizes product listing using AI.

**Request Body:**
```json
{
  "asin": "B08N5WRWNW",
  "title": "...",
  "bullets": ["...", "..."],
  "description": "..."
}
```

**Response:**
```json
{
  "optimized": {
    "opt_title": "...",
    "opt_bullets": ["...", "..."],
    "opt_description": "...",
    "keywords": "..."
  }
}
```

## How It Works

### Step 1: Search
User enters an ASIN in the search bar and clicks "Search".

### Step 2: Backend Processing
- Backend checks PostgreSQL database for existing data
- If found → returns stored original + optimized data
- If not found → scrapes Amazon product page using Cheerio
- Saves original data to database
- Returns original data to frontend

### Step 3: Frontend Display
- If optimized data exists → shows side-by-side comparison view
- If no optimized data → shows editable form with fetched data and "Optimize Now" button

### Step 4: Optimization
- User reviews/edits the form data and clicks "Optimize Now"
- Frontend sends data to backend
- Backend calls Gemini API with optimized prompt
- AI generates improved title, bullet points, description, and keywords
- Backend saves both original and optimized data to PostgreSQL
- Returns optimized data to frontend

### Step 5: Comparison View
- Frontend displays original vs optimized content side-by-side
- Shows suggested keywords as tags

## AI Prompt Strategy

The application uses a carefully crafted prompt that instructs GPT-4 to:
1. **Optimize titles** to be keyword-rich while maintaining readability (under 200 characters)
2. **Rewrite bullet points** to be clear, concise, and compelling (5-7 points)
3. **Enhance descriptions** to be persuasive yet compliant with Amazon's guidelines
4. **Suggest keywords** that are relevant and searchable (3-5 keywords)

The prompt emphasizes:
- Keyword optimization without keyword stuffing
- Readability and user experience
- Amazon compliance
- Structured JSON response format

## UI Design

- **Color Scheme**: White background, light gray cards, blue buttons (#0066cc)
- **Layout**: Clean spacing, Amazon-style formatting
- **Components**: 
  - Sticky search bar at top
  - Editable form for original data
  - Side-by-side comparison cards
  - Loading states and error messages

## Troubleshooting

### Scraping Issues
Amazon may block requests. If scraping fails:
- Check your internet connection
- Verify the ASIN is correct
- Amazon may have rate limiting or bot detection

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify database credentials in `.env`
- Check that the database `amazon_ai` exists (create it manually: `CREATE DATABASE amazon_ai;`)

### Gemini API Issues
- Verify your API key is correct in `.env`
- Check your Google AI Studio account has sufficient quota
- Ensure you have access to Gemini 1.5 Flash model

## Future Enhancements

- Add authentication for multi-user support
- Implement optimization history timeline
- Add export functionality (CSV, JSON)
- Support for multiple marketplaces (UK, DE, etc.)
- A/B testing capabilities
- Keyword research integration

## License

This project is for educational and evaluation purposes.


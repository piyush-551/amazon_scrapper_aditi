const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables first
dotenv.config();

// Verify required environment variables
if (!process.env.GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is missing from .env file');
  console.error('Please add GEMINI_API_KEY=your_key_here to your .env file');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection - PostgreSQL
let pool;

// Initialize database connection
async function initDB() {
  try {
    // PostgreSQL connection config
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'amazon_ai',
      port: process.env.DB_PORT || 5432,
    };

    // Create connection pool
    pool = new Pool({
      ...dbConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    // Create tables
    await createTables();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    console.error('Make sure PostgreSQL is running and the database exists.');
    console.error('You can create the database with: CREATE DATABASE amazon_ai;');
    process.exit(1);
  }
}

// Create database tables
async function createTables() {
  const client = await pool.connect();
  try {
    // Original listings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS original_listings (
        asin VARCHAR(20) PRIMARY KEY,
        title TEXT,
        bullets TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Optimized listings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS optimized_listings (
        asin VARCHAR(20) PRIMARY KEY,
        opt_title TEXT,
        opt_bullets TEXT,
        opt_description TEXT,
        keywords TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tables created/verified successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Scrape Amazon product page
async function scrapeAmazonProduct(asin) {
  try {
    const amazonUrl = `https://www.amazon.com/dp/${asin}`;

    const scraperUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${amazonUrl}`;
  
    
    // Use a user agent to avoid blocking
    const response = await axios.get(scraperUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000,
    });

    console.log('response',response.data);
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract title
    const title = $('#productTitle').text().trim() || 
                  $('h1.a-size-large').text().trim() ||
                  $('span#productTitle').text().trim() ||
                  '';

    // Extract bullet points
    const bullets = [];
    $('#feature-bullets ul li span.a-list-item').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && !text.includes('Make sure') && !text.includes('See more')) {
        bullets.push(text);
      }
    });

    // If no bullets found, try alternative selectors
    if (bullets.length === 0) {
      $('#feature-bullets ul li').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && !text.includes('Make sure') && !text.includes('See more')) {
          bullets.push(text);
        }
      });
    }

    // Extract description
    let description = '';
    
    // Try different selectors for description
    const descSelectors = [
      '#productDescription p',
      '#feature-bullets + div p',
      '#productDescription_feature_div p',
      '.productDescriptionWrapper p',
    ];

    for (const selector of descSelectors) {
      const descText = $(selector).first().text().trim();
      if (descText) {
        description = descText;
        break;
      }
    }

    // If still no description, try to get all paragraphs
    if (!description) {
      description = $('#productDescription').text().trim() || 
                    $('.productDescriptionWrapper').text().trim() || '';
    }

    return {
      title: title || 'Title not found',
      bullets: bullets.length > 0 ? bullets : ['No bullet points found'],
      description: description || 'Description not found',
    };
  } catch (error) {
    console.error('Scraping error:', error.message);
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}

// Initialize Gemini (lazy initialization)
let genAI;
function getGeminiClient() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    const apiKey = process.env.GEMINI_API_KEY.trim();
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('GEMINI_API_KEY is not properly configured. Please set a valid API key in your .env file');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Optimize product listing using Gemini
async function optimizeListing(originalData) {
  try {
    const prompt = `You are an expert Amazon product listing optimizer. Optimize the following Amazon product listing to be more keyword-rich, readable, and persuasive while staying compliant with Amazon's guidelines.

Original Title:
${originalData.title}

Original Bullet Points:
${originalData.bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Original Description:
${originalData.description}

Please provide:
1. An improved title (keyword-rich, readable, under 200 characters)
2. Rewritten bullet points (clear, concise, 5-7 points)
3. Enhanced description (persuasive, compliant, well-structured)
4. 3-5 new keyword suggestions (comma-separated)

IMPORTANT: You must respond with ONLY valid JSON, no additional text or markdown formatting. Format your response as JSON:
{
  "opt_title": "optimized title here",
  "opt_bullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"],
  "opt_description": "optimized description here",
  "keywords": "keyword1, keyword2, keyword3, keyword4, keyword5"
}`;

    const genAI = getGeminiClient();
    
    // Try different model names in order of preference (gemini-pro is most widely available)
    const modelNames = ['gemini-2.5-flash'];
    let result;
    let lastError;
    
    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(prompt);
        console.log(`Successfully used model: ${modelName}`);
        break;
      } catch (error) {
        console.log(`Model ${modelName} failed, trying next...`);
        lastError = error;
        continue;
      }
    }
    
    if (!result) {
      throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}. Please verify your GEMINI_API_KEY is valid and has access to Gemini models.`);
    }
    const response = await result.response;
    const responseText = response.text().trim();
    
    // Extract JSON from response (in case there's extra text or markdown)
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to find JSON if wrapped in code blocks
      jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                  responseText.match(/```\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonMatch = [jsonMatch[0], jsonMatch[1]];
      }
    }
    
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini - no JSON found');
    }

    const jsonString = jsonMatch[0].replace(/```json\s*|\s*```/g, '');
    const optimized = JSON.parse(jsonString);

    // Validate and format the response
    return {
      opt_title: optimized.opt_title || originalData.title,
      opt_bullets: Array.isArray(optimized.opt_bullets) 
        ? optimized.opt_bullets 
        : [optimized.opt_bullets || ''],
      opt_description: optimized.opt_description || originalData.description,
      keywords: optimized.keywords || '',
    };
  } catch (error) {
    console.error('Gemini optimization error:', error.message);
    throw new Error(`Failed to optimize listing: ${error.message}`);
  }
}

// GET /api/product/:asin
app.get('/api/product/:asin', async (req, res) => {
  try {
    const { asin } = req.params;
    const client = await pool.connect();

    try {
      // Check if ASIN exists in database
      console.log('checking if asin exists in database');
      const originalResult = await client.query(
        'SELECT * FROM original_listings WHERE asin = $1',
        [asin]
      );

      const optimizedResult = await client.query(
        'SELECT * FROM optimized_listings WHERE asin = $1',
        [asin]
      );

      if (originalResult.rows.length > 0) {
        // Return both original and optimized if available
        return res.json({
          original: {
            title: originalResult.rows[0].title,
            bullets: JSON.parse(originalResult.rows[0].bullets || '[]'),
            description: originalResult.rows[0].description,
          },
          optimized: optimizedResult.rows.length > 0 ? {
            opt_title: optimizedResult.rows[0].opt_title,
            opt_bullets: JSON.parse(optimizedResult.rows[0].opt_bullets || '[]'),
            opt_description: optimizedResult.rows[0].opt_description,
            keywords: optimizedResult.rows[0].keywords,
          } : null,
        });
      } else {
        // Scrape product page
        const scrapedData = await scrapeAmazonProduct(asin);
        console.log('screaped data',scrapedData);
        
        // Save original data to database
        await client.query(
          'INSERT INTO original_listings (asin, title, bullets, description) VALUES ($1, $2, $3, $4)',
          [asin, scrapedData.title, JSON.stringify(scrapedData.bullets), scrapedData.description]
        );


        return res.json({
          original: scrapedData,
          optimized: null,
        });
      }
    } finally {
      console.log('client released');
      client.release();
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch product' });
  }
});

// POST /api/optimize
app.post('/api/optimize', async (req, res) => {
  try {
    const { asin, title, bullets, description } = req.body;

    if (!asin || !title || !bullets || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const originalData = {
      title,
      bullets: Array.isArray(bullets) ? bullets : [bullets],
      description,
    };

    // Optimize using Gemini
    const optimized = await optimizeListing(originalData);

    const client = await pool.connect();
    try {
      // Update original listing if needed (PostgreSQL uses ON CONFLICT instead of ON DUPLICATE KEY UPDATE)
      await client.query(
        `INSERT INTO original_listings (asin, title, bullets, description) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (asin) 
         DO UPDATE SET title = $2, bullets = $3, description = $4`,
        [
          asin,
          title,
          JSON.stringify(Array.isArray(bullets) ? bullets : [bullets]),
          description,
        ]
      );

      // Save optimized listing
      await client.query(
        `INSERT INTO optimized_listings (asin, opt_title, opt_bullets, opt_description, keywords) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (asin) 
         DO UPDATE SET opt_title = $2, opt_bullets = $3, opt_description = $4, keywords = $5`,
        [
          asin,
          optimized.opt_title,
          JSON.stringify(optimized.opt_bullets),
          optimized.opt_description,
          optimized.keywords,
        ]
      );

      return res.json({
        optimized: {
          opt_title: optimized.opt_title,
          opt_bullets: optimized.opt_bullets,
          opt_description: optimized.opt_description,
          keywords: optimized.keywords,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error optimizing product:', error);
    res.status(500).json({ error: error.message || 'Failed to optimize product' });
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});


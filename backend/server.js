const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load .env
dotenv.config();

// Validate Gemini API Key
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY missing in .env");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// -------------------------------------
//  MYSQL CONNECTION (REPLACES POSTGRES)
// -------------------------------------
let pool;

async function initDB() {
  try {
    pool = await mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "user",
      password: process.env.DB_PASSWORD || "password",
      database: process.env.DB_NAME || "mydb",
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const conn = await pool.getConnection();
    await conn.query("SELECT 1");
    conn.release();

    await createTables();
    console.log("MySQL connected & tables ready");
  } catch (err) {
    console.error("MySQL connection error:", err);
    process.exit(1);
  }
}

// -------------------------------------
// ⭐ CREATE TABLES (MySQL Syntax)
// -------------------------------------
async function createTables() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS original_listings (
        asin VARCHAR(20) PRIMARY KEY,
        title TEXT,
        bullets JSON,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS optimized_listings (
        asin VARCHAR(20) PRIMARY KEY,
        opt_title TEXT,
        opt_bullets JSON,
        opt_description TEXT,
        keywords TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("MySQL tables created");
  } finally {
    conn.release();
  }
}

// -------------------------------------
// ⭐ AMAZON SCRAPER
// -------------------------------------
async function scrapeAmazonProduct(asin) {
  try {
    const amazonUrl = `https://www.amazon.com/dp/${asin}`;
    const scraperUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${amazonUrl}`;

    const response = await axios.get(scraperUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    const title =
      $("#productTitle").text().trim() ||
      $("h1.a-size-large").text().trim() ||
      "";

    const bullets = [];
    $("#feature-bullets ul li span.a-list-item").each((i, el) => {
      const t = $(el).text().trim();
      if (t) bullets.push(t);
    });

    let description =
      $("#productDescription").text().trim() ||
      $(".productDescriptionWrapper").text().trim() ||
      "";

    return {
      title: title || "Not found",
      bullets: bullets.length ? bullets : ["No bullet points found"],
      description: description || "Description not found",
    };
  } catch (err) {
    console.error("Scrape error:", err);
    throw new Error("Failed to scrape Amazon product");
  }
}

// -------------------------------------
// GEMINI CLIENT
// -------------------------------------
let genAI;

function getGeminiClient() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

// -------------------------------------
// OPTIMIZE LISTING USING GEMINI
// -------------------------------------
async function optimizeListing(originalData) {
  try {
    const genAI = getGeminiClient();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are an expert Amazon listing optimizer.

Original Title:
${originalData.title}

Original Bullets:
${originalData.bullets.join("\n")}

Original Description:
${originalData.description}

Return ONLY valid JSON:
{
  "opt_title": "",
  "opt_bullets": [],
  "opt_description": "",
  "keywords": ""
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Gemini returned no JSON");

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error("Gemini error: " + err.message);
  }
}

// -------------------------------------
// GET PRODUCT BY ASIN
// -------------------------------------
app.get("/api/product/:asin", async (req, res) => {
  const asin = req.params.asin;
  const conn = await pool.getConnection();

  try {
    const [original] = await conn.query(
      "SELECT * FROM original_listings WHERE asin = ?",
      [asin]
    );

    // console.log('original', original);

    const [optimized] = await conn.query(
      "SELECT * FROM optimized_listings WHERE asin = ?",
      [asin]
    );

    // console.log('optimized', optimized);

    if (original.length > 0) {
      return res.json({
        original: {
          title: original[0].title,
          bullets: original[0].bullets,       // ← REMOVE JSON.parse
          description: original[0].description,
        },
        optimized: optimized.length
          ? {
              opt_title: optimized[0].opt_title,
              opt_bullets: optimized[0].opt_bullets, // ← REMOVE JSON.parse
              opt_description: optimized[0].opt_description,
              keywords: optimized[0].keywords,
            }
          : null,
      });
    }

    console.log('no data in table');
    // Not found → scrape Amazon
    const scraped = await scrapeAmazonProduct(asin);

    await conn.query(
      "INSERT INTO original_listings (asin, title, bullets, description) VALUES (?, ?, ?, ?)",
      [asin, scraped.title, JSON.stringify(scraped.bullets), scraped.description]
    );

    res.json({ original: scraped, optimized: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// OPTIMIZE ENDPOINT
// -------------------------------------
app.post("/api/optimize", async (req, res) => {
  const { asin, title, bullets, description } = req.body;

  if (!asin || !title || !bullets || !description)
    return res.status(400).json({ error: "Missing fields" });

  const conn = await pool.getConnection();

  try {
    const optimized = await optimizeListing({
      title,
      bullets,
      description,
    });

    // Insert/update original
    await conn.query(
      `INSERT INTO original_listings (asin, title, bullets, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=?, bullets=?, description=?`,
      [
        asin,
        title,
        JSON.stringify(bullets),
        description,
        title,
        JSON.stringify(bullets),
        description,
      ]
    );

    // Insert/update optimized
    await conn.query(
      `INSERT INTO optimized_listings (asin, opt_title, opt_bullets, opt_description, keywords)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE opt_title=?, opt_bullets=?, opt_description=?, keywords=?`,
      [
        asin,
        optimized.opt_title,
        JSON.stringify(optimized.opt_bullets),
        optimized.opt_description,
        optimized.keywords,

        optimized.opt_title,
        JSON.stringify(optimized.opt_bullets),
        optimized.opt_description,
        optimized.keywords,
      ]
    );

    res.json({ optimized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// START SERVER + INIT DB
// -------------------------------------
initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
});

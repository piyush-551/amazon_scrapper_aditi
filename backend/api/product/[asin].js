import { getDB } from "../../../db";
import { scrapeAmazonProduct } from "../../../scraper";

export default async function handler(req, res) {
  const { asin } = req.query;

  try {
    const pool = await getDB();
    const conn = await pool.getConnection();

    const [original] = await conn.query(
      "SELECT * FROM original_listings WHERE asin = ?",
      [asin]
    );

    const [optimized] = await conn.query(
      "SELECT * FROM optimized_listings WHERE asin = ?",
      [asin]
    );

    conn.release();

    if (original.length > 0) {
      return res.status(200).json({
        original: {
          title: original[0].title,
          bullets: original[0].bullets,
          description: original[0].description,
        },
        optimized: optimized.length
          ? {
              opt_title: optimized[0].opt_title,
              opt_bullets: optimized[0].opt_bullets,
              opt_description: optimized[0].opt_description,
              keywords: optimized[0].keywords,
            }
          : null,
      });
    }

    const scraped = await scrapeAmazonProduct(asin);

    await pool.query(
      "INSERT INTO original_listings (asin, title, bullets, description) VALUES (?, ?, ?, ?)",
      [asin, scraped.title, JSON.stringify(scraped.bullets), scraped.description]
    );

    return res.status(200).json({ original: scraped, optimized: null });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

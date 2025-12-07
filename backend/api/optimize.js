import { getDB } from "../db";
import { optimizeListing } from "../gemini";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { asin, title, bullets, description } = req.body;

  if (!asin || !title || !bullets || !description)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const pool = await getDB();

    const optimized = await optimizeListing({
      title,
      bullets,
      description,
    });

    await pool.query(
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

    await pool.query(
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

    return res.status(200).json({ optimized });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

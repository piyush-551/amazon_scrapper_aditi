import mysql from "mysql2/promise";

let pool;

export async function getDB() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
    });

    await createTables();
  }
  return pool;
}

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
  } finally {
    conn.release();
  }
}

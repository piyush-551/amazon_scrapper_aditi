import express from "express";
import dotenv from "dotenv";
import productHandler from "./api/product/[asin].js";
import optimizeHandler from "./api/optimize.js";

dotenv.config();
const app = express();
app.use(express.json());

// local CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Map to serverless functions
app.get("/api/product/:asin", (req, res) => productHandler(req, res));
app.post("/api/optimize", (req, res) => optimizeHandler(req, res));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Local server running on port", PORT));

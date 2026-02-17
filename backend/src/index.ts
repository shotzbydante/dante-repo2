/**
 * Ad Brief API - Express server
 */

import "dotenv/config";
import express from "express";
import { handleGenerate } from "./api.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.options("/api/generate", (_, res) => res.sendStatus(204));
app.post("/api/generate", handleGenerate);

app.listen(PORT, () => {
  console.log(`Ad Brief API on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log("(Mock mode: OPENAI_API_KEY not set, using deterministic output)");
  }
});

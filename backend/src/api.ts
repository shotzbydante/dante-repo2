/**
 * POST /api/generate - accepts { url }, fetches, extracts, generates
 */

import type { Request, Response } from "express";
import { isValidUrl } from "./validate.js";
import { fetchAndExtract } from "./extract.js";
import {
  generateWithLLM,
  getMockAds,
  buildProfile,
  type ExtractionWithMeta,
} from "./generate.js";
import type { GenerateResponse } from "./types.js";

export async function handleGenerate(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body;
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      res.status(400).json({ error: "Missing url" });
      return;
    }

    if (!isValidUrl(url)) {
      res.status(400).json({ error: "Invalid URL (must be http/https, no localhost or private IPs)" });
      return;
    }

    const extraction = await fetchAndExtract(url);
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    let result: GenerateResponse;

    if (apiKey) {
      result = await generateWithLLM(extraction, apiKey);
    } else {
      const profile = buildProfile(extraction);
      const ads = getMockAds(profile);
      result = {
        profile,
        ads,
        source: {
          url,
          fetchedAt: extraction.fetchedAt,
          counts: {
            headings: extraction.headings.length,
            textLength: extraction.visibleText.length,
            images: extraction.imageUrls.length,
          },
        },
      };
    }

    result.source.url = url;
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const isClient =
      msg.includes("Rejected") ||
      msg.includes("too large") ||
      msg.includes("Invalid") ||
      msg.includes("fetch failed");
    res.status(isClient ? 400 : 500).json({ error: msg });
  }
}

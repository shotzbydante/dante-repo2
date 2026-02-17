/**
 * Fetch URL, parse HTML, extract business-relevant content
 */

import { parse, HTMLElement } from "node-html-parser";
import type { RawExtraction } from "./types.js";

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_VISIBLE_TEXT = 15000;
const MAX_IMAGES = 20;
const MAX_HEADINGS = 50;

const SKIP_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "svg",
  "nav",
  "header",
  "footer",
  "aside",
]);

function getVisibleText(root: HTMLElement, maxLen: number): string {
  const parts: string[] = [];
  const walk = (el: HTMLElement) => {
    if (SKIP_TAGS.has(el.tagName?.toLowerCase() ?? "")) return;
    if (el.tagName === "IMG" && el.getAttribute("alt")) {
      parts.push(el.getAttribute("alt")!);
      return;
    }
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        const t = (node as unknown as { text: string }).text?.trim?.();
        if (t) parts.push(t);
      } else if (node.nodeType === 1) {
        walk(node as unknown as HTMLElement);
      }
    }
  };
  walk(root);
  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  return joined.length > maxLen ? joined.slice(0, maxLen) + "…" : joined;
}

function getHeadings(root: HTMLElement, max: number): string[] {
  const out: string[] = [];
  for (const tag of ["h1", "h2", "h3"]) {
    for (const el of root.querySelectorAll(tag)) {
      const t = el.text?.trim?.();
      if (t) out.push(t);
      if (out.length >= max) return out;
    }
  }
  return out;
}

function getImageUrls(root: HTMLElement, baseUrl: string, max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const el of root.querySelectorAll("img[src]")) {
    const src = el.getAttribute("src");
    if (!src) continue;
    try {
      const abs = new URL(src, baseUrl).href;
      if (seen.has(abs)) continue;
      seen.add(abs);
      if (abs.startsWith("http://") || abs.startsWith("https://")) {
        out.push(abs);
        if (out.length >= max) break;
      }
    } catch {
      // skip invalid
    }
  }
  return out;
}

function getSocialLinks(root: HTMLElement): string[] {
  const out: string[] = [];
  const patterns = [
    /facebook\.com/i,
    /twitter\.com|x\.com/i,
    /instagram\.com/i,
    /linkedin\.com/i,
    /youtube\.com/i,
  ];
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    if (patterns.some((p) => p.test(href))) out.push(href);
  }
  return [...new Set(out)].slice(0, 10);
}

export async function fetchAndExtract(
  url: string
): Promise<RawExtraction & { fetchedAt: string }> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const res = await fetch(url, {
    signal: controller.signal,
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AdBriefBot/1.0; +https://example.com)",
    },
  });
  clearTimeout(to);

  const ct = res.headers.get("content-type") ?? "";
  if (
    !ct.includes("text/html") &&
    !ct.includes("application/xhtml") &&
    !ct.includes("text/plain")
  ) {
    throw new Error(`Rejected non-HTML content type: ${ct}`);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BODY_BYTES) {
    throw new Error(`Response too large: ${buf.byteLength} bytes (max 2MB)`);
  }

  const html = new TextDecoder("utf-8").decode(buf);
  const doc = parse(html);

  const titleEl = doc.querySelector("title");
  const title = titleEl?.text?.trim() ?? "";

  let metaDesc = "";
  const meta = doc.querySelector('meta[name="description"]');
  if (meta) metaDesc = meta.getAttribute("content")?.trim() ?? "";

  const headings = getHeadings(doc, MAX_HEADINGS);
  const visibleText = getVisibleText(doc, MAX_VISIBLE_TEXT);
  const imageUrls = getImageUrls(doc, url, MAX_IMAGES);
  const socialLinks = getSocialLinks(doc);

  return {
    title,
    metaDescription: metaDesc,
    headings,
    visibleText,
    imageUrls,
    socialLinks,
    fetchedAt: new Date().toISOString(),
  };
}

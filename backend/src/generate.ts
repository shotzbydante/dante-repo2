/**
 * Build BusinessProfile from extraction, generate 6 ad concepts via LLM or mock
 */

import OpenAI from "openai";
import type {
  BusinessProfile,
  AdConcept,
  GenerateResponse,
  StoryboardScene,
} from "./types.js";
import type { RawExtraction } from "./types.js";

const durations = [5, 5, 15, 15, 30, 30];

export function buildProfile(e: RawExtraction): BusinessProfile {
  const name = e.title.split(/[|–—\-]/)[0]?.trim() || "Unknown Business";
  const desc = e.metaDescription || e.visibleText.slice(0, 300);
  const valueProps = e.headings.slice(0, 5).filter(Boolean);
  if (valueProps.length === 0 && desc) valueProps.push(desc.slice(0, 100));
  const assets: string[] = ["Logo"];
  if (e.imageUrls.length > 0) assets.push("Product/service photos");
  if (e.visibleText.toLowerCase().includes("testimonial") || e.visibleText.toLowerCase().includes("review"))
    assets.push("Customer testimonials");
  if (e.socialLinks.length > 0) assets.push("Social proof graphics");
  assets.push("CTA graphics");

  return {
    business_name: name,
    category_guess: "Local Business",
    location_guess: undefined,
    value_props: valueProps.length ? valueProps : ["Quality products and services"],
    tone: "Professional, approachable",
    keywords: e.headings.slice(0, 8).filter(Boolean),
    assets_needed: assets,
  };
}

function mockAd(duration: number, profile: BusinessProfile, idx: number): AdConcept {
  const hook =
    duration <= 5
      ? `Stop scrolling — ${profile.business_name} is here.`
      : `What if you could get more customers without the hassle?`;
  const angle = `${profile.business_name} helps local businesses grow.`;
  const scenes: StoryboardScene[] = [
    { timestamp: "0:00-0:03", description: "Hook: logo or key visual", on_screen_text: profile.business_name },
    { timestamp: "0:03-0:08", description: "Value prop", on_screen_text: profile.value_props[0] ?? "Your trusted partner" },
  ];
  if (duration >= 15) {
    scenes.push({
      timestamp: "0:08-0:12",
      description: "Social proof or benefit",
      on_screen_text: profile.value_props[1] ?? "Trusted by many",
    });
  }
  if (duration >= 30) {
    scenes.push(
      {
        timestamp: "0:12-0:22",
        description: "Detail or testimonial",
        on_screen_text: profile.keywords[0] ?? "Quality",
      },
      {
        timestamp: "0:22-0:30",
        description: "CTA",
        on_screen_text: "Visit today",
      }
    );
  }

  return {
    duration_seconds: duration,
    hook,
    angle,
    storyboard: scenes,
    voiceover_script: `${hook} ${angle} Visit us today.`,
    cta_options: ["Visit our website", "Call now", "Book a consultation"],
    platform_variants: {
      meta_vertical_9_16: "Vertical format, text centered, CTA at bottom",
      youtube_horizontal_16_9: "Horizontal format, text lower third, CTA end frame",
    },
  };
}

export function getMockAds(
  profile: BusinessProfile
): AdConcept[] {
  return durations.map((d, i) => mockAd(d, profile, i));
}

export type ExtractionWithMeta = RawExtraction & { fetchedAt: string };

export async function generateWithLLM(
  extraction: ExtractionWithMeta,
  apiKey: string
): Promise<GenerateResponse> {
  const profile = buildProfile(extraction);
  const openai = new OpenAI({ apiKey });

  const system = `You are an ad creative strategist. Given website content, produce exactly 6 ad concepts in JSON format.
Schema: profile (business_name, category_guess, location_guess?, value_props, tone, keywords),
ads: array of 6 ad concepts in this exact order: 2x5-second, 2x15-second, 2x30-second.
Each ad: duration_seconds, hook (1-2 sec grabber), angle (story), storyboard (timestamped scenes), voiceover_script, cta_options, platform_variants { meta_vertical_9_16, youtube_horizontal_16_9 }.
Respond with valid JSON only.`;

  const content = `
Website content:
Title: ${extraction.title}
Meta: ${extraction.metaDescription}
Headings: ${extraction.headings.join(" | ")}
Text (excerpt): ${extraction.visibleText.slice(0, 4000)}
Images (URLs only, do not fetch): ${extraction.imageUrls.slice(0, 10).join(", ") || "none"}
`.trim();

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
    temperature: 0.7,
  });

  const raw = resp.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: { profile?: Partial<BusinessProfile>; ads?: AdConcept[] };
  try {
    const json = raw.replace(/```json?\s*/g, "").replace(/```\s*$/g, "").trim();
    parsed = JSON.parse(json) as typeof parsed;
  } catch {
    return {
      profile,
      ads: getMockAds(profile),
      source: {
        url: "",
        fetchedAt: extraction.fetchedAt ?? new Date().toISOString(),
        counts: {
          headings: extraction.headings.length,
          textLength: extraction.visibleText.length,
          images: extraction.imageUrls.length,
        },
      },
    };
  }

  const ads = Array.isArray(parsed.ads) && parsed.ads.length >= 6
    ? parsed.ads.slice(0, 6)
    : getMockAds(profile);

  const finalProfile: BusinessProfile = {
    ...profile,
    ...(parsed.profile && {
      business_name: parsed.profile.business_name ?? profile.business_name,
      category_guess: parsed.profile.category_guess ?? profile.category_guess,
      location_guess: parsed.profile.location_guess ?? profile.location_guess,
      value_props: parsed.profile.value_props ?? profile.value_props,
      tone: parsed.profile.tone ?? profile.tone,
      keywords: parsed.profile.keywords ?? profile.keywords,
    }),
  };

  return {
    profile: finalProfile,
    ads,
    source: {
      url: "",
      fetchedAt: extraction.fetchedAt ?? new Date().toISOString(),
      counts: {
        headings: extraction.headings.length,
        textLength: extraction.visibleText.length,
        images: extraction.imageUrls.length,
      },
    },
  };
}

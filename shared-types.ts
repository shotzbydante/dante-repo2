/**
 * Shared types for ad creative brief MVP
 */

export interface BusinessProfile {
  business_name: string;
  category_guess: string;
  location_guess?: string;
  value_props: string[];
  tone: string;
  keywords: string[];
  assets_needed?: string[]; // logo, photos, testimonials, etc. inferred from site
}

export interface StoryboardScene {
  timestamp: string; // e.g. "0:00-0:05"
  description: string;
  on_screen_text?: string;
  visual_notes?: string;
}

export interface AdConcept {
  duration_seconds: number;
  hook: string;
  angle: string;
  storyboard: StoryboardScene[];
  voiceover_script: string;
  cta_options: string[];
  platform_variants: {
    meta_vertical_9_16: string;  // formatting notes
    youtube_horizontal_16_9: string;
  };
}

export interface GenerateResponse {
  profile: BusinessProfile;
  ads: AdConcept[];
  source: {
    url: string;
    fetchedAt: string;
    counts: {
      headings: number;
      textLength: number;
      images: number;
    };
  };
}

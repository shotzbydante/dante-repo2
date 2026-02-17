/**
 * Backend types - re-exports shared + extraction types
 */

export type {
  BusinessProfile,
  StoryboardScene,
  AdConcept,
  GenerateResponse,
} from "../../shared-types";

export interface RawExtraction {
  title: string;
  metaDescription: string;
  headings: string[];
  visibleText: string;
  imageUrls: string[];
  socialLinks: string[];
}

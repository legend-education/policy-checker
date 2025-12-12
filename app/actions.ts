'use server';

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import Airtable from 'airtable';

// Initialize Airtable (Mock if missing to prevent crash)
const base = process.env.AIRTABLE_API_TOKEN 
  ? new Airtable({ apiKey: process.env.AIRTABLE_API_TOKEN }).base(process.env.AIRTABLE_BASE_ID!) 
  : () => ({ create: async () => {} });

// --- SCHEMAS ---

const EvidenceSchema = z.object({
  value: z.boolean().describe("True only if explicit evidence exists. False if vague or missing."),
  quote: z.string().describe("The exact substring from the text supporting this decision. Return the entire sentence or paragraph if available. Return 'Not found in text' if false."),
});

const AnalysisSchema = z.object({
  isNotAPrivacyDoc: z.boolean().describe("True if the text is clearly NOT a legal document (e.g. a recipe, essay, or code)."),
  
  classification: z.object({
    type: z.enum(['Type A', 'Type B', 'Type C', 'Type U']).describe("The calculated tool type based on features."),
    reasoning: z.string().describe("Brief explanation of why this classification was chosen."),
  }),

  coppa: z.object({
    noSelling: EvidenceSchema.describe("Mandatory: Explicitly states PII is NOT SOLD and NOT used for marketing/ads."),
    schoolConsent: EvidenceSchema.describe("Mandatory: Mechanism for School to consent (or tool is strictly B2B)."),
    educationalUse: EvidenceSchema.describe("Mandatory: Data collected is limited to educational/operational purposes."),
  }),

  ferpa: z.object({
    districtControl: EvidenceSchema.describe("Mandatory: Explicit statement that District retains ownership OR vendor is designated as a 'School Official'."),
    limitedSharing: EvidenceSchema.describe("Mandatory: No sharing with 3rd parties unless strictly for service provision."),
    breachNotice: EvidenceSchema.describe("Mandatory: Promise to notify the district of a breach (even if vague)."),
    deletionPolicy: EvidenceSchema.describe("Desired: Policy to delete/return data upon contract termination."),
  }),

  cipa: z.object({
    hasModeration: EvidenceSchema.describe("Type A (Social): Moderation tools (teachers can view logs) OR Filtering (SafeSearch) are present."),
    noAiTraining: EvidenceSchema.describe("Type B (Utility): Explicit statement that PII is NOT used to train AI models."),
    noThirdPartyAds: EvidenceSchema.describe("Type B (Utility): Explicit statement that NO third-party ads are displayed."),
  })
});

// --- ACTION ---

export async function scanLegalText(text: string, email: string) {
  if (!text || !email) throw new Error("Missing text or email");

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: AnalysisSchema,
      prompt: `
        You are a Student Data Privacy Auditor. 
        Analyze the provided legal text for K-12 school compliance.

        ### GLOBAL INSTRUCTION
        If the input text is not a legal document (Privacy Policy, ToS, DPA), set 'isNotAPrivacyDoc' to true.

        ### BOOLEAN RULES
        For every boolean field in the schema:
        1. Return **TRUE** only if there is EXPLICIT, STRONG evidence in the text. 
        2. Return **FALSE** if the evidence is vague, ambiguous, or missing.
        3. You must extract a **DIRECT QUOTE** for every True OR False determination.

        ### DEFINITIONS FOR CLASSIFICATION
        - **Type A (Social / Open Web):** Chat, Video, Social Profiles, Communities.
        - **Type B (Utility / Static):** Calculators, Games, Reference, Single-player tools.
        - **Type C (Teacher / Admin Only):** Gradebooks, HR, SIS (No student login).
        - **Type U (Unknown):** Policy describes "Service" broadly without specifying features.

        Analyze this text:
        ${text.substring(0, 50000)}
      `,
    });

    try {
      // @ts-ignore
      await base('Scans').create([{
        fields: {
          "Email": email,
          "Type": object.classification?.type || "N/A",
          "Is Valid": !object.isNotAPrivacyDoc
        }
      }]);
    } catch (err) {
      console.warn("Airtable logging failed", err);
    }

    return object;

  } catch (error) {
    console.error("Scan failed:", error);
    throw new Error("Failed to analyze documents");
  }
}
'use server';

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_TOKEN }).base(process.env.AIRTABLE_BASE_ID!);

// Schema remains the same
const ComplianceSchema = z.object({
  summary: z.string().describe("A 1-sentence executive summary for a school principal."),
  coppa: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(['Compliant', 'Review', 'Non-Compliant']),
    findings: z.array(z.string()).describe("List of 2-3 specific quotes that earned points (or note what is missing).")
  }),
  ferpa: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(['Compliant', 'Review', 'Non-Compliant']),
    findings: z.array(z.string()).describe("List of 2-3 specific quotes that earned points (or note what is missing).")
  }),
  cipa: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(['Compliant', 'Review', 'Non-Compliant']),
    findings: z.array(z.string()).describe("List of 2-3 specific quotes that earned points (or note what is missing).")
  })
});

export async function scanLegalText(text: string, email: string) {
  if (!text || !email) throw new Error("Missing text or email");

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: ComplianceSchema,
      prompt: `
        You are a Student Data Privacy Auditor. Analyze the legal text for K-12 compliance.
        
        SCORING RUBRIC (The "Proof of Safety" Model):
        Start at 0 points for each law. ONLY award points if you find EXPLICIT evidence in the text.
        
        1. COPPA (Student Data Privacy) - Max 100
        - (+40 pts): Explicit statement that data is NOT sold and NOT used for behaviorial marketing/ads.
        - (+30 pts): Clear mechanism for "Parental Consent" or "School Consent" on behalf of parents.
        - (+30 pts): Data collection is limited to "Educational Purposes" only.
        
        2. FERPA (Records & Ownership) - Max 100
        - (+40 pts): Explicit statement that the School/District retains ownership of student records/IP.
        - (+30 pts): Vendor agrees to be designated as a "School Official" with legitimate educational interest.
        - (+30 pts): Clear policy to delete/return data upon contract termination (e.g. "within 60 days").

        3. CIPA (Internet Safety) - Max 100
        - (+50 pts): Evidence of moderation tools, profanity filters, or teacher-control over chat.
        - (+50 pts): No evidence of unmonitored private chat or links to external open social networks.

        CRITICAL INSTRUCTION:
        - If a section is missing, do NOT award points. 
        - If the text is vague (e.g. "we may share with partners"), do NOT award points.
        - In the "findings", quote the text that earned the points. If no points were earned, state "Missing specific clause regarding X".

        Analyze this text:
        ${text.substring(0, 30000)}
      `,
    });

    // Save to Airtable
    await base('Scans').create([{
      fields: {
        "Email": email,
        "Raw Text": text.substring(0, 500) + "...", 
        "Summary": object.summary,
        "COPPA Score": object.coppa.score,
        "FERPA Score": object.ferpa.score,
        "CIPA Score": object.cipa.score
      }
    }]);

    return object;

  } catch (error) {
    console.error("Scan failed:", error);
    throw new Error("Failed to analyze documents");
  }
}
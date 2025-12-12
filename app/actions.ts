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
    findings: z.array(z.string()).describe("List of 2-5 specific quotes that earned points (or note what is missing).")
  }),
  ferpa: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(['Compliant', 'Review', 'Non-Compliant']),
    findings: z.array(z.string()).describe("List of 2-5 specific quotes that earned points (or note what is missing).")
  }),
  cipa: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(['Compliant', 'Review', 'Non-Compliant', 'N/A', 'Unknown']),
    findings: z.array(z.string()).describe("List of 2-3 specific quotes that earned points (or note what is missing).")
  })
});

export async function scanLegalText(text: string, email: string) {
  if (!text || !email) throw new Error("Missing text or email");

  try {
    const { object } = await generateObject({
      model: openai('gpt-5.2'),
      schema: ComplianceSchema,
      temperature: 0,
      prompt: `
        You are a highly specialized Student Data Privacy Auditor. Your task is to analyze the provided legal text (Privacy Policy/ToS) for compliance with US K-12 federal laws. You must use the Weighted Hybrid Scoring method below to calculate the score and fill the provided JSON schema.

### INITIAL CONTEXT CHECK (Determine Tool Type)
First, analyze the text to determine the likely primary function of the software:
1.  **Type A (Communication/Browser):** The tool features chat, social networking, web browsing, email, or video conferencing.
2.  **Type B (Utility/Creation):** The tool is a calculator, grading assistant, non-collaborative creation app, or organizational tool.
3.  **Type C (Teacher Tool):** The tool is clearly designed for teacher use only and is not student-facing.
4.  **Type U (Unknown):** The tool type is not clear from the text.
*State the determined Tool Type (A, B, C, or U) in your scratchpad.*

### SCORING RUBRIC (Weighted Hybrid Score)
Start at 0 points for each law. The maximum score for each law is 100.
**CRITICAL INSTRUCTION:** Any points awarded must be supported by an EXACT QUOTE from the text. If a mandatory item is missing, the corresponding points must be 0.

---

**1. COPPA (Student Data Privacy) - Max 100**
*Focus: No Commercial Exploitation of Children Under 13.*

| Clause Type | Mandatory (M) / Desired (D) | Points | Criteria for Awarding Points |
| :--- | :--- | :--- | :--- |
| **M** | **No Selling/Advertising** | **50** | Explicitly states PII is NOT SOLD and NOT used for targeted/behavioral advertising. |
| **D** | **Educational Purpose/Minimization** | **30** | Data collected is limited to the minimum necessary for educational functions. |
| **D** | **Parental Deletion Rights** | **15** | Clear process for the school to delete student data upon request. |
| **D** | **School Consent** | **5** | Clear mechanism for School/Teacher consent on behalf of parents. |

**🚩 RED FLAG DEDUCTION (COPPA):** Deduct 100 points if the text mentions "sharing data with partners for marketing" or "selling data to advertisers."

---

**2. FERPA (Records & Control) - Max 100**
*Focus: School Ownership and Control over Education Records.*

| Clause Type | Mandatory (M) / Desired (D) | Points | Criteria for Awarding Points |
| :--- | :--- | :--- | :--- |
| **M** | **District Ownership** | **40** | Explicitly states the District/School retains ownership and control of records. |
| **M** | **Data Deletion Timeline** | **30** | Clear policy to delete/return data upon contract termination with a specified timeframe (e.g., within 60 days). |
| **D** | **School Official/Direct Control** | **20** | Vendor agrees to be a "School Official" or acts under the "Direct Control" of the school. |
| **D** | **Breach Notification** | **5** | Will make reasonable efforts to notify the district with a breach notifcation where legally required. | 
| **D** | **Breach Notification Timeline** | **5** | If a specific timeline (e.g., 48-72 hours) is mentioned for a data breach. |

**🚩 RED FLAG DEDUCTION (FERPA):** Deduct 100 points if the vendor claims a "perpetual, irrevocable license" to student content.

---

**3. CIPA & Safety (Content, AI, & Communication) - Max 100**
*Focus: Safety from Harmful Content and Unmonitored Communication.*

**SPECIAL INSTRUCTIONS FOR TYPE C AND TYPE U:**
- **Type C (Teacher Tool):** Set CIPA score to 100, status to "N/A", and findings should state: "N/A - The tool is only teacher-facing and not for use with students." followed by an evidence quote that proves it's teacher-only.
- **Type U (Unknown):** Set CIPA score to 0, status to "Unknown", and findings should state: "Unknown and needs review. Couldn't determine tool type." followed by any relevant quotes or note what information is missing.

**FOR TYPE A AND TYPE B ONLY:**
| Tool Type | Clause Type | Mandatory (M) / Desired (D) | Points | Criteria for Awarding Points |
| :--- | :--- | :--- | :--- |
| **A** | **M** | **Moderation & Auditing** | **50** | Evidence of teacher tools to moderate/view/audit all student-to-student communications. |
| **A** | **M** | **Walled Garden/No External Link** | **50** | Explicitly bans unmonitored chat and links to external open social networks. |
| **B** | **M** | **No AI Training on PII** | **50** | Explicit statement that identifiable PII is NOT used to train public/generative AI models. |
| **B** | **M** | **No Ads/Rabbit Holes** | **50** | The tool avoids displaying third-party ads or non-educational content feeds. |

**CRITICAL INSTRUCTION FOR FINDINGS:**
* The final percentage should be the calculated score (Score / 100).
* Quote the exact text that earned the points. If no points were earned for a clause, state the missing clause.
* The final Status should be determined by the score: **Compliant (80-100), Review (50-79), or Non-Compliant (<50)**.

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
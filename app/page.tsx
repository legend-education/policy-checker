"use client";

import React, { useState, useEffect } from 'react';
import { Playfair_Display, Inter } from 'next/font/google';
import { AlertTriangle, CheckCircle2, X, Loader2, FileWarning, ShieldCheck, HelpCircle } from 'lucide-react';
import { scanLegalText } from './actions';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

// --- UTILITY: SCORING ENGINE ---
function computeReport(scanResult: any) {
  if (!scanResult) return null; 

  const getStatus = (score: number) => score >= 80 ? "Pass" : score >= 50 ? "Review" : "Fail";

  // 1. COPPA SCORING
  let coppaScore = 0;
  if (scanResult.coppa?.noSelling?.value) coppaScore += 50;
  if (scanResult.coppa?.schoolConsent?.value) coppaScore += 30;
  if (scanResult.coppa?.educationalUse?.value) coppaScore += 20;

  // 2. FERPA SCORING
  let ferpaScore = 0;
  if (scanResult.ferpa?.districtControl?.value) ferpaScore += 40;
  if (scanResult.ferpa?.limitedSharing?.value) ferpaScore += 30;
  if (scanResult.ferpa?.breachNotice?.value) ferpaScore += 20;
  if (scanResult.ferpa?.deletionPolicy?.value) ferpaScore += 10;
  
  // 3. CIPA SCORING (Conditional Logic)
  let cipaScore = 0;
  let cipaStatus = "Fail";
  let cipaData = {}; // We will only populate this with RELEVANT fields
  let cipaMessage = ""; // Message for Exempt/Unknown states

  const type = scanResult.classification?.type;

  if (type === 'Type A') {
    // Social: Only show Moderation
    cipaScore = scanResult.cipa?.hasModeration?.value ? 100 : 0;
    cipaStatus = getStatus(cipaScore);
    cipaData = { hasModeration: scanResult.cipa.hasModeration };
  } 
  else if (type === 'Type B') {
    // Utility: Show AI + Ads
    if (scanResult.cipa?.noAiTraining?.value) cipaScore += 50;
    if (scanResult.cipa?.noThirdPartyAds?.value) cipaScore += 50;
    cipaStatus = getStatus(cipaScore);
    cipaData = { 
      noAiTraining: scanResult.cipa.noAiTraining,
      noThirdPartyAds: scanResult.cipa.noThirdPartyAds
    };
  } 
  else if (type === 'Type C') {
    // Admin: Exempt
    cipaScore = 100;
    cipaStatus = "Exempt";
    cipaMessage = "Teacher/Admin-only tools are exempt from student safety filtering requirements.";
    cipaData = {}; // No checkboxes needed
  } 
  else {
    // Unknown
    cipaScore = 0;
    cipaStatus = "Unknown";
    cipaMessage = "Tool function could not be determined. Manual CIPA review is required.";
    cipaData = {};
  }

  return {
    summary: scanResult.classification?.reasoning,
    type: scanResult.classification?.type,
    scores: {
      coppa: { score: coppaScore, status: getStatus(coppaScore) },
      ferpa: { score: ferpaScore, status: getStatus(ferpaScore) },
      cipa: { score: cipaScore, status: cipaStatus, message: cipaMessage, data: cipaData },
    }
  };
}

// --- COMPONENT: BOOLEAN CARD ---
function BooleanCard({ label, sub, scoreData, sectionData }: any) {
  const { score, status, message } = scoreData;
  // Handle special statuses like "Exempt" or "Unknown" that aren't numeric
  const isHigh = score >= 80 || status === "Exempt";
  const isLow = score <= 49 && status !== "Unknown";
  const isNeutral = status === "Unknown";
  
  const theme = isHigh ? "text-[#5F9B63]" : isLow ? "text-red-600" : "text-amber-600";
  const ringColor = isHigh ? "#5F9B63" : isLow ? "#DC2626" : "#D97706";

  // Use passed specific data (for CIPA) or fall back to full section data (FERPA/COPPA)
  const dataToRender = scoreData.data || sectionData;
  const hasItems = Object.keys(dataToRender).length > 0;

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden group hover:shadow-md transition-all">
      <div className="p-6 flex items-center justify-between border-b border-[#F5F5F5]">
        <div>
          <h3 className="text-sm font-bold tracking-widest text-[#1A1A1A] uppercase flex items-center gap-2">
            {label}
            {isHigh ? <CheckCircle2 className="w-4 h-4 text-[#5F9B63]" /> : 
             isNeutral ? <HelpCircle className="w-4 h-4 text-amber-600" /> :
             <AlertTriangle className={`w-4 h-4 ${theme}`} />}
          </h3>
          <p className="text-xs text-[#999] mt-1">{sub}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
             <div className={`font-bold uppercase tracking-wider text-xs ${theme}`}>{status}</div>
             <div className="text-[10px] text-[#CCC] uppercase tracking-widest">{isNeutral ? "Manual" : "Score"}</div>
          </div>
          <div className="relative flex items-center justify-center w-12 h-12">
             <span className={`font-serif text-lg ${theme}`}>{isNeutral ? "?" : score}</span>
             <svg className="absolute w-full h-full transform -rotate-90">
               <circle cx="24" cy="24" r="20" stroke="#F0F0F0" strokeWidth="3" fill="none" />
               <circle cx="24" cy="24" r="20" stroke={ringColor} strokeWidth="3" fill="none" strokeDasharray="125" strokeDashoffset={125 - (125 * (isNeutral ? 0 : score)) / 100} />
             </svg>
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-[#FAFAFA] min-h-[100px] flex flex-col justify-center">
        {/* Scenario 1: Message Only (Exempt/Unknown) */}
        {message && (
          <div className="flex items-start gap-3 p-2">
            <ShieldCheck className={`w-5 h-5 flex-shrink-0 ${isHigh ? 'text-[#5F9B63]' : 'text-amber-600'}`} />
            <p className="text-sm text-[#4A4A4A] italic leading-relaxed">{message}</p>
          </div>
        )}

        {/* Scenario 2: Checklist Items */}
        {hasItems && (
          <div className="space-y-6">
            {Object.entries(dataToRender).map(([key, item]: any) => {
              if (!item?.hasOwnProperty('value')) return null;
              
              const passed = item.value === true;
              
              return (
                <div key={key} className="relative pl-6 border-l-2 border-[#E5E5E5]">
                   <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white ${passed ? 'bg-[#5F9B63]' : 'bg-[#E5E5E5]'}`}></div>
                   <div className="flex justify-between items-start mb-1">
                     <span className="text-[11px] font-bold text-[#4A4A4A] uppercase tracking-wide">
                       {key.replace(/([A-Z])/g, ' $1').trim()}
                     </span>
                     <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${passed ? 'bg-[#EDF7ED] text-[#5F9B63]' : 'bg-[#F5F5F5] text-[#999]'}`}>
                       {passed ? "Pass" : "Fail / Missing"}
                     </span>
                   </div>
                   <p className="text-xs text-[#666] font-serif italic leading-relaxed">"{item.quote}"</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function LegendScanner() {
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<"idle" | "scanning" | "complete">("idle");
  const [rawReport, setRawReport] = useState<any>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("vendor_vetting_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleStartClick = () => {
    if (!text) return;
    if (!email) setShowModal(true);
    else runScan(email);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes("@")) {
      localStorage.setItem("vendor_vetting_email", email);
      setShowModal(false);
      runScan(email);
    }
  };

  const runScan = async (userEmail: string) => {
    setStatus("scanning");
    setRawReport(null);
    try {
      const result = await scanLegalText(text, userEmail);
      console.log("Scan Report:", result);
      setRawReport(result);
      setStatus("complete");
    } catch (error) {
      console.error(error);
      alert("Scan failed. Please try again.");
      setStatus("idle");
    }
  };

  const computedResults = (rawReport && !rawReport.isNotAPrivacyDoc) ? computeReport(rawReport) : null;

  return (
    <main className={`${playfair.variable} ${inter.variable} min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-sans selection:bg-[#D4E0D4]`}>
      
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/30 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full border border-[#E5E5E5]">
            <div className="flex justify-between items-center mb-4">
               <h2 className="font-serif text-2xl text-[#1A1A1A]">Identify yourself.</h2>
               <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-[#999] hover:text-black"/></button>
            </div>
            <p className="text-sm text-[#666] mb-6 font-light">Enter your email to verify this request.</p>
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <input autoFocus type="email" required placeholder="principal@school.edu" className="w-full p-4 bg-[#F8F9F8] border border-[#E5E5E5] rounded-lg outline-none focus:border-[#5F9B63] focus:bg-white transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit" className="w-full py-3 bg-[#5F9B63] text-white font-bold tracking-widest uppercase rounded-lg hover:bg-[#4F8553] transition-colors shadow-lg">Reveal Results</button>
            </form>
          </div>
        </div>
      )}

      <nav className="p-8 absolute top-0 left-0 w-full z-10">
        <div className="flex items-center gap-2 text-sm font-bold tracking-[0.2em] text-[#4A4A4A] uppercase">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5F9B63]"></div>
          <span className="font-serif">LEGEND</span>
        </div>
      </nav>

      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-24 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="font-serif text-5xl md:text-6xl text-[#1A1A1A]">Complexity, dissolved.</h1>
          <p className="text-[#666] max-w-lg mx-auto text-sm font-light tracking-wide">The precision instrument for school leadership. Compliance snapshots for FERPA, COPPA, CIPA in seconds.</p>
        </div>

        <div className="w-full max-w-3xl mb-12 relative group z-0">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#E5E5E5] to-[#F0F0F0] rounded-xl opacity-50 blur group-focus-within:opacity-100 group-focus-within:from-[#9BC49D] group-focus-within:to-[#5F9B63] transition duration-1000"></div>
          <div className="relative bg-white rounded-xl leading-none">
            <textarea 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="Paste Privacy Policy & Terms here..." 
              disabled={status === "scanning"}
              className={`w-full h-64 p-6 bg-transparent outline-none text-sm text-[#333] font-light resize-none placeholder:text-[#D4D4D4] placeholder:font-serif placeholder:italic leading-relaxed transition-opacity ${status === "scanning" ? "opacity-50 cursor-not-allowed" : ""}`} 
            />
          </div>
          <div className="absolute bottom-4 right-4">
             <button 
               onClick={handleStartClick} 
               disabled={status === "scanning" || !text} 
               className={`px-6 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-2 ${
                 status === "scanning" 
                   ? "bg-[#5F9B63] text-white cursor-default shadow-lg" 
                   : !text
                   ? "bg-[#E5E5E5] text-[#999] cursor-not-allowed"
                   : "bg-[#5F9B63] text-white hover:bg-[#4F8553] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
               }`}
             >
              {status === "scanning" && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === "scanning" ? "Analyzing" : "Run Check"}
            </button>
          </div>
        </div>

        {/* --- RESULTS SECTION --- */}
        {status === "complete" && rawReport && (
          <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            
            {/* Case 1: Invalid Document */}
            {rawReport.isNotAPrivacyDoc ? (
               <div className="bg-amber-50 border border-amber-200 p-8 rounded-xl text-center mb-8">
                 <FileWarning className="w-10 h-10 text-amber-600 mx-auto mb-4" />
                 <h2 className="font-serif text-2xl mb-2 text-amber-900">Analysis Halted</h2>
                 <p className="text-amber-800/80">This text does not appear to be a legal document (Privacy Policy or ToS).</p>
               </div>
            ) : computedResults ? (
              /* Case 2: Valid Results */
              <>
                <div className="bg-[#F8F9F8] p-8 rounded-xl border border-[#E5E5E5] mb-8 text-center shadow-sm">
                  <span className="bg-[#1A1A1A] text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-widest mb-4 inline-block">
                    {computedResults.type}
                  </span>
                  <p className="font-serif italic text-lg text-[#4A4A4A] leading-relaxed">
                     "{computedResults.summary}"
                  </p>
                </div>

                <div className="flex flex-col gap-6">
                  <BooleanCard 
                    label="FERPA" 
                    sub="Control & Ownership" 
                    scoreData={computedResults.scores.ferpa} 
                    sectionData={rawReport.ferpa} 
                  />
                  <BooleanCard 
                    label="COPPA" 
                    sub="Student Privacy" 
                    scoreData={computedResults.scores.coppa} 
                    sectionData={rawReport.coppa} 
                  />
                  {/* CIPA Card handles its own data display based on type */}
                  <BooleanCard 
                    label="CIPA" 
                    sub="Safety & Harm" 
                    scoreData={computedResults.scores.cipa} 
                    sectionData={rawReport.cipa} 
                  />
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
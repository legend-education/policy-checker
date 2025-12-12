"use client";

import React, { useState, useEffect } from 'react';
import { Playfair_Display, Inter } from 'next/font/google';
import { Shield, Lock, AlertTriangle, CheckCircle2, X, FileText } from 'lucide-react';
import { scanLegalText } from './actions';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function LegendScanner() {
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<"idle" | "scanning" | "complete">("idle");
  const [report, setReport] = useState<any>(null);

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
    setReport(null);
    try {
      const result = await scanLegalText(text, userEmail);
      setReport(result);
      setStatus("complete");
    } catch (error) {
      alert("Scan failed. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <main className={`${playfair.variable} ${inter.variable} min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-sans selection:bg-[#D4E0D4]`}>
      
      {/* MODAL & NAV (Same as before) */}
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

      <nav className="p-8 absolute top-0 left-0 w-full">
        <div className="flex items-center gap-2 text-sm font-bold tracking-[0.2em] text-[#4A4A4A] uppercase">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5F9B63]"></div>
          <span className="font-serif">LEGEND</span>
        </div>
      </nav>

      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-20 max-w-4xl mx-auto w-full">
        
        <div className="text-center mb-10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="font-serif text-5xl md:text-6xl text-[#1A1A1A]">Complexity, dissolved.</h1>
          <p className="text-[#666] max-w-lg mx-auto text-sm font-light tracking-wide">The precision instrument for school leadership. Compliance
          snapshots for FERPA, COPPA, CIPA in seconds.</p>
        </div>

        <div className="w-full max-w-3xl mb-12 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#E5E5E5] to-[#F0F0F0] rounded-xl opacity-50 blur group-focus-within:opacity-100 group-focus-within:from-[#9BC49D] group-focus-within:to-[#5F9B63] transition duration-1000"></div>
          <div className="relative bg-white rounded-xl leading-none">
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste Privacy Policy & Terms here..." className="w-full h-64 p-6 bg-transparent outline-none text-sm text-[#333] font-light resize-none placeholder:text-[#D4D4D4] placeholder:font-serif placeholder:italic leading-relaxed" />
          </div>
          <div className="absolute bottom-4 right-4">
             <button onClick={handleStartClick} disabled={status === "scanning" || !text} className={`px-6 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all duration-300 ${status === "scanning" ? "bg-[#F0F2F0] text-[#5F9B63] cursor-wait" : "bg-[#5F9B63] text-white hover:bg-[#4F8553] shadow-lg hover:shadow-xl hover:-translate-y-0.5"}`}>
              {status === "scanning" ? "Analyzing..." : "Run Check"}
            </button>
          </div>
        </div>

        {/* --- LOADING SKELETON --- */}
        {status === "scanning" && (
          <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Cards Skeleton */}
            <div className="flex flex-col gap-8 pb-20">
              <SkeletonCard label="FERPA" sub="Family Educational Rights" />
              <SkeletonCard label="COPPA" sub="Children's Online Privacy" />
              <SkeletonCard label="CIPA" sub="Internet Protection" />
            </div>
          </div>
        )}

        {/* --- RESULTS SECTION (UPDATED LAYOUT) --- */}
        {report && status === "complete" && (
          <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <div className="bg-[#F8F9F8] p-8 rounded-lg border border-[#E5E5E5] mb-8 text-center shadow-sm">
              <p className="font-serif italic text-xl text-[#4A4A4A] leading-relaxed">"{report.summary}"</p>
            </div>

            {/* STACKED LAYOUT: Flex Column instead of Grid */}
            <div className="flex flex-col gap-8 pb-20">
              <DetailedCard label="FERPA" sub="Family Educational Rights" data={report.ferpa} />
              <DetailedCard label="COPPA" sub="Children's Online Privacy" data={report.coppa} />
              <DetailedCard label="CIPA" sub="Internet Protection" data={report.cipa} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// --- SKELETON LOADING COMPONENT ---
function SkeletonCard({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden">
      {/* Header Row */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F5F5F5]">
        <div>
          <h3 className="text-sm font-bold tracking-widest text-[#1A1A1A] uppercase flex items-center gap-2">
            {label}
          </h3>
          <p className="text-xs text-[#999] mt-1">{sub}</p>
        </div>

        {/* Score & Status Skeleton */}
        <div className="flex items-center gap-6">
          <div className="text-right space-y-2">
             <div className="h-4 w-24 bg-[#E5E5E5] rounded animate-pulse"></div>
             <div className="h-3 w-28 bg-[#E5E5E5] rounded animate-pulse"></div>
          </div>
          <div className="relative flex items-center justify-center w-16 h-16">
             <svg className="absolute w-full h-full transform -rotate-90">
               <circle cx="32" cy="32" r="28" stroke="#F0F0F0" strokeWidth="4" fill="none" />
               <circle cx="32" cy="32" r="28" stroke="#E5E5E5" strokeWidth="4" fill="none" strokeDasharray="175" strokeDashoffset="50" className="animate-pulse" />
             </svg>
             <span className="font-serif text-2xl text-[#E5E5E5] animate-pulse">--</span>
          </div>
        </div>
      </div>

      {/* Evidence Section Skeleton */}
      <div className="p-6 md:p-8 bg-[#FAFAFA]">
        <h4 className="text-[10px] font-bold text-[#999] uppercase tracking-widest mb-4">Evidence Findings</h4>
        <ul className="space-y-4">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex gap-4 items-start">
               <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#E5E5E5] animate-pulse" />
               <div className="flex-1 space-y-2">
                 <div className="h-4 bg-[#E5E5E5] rounded animate-pulse w-full"></div>
                 <div className="h-4 bg-[#E5E5E5] rounded animate-pulse w-5/6"></div>
               </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// --- NEW COMPONENT: DETAILED CARD ---
function DetailedCard({ label, sub, data }: any) {
  const isNA = data.status === "N/A";
  const isUnknown = data.status === "Unknown";
  const isHigh = data.score >= 80;
  const isLow = data.score <= 40;
  
  // Special handling for N/A and Unknown statuses
  let colorText, colorBg, borderColor, icon;
  
  if (isNA) {
    colorText = "text-[#666]";
    colorBg = "bg-[#666]";
    borderColor = "border-[#666]/30";
    icon = null; // No icon for N/A
  } else if (isUnknown) {
    colorText = "text-[#999]";
    colorBg = "bg-[#999]";
    borderColor = "border-[#999]/30";
    icon = <AlertTriangle className="w-4 h-4 text-[#999]" />;
  } else {
    colorText = isHigh ? "text-[#5F9B63]" : isLow ? "text-amber-700" : "text-yellow-600";
    colorBg = isHigh ? "bg-[#5F9B63]" : isLow ? "bg-amber-700" : "bg-yellow-600";
    borderColor = isHigh ? "border-[#5F9B63]/30" : isLow ? "border-amber-700/30" : "border-yellow-600/30";
    icon = isHigh ? <CheckCircle2 className="w-4 h-4 text-[#5F9B63]" /> : <AlertTriangle className={`w-4 h-4 ${colorText}`} />;
  }

  return (
    <div className={`bg-white rounded-xl border ${borderColor} shadow-sm overflow-hidden transition-all hover:shadow-md`}>
      
      {/* Header Row */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F5F5F5]">
        <div>
          <h3 className="text-sm font-bold tracking-widest text-[#1A1A1A] uppercase flex items-center gap-2">
            {label}
            {icon}
          </h3>
          <p className="text-xs text-[#999] mt-1">{sub}</p>
        </div>

        {/* Score & Status */}
        <div className="flex items-center gap-6">
          <div className="text-right">
             <div className={`font-bold uppercase tracking-wider text-xs ${colorText}`}>{data.status}</div>
             <div className="text-[10px] text-[#CCC] uppercase tracking-widest">
               {isNA ? "Teacher Only" : isUnknown ? "Needs Review" : "Confidence: High"}
             </div>
          </div>
          <div className="relative flex items-center justify-center w-16 h-16">
             <span className={`font-serif text-2xl ${colorText}`}>
               {isNA ? "N/A" : isUnknown ? "?" : data.score}
             </span>
             <svg className="absolute w-full h-full transform -rotate-90">
               <circle cx="32" cy="32" r="28" stroke="#F0F0F0" strokeWidth="4" fill="none" />
               {!isNA && !isUnknown && (
                 <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className={colorText} strokeDasharray="175" strokeDashoffset={175 - (175 * data.score) / 100} />
               )}
             </svg>
          </div>
        </div>
      </div>

      {/* Evidence Section */}
      <div className="p-6 md:p-8 bg-[#FAFAFA]">
        <h4 className="text-[10px] font-bold text-[#999] uppercase tracking-widest mb-4">Evidence Findings</h4>
        <ul className="space-y-4">
          {data.findings.map((item: string, i: number) => (
            <li key={i} className="flex gap-4 items-start group">
               <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${colorBg}`} />
               <p className="text-sm text-[#4A4A4A] leading-relaxed group-hover:text-[#1A1A1A] transition-colors">
                 {item}
               </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
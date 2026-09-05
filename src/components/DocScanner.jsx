import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, FileText, AlertCircle, Sparkles, ArrowRight, Eye, RefreshCw, Layers } from 'lucide-react';
import { samplePrescriptionDocs } from '../data/mockData';

export function DocScanner({ onDocumentScanned, onNavigateToSummary, onNavigateToAgent }) {
  const [activeAction, setActiveAction] = useState('scan'); // 'scan' | 'upload'
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState(samplePrescriptionDocs[0]);
  const [extractedData, setExtractedData] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const fileInputRef = useRef(null);

  // Trigger scan animation and OCR analysis
  const handleStartScan = (docToScan = selectedDoc) => {
    setIsScanning(true);
    setScanProgress(10);
    setExtractedData(null);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setIsScanning(false);
            setExtractedData(docToScan);
            setShowSuccessToast(true);
            onDocumentScanned(docToScan);
            setTimeout(() => setShowSuccessToast(false), 3500);
          }, 400);
          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create simulated doc object
    const customDoc = {
      id: 'doc-uploaded-' + Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      type: file.type.includes('pdf') ? 'Prescription / PDF' : 'Medical Image',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      facility: 'Uploaded Document',
      doctor: 'Attending Physician',
      diagnosis: 'Document processed by MediKiosk OCR Engine',
      extractedText: `UPLOADED DOCUMENT: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB\nStatus: Verified Clinical Record`,
      medications: [
        { name: "Extracted Rx Item", dose: "Standard", frequency: "As directed", duration: "7 days", instruction: "Take with food", time: "Daily", status: "Active" }
      ],
      confidence: '97.8%'
    };

    setSelectedDoc(customDoc);
    handleStartScan(customDoc);
  };

  return (
    <div className="relative w-full h-full min-h-[640px] flex flex-col bg-[#cbf5d6] select-none font-sans overflow-y-auto">
      {/* Action Buttons Row - Exactly matches DocScanner.pdf */}
      <div className="w-full pt-6 pb-4 px-6 flex items-center justify-center gap-6 z-10">
        {/* SCAN BUTTON */}
        <button
          onClick={() => {
            setActiveAction('scan');
            handleStartScan();
          }}
          className={`px-10 py-3 rounded-full font-bold text-2xl tracking-wide shadow-md transition-all duration-150 flex items-center justify-center cursor-pointer ${
            activeAction === 'scan'
              ? 'bg-[#297006] text-black ring-2 ring-black/30 scale-105'
              : 'bg-[#297006] text-black hover:bg-[#236005] opacity-90'
          }`}
        >
          <span>Scan</span>
        </button>

        {/* UPLOAD BUTTON */}
        <button
          onClick={() => {
            setActiveAction('upload');
            fileInputRef.current?.click();
          }}
          className={`px-8 py-3 rounded-full font-bold text-2xl tracking-wide shadow-md transition-all duration-150 flex items-center justify-center cursor-pointer ${
            activeAction === 'upload'
              ? 'bg-[#297006] text-black ring-2 ring-black/30 scale-105'
              : 'bg-[#297006] text-black hover:bg-[#236005] opacity-90'
          }`}
        >
          <span>Upload</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Main Document Viewfinder / Scanner Container - Matches Royal Blue #3f51b5 Rect in Mockup */}
      <div className="flex-1 w-full px-5 pb-6 flex flex-col items-center">
        <div className="relative w-full max-w-md h-[400px] md:h-[430px] rounded-3xl bg-[#3f51b5] shadow-xl overflow-hidden flex flex-col justify-between p-5 border-2 border-[#303f9f]">
          
          {/* Top viewfinder status bar */}
          <div className="flex items-center justify-between text-white/90 text-xs font-semibold z-20">
            <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-full backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{isScanning ? 'Optical Scanner Active' : 'Scanner Ready'}</span>
            </div>
            <span className="text-[11px] opacity-80">Resolution: 300 DPI Medical</span>
          </div>

          {/* Viewfinder Reticle Corners */}
          <div className="absolute inset-4 pointer-events-none z-10">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/80 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/80 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/80 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/80 rounded-br-lg"></div>
          </div>

          {/* Animated Laser Scan Line */}
          {isScanning && <div className="laser-line z-20"></div>}

          {/* Center Content: Live Document / Camera Preview */}
          <div className="relative my-auto w-full h-[260px] bg-white/10 rounded-2xl border border-white/20 p-4 flex flex-col items-center justify-center text-center overflow-hidden">
            {isScanning ? (
              <div className="space-y-3 flex flex-col items-center animate-fade-in z-20">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm animate-pulse">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="text-white font-bold text-base">
                  Analyzing Document OCR...
                </div>
                <div className="w-48 bg-black/40 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-2.5 rounded-full transition-all duration-200"
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-white/80 font-mono">{scanProgress}% complete</span>
              </div>
            ) : extractedData ? (
              /* Scanned Result Preview */
              <div className="w-full h-full bg-white text-gray-900 rounded-xl p-3 flex flex-col justify-between text-left shadow-inner overflow-y-auto text-xs animate-fade-in z-20">
                <div className="border-b border-gray-200 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#297006] uppercase tracking-wider text-[10px]">
                      {extractedData.type} Verified
                    </span>
                    <span className="text-gray-500 text-[10px]">{extractedData.date}</span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 truncate">{extractedData.title}</h4>
                  <p className="text-gray-500 text-[11px]">{extractedData.doctor} • {extractedData.facility}</p>
                </div>

                <div className="py-2 space-y-1">
                  <p className="font-semibold text-gray-800 text-[11px]">Extracted Medications ({extractedData.medications.length}):</p>
                  <ul className="space-y-1">
                    {extractedData.medications.map((m, idx) => (
                      <li key={idx} className="bg-emerald-50 text-[#052e0a] px-2 py-1 rounded flex justify-between font-medium">
                        <span>• {m.name} ({m.dose})</span>
                        <span className="text-xs text-gray-600">{m.frequency}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> AI OCR Confidence: {extractedData.confidence}
                  </span>
                </div>
              </div>
            ) : (
              /* Idle Prompt inside Viewfinder */
              <div className="space-y-3 flex flex-col items-center text-white/90 z-10 p-2">
                <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner">
                  <Camera className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Document Scanner Viewfinder</h3>
                  <p className="text-xs text-white/80 max-w-xs mt-1">
                    Align your prescription, lab report, or medical discharge slip within the frame.
                  </p>
                </div>
                <button
                  onClick={() => handleStartScan()}
                  className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Live Scan & OCR</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Viewfinder Controls */}
          <div className="flex items-center justify-between text-xs text-white/90 z-20 pt-1">
            <span className="opacity-80">Auto-crop & contrast enabled</span>
            {extractedData && (
              <button
                onClick={() => handleStartScan()}
                className="flex items-center gap-1 hover:text-white underline text-[11px]"
              >
                <RefreshCw className="w-3 h-3" /> Re-scan
              </button>
            )}
          </div>
        </div>

        {/* Quick Sample Prescriptions to test immediately */}
        <div className="w-full max-w-md mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#052e0a] px-1">
            <span>Or load preset medical records:</span>
            <span className="text-[11px] text-[#297006] font-semibold">1-Click Test</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {samplePrescriptionDocs.map((doc, idx) => (
              <button
                key={doc.id}
                onClick={() => {
                  setSelectedDoc(doc);
                  handleStartScan(doc);
                }}
                className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between h-20 ${
                  selectedDoc.id === doc.id
                    ? 'bg-[#297006] text-white border-[#052e0a] shadow-md'
                    : 'bg-white/80 hover:bg-white text-gray-800 border-gray-200'
                }`}
              >
                <span className="font-bold line-clamp-1">{doc.type}</span>
                <span className="text-[10px] opacity-80 line-clamp-2">{doc.title}</span>
                <span className="text-[9px] opacity-70 mt-1">{doc.date}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Post-Scan Quick Actions */}
        {extractedData && (
          <div className="w-full max-w-md mt-4 p-3 bg-white rounded-2xl shadow-md border border-[#297006]/30 flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#297006] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-[#052e0a]">Synced to Patient Chart</p>
                <p className="text-gray-500 text-[10px]">Medications added to summary</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onNavigateToSummary}
                className="px-3 py-1.5 rounded-full bg-[#ff9800] hover:bg-[#f57c00] text-black font-bold text-xs shadow-sm transition"
              >
                View Summary
              </button>
              <button
                onClick={onNavigateToAgent}
                className="px-3 py-1.5 rounded-full bg-[#052e0a] hover:bg-[#0a4213] text-white font-bold text-xs shadow-sm transition"
              >
                Ask Agent
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success Notification Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#052e0a] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <div>
            <div className="text-sm font-bold">Document Successfully Parsed!</div>
            <div className="text-xs text-emerald-200">Prescription and vitals added to Medical Summary</div>
          </div>
        </div>
      )}
    </div>
  );
}

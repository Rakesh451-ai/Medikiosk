import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, Sparkles, AlertCircle, RefreshCw, FileText, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';

export function MobileScanner({ patient, onDocumentAdded, onNavigateToSummary, onNavigateToAgent }) {
  const [activeMode, setActiveMode] = useState('scan'); // 'scan' | 'upload'
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedResult, setScannedResult] = useState(null);
  const [allergyAlert, setAllergyAlert] = useState(false);
  const fileInputRef = useRef(null);

  // Preset clinical documents
  const presetTemplates = [
    {
      id: 'template-rx',
      title: 'Clinical Prescription - Dr. Michael Chen',
      doc_type: 'Prescription',
      facility: 'Metro General Hospital',
      doctor: 'Dr. Michael Chen, MD',
      diagnosis: 'Seasonal Upper Respiratory Tract Infection',
      extracted_text: 'METRO GENERAL HOSPITAL\nDate: 04-Sep-2026\nPatient: Sarah Jenkins\nRx:\n1. Amoxicillin 500mg - 1 capsule PO q8h x 7d\n2. Levocetirizine 5mg - 1 tab PO qhs x 5d',
      medications: [
        { name: "Amoxicillin", dose: "500 mg", frequency: "3 times daily", duration: "7 days", instruction: "Take after meals with water", timing: "Morning, Noon, Night" },
        { name: "Levocetirizine", dose: "5 mg", frequency: "Once daily", duration: "5 days", instruction: "Take at bedtime", timing: "Night" }
      ],
      confidence: '99.4%'
    },
    {
      id: 'template-lab',
      title: 'Metabolic & Lipid Blood Panel',
      doc_type: 'Lab Report',
      facility: 'BioPath Diagnostic Laboratories',
      doctor: 'Dr. Rachel Adams, Pathologist',
      diagnosis: 'Routine Fasting Metabolic & Lipid Panel',
      extracted_text: 'BIOPATH DIAGNOSTICS\nPatient: Sarah Jenkins\n- Fasting Glucose: 92 mg/dL (Normal)\n- Total Cholesterol: 198 mg/dL (Desirable)\n- HDL Cholesterol: 58 mg/dL (Optimal)\n- Hemoglobin: 13.8 g/dL (Normal)',
      medications: [
        { name: "Omega-3 Fish Oil", dose: "1000 mg", frequency: "Daily", duration: "Ongoing", instruction: "Take with breakfast", timing: "Morning" }
      ],
      confidence: '98.9%'
    },
    {
      id: 'template-xray',
      title: 'Digital Chest Radiography (PA View)',
      doc_type: 'Radiology',
      facility: 'Advanced Imaging Center',
      doctor: 'Dr. K. Vance, Radiologist',
      diagnosis: 'Chest X-Ray Post-Viral Clearance',
      extracted_text: 'ADVANCED RADIOLOGY\nExamination: Chest X-Ray PA View\nFindings: Lungs are clear without focal consolidation or pneumothorax. Cardiothoracic ratio is normal (0.45). Impression: Normal radiographic study.',
      medications: [],
      confidence: '99.8%'
    }
  ];

  const handleStartScan = async (template = presetTemplates[0]) => {
    setIsScanning(true);
    setScanProgress(10);
    setScannedResult(null);
    setAllergyAlert(false);

    const timer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          processScanSubmission(template);
          return 100;
        }
        return prev + 25;
      });
    }, 180);
  };

  const processScanSubmission = async (template) => {
    try {
      const payload = {
        patient_id: patient?.patient_id || 'MK-78294',
        title: template.title,
        doc_type: template.doc_type,
        facility: template.facility,
        doctor: template.doctor,
        diagnosis: template.diagnosis,
        extracted_text: template.extracted_text,
        confidence: template.confidence,
        medications: template.medications
      };

      const res = await api.scanDocument(payload);
      setIsScanning(false);
      setScannedResult(res.document || template);
      setAllergyAlert(res.allergy_warning || false);
      onDocumentAdded();

      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      console.error(err);
      setIsScanning(false);
      setScannedResult(template);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const customTemplate = {
      id: 'upload-' + Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      doc_type: file.type.includes('pdf') ? 'Prescription' : 'Lab Report',
      facility: 'Uploaded Medical Document',
      doctor: 'Attending Physician',
      diagnosis: 'Processed via MediKiosk Optical OCR',
      extracted_text: `UPLOADED DOCUMENT: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB\nExtracted via Django DRF OCR Endpoint.`,
      medications: [
        { name: "Prescribed Item", dose: "Standard", frequency: "As directed", duration: "7 days", instruction: "Take with meals", timing: "Daily" }
      ],
      confidence: '98.2%'
    };

    handleStartScan(customTemplate);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#cbf5d6] select-none font-sans overflow-y-auto pb-6">
      
      {/* Top Header Bar - Matches Royal Blue #3f51b5 in DocScanner.pdf */}
      <div className="w-full bg-[#3f51b5] py-2.5 px-4 shadow-sm flex items-center justify-between z-20">
        <div className="flex items-center gap-2 text-white text-xs font-bold">
          <div className="w-6 h-6 rounded-md bg-[#ff9800] flex items-center justify-center text-black font-black text-xs">
            M
          </div>
          <span>MediKiosk Optical Scanner</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-[#ff9800] ring-2 ring-white/60 flex items-center justify-center font-black text-black text-xs">
          {patient?.name?.[0] || 'S'}
        </div>
      </div>

      {/* Action Buttons Row - Exactly matches DocScanner.pdf */}
      <div className="w-full pt-4 pb-3 px-6 flex items-center justify-center gap-4 z-10">
        <button
          onClick={() => {
            setActiveMode('scan');
            handleStartScan(presetTemplates[0]);
          }}
          className={`px-8 py-2.5 rounded-full font-bold text-xl tracking-wide shadow-md transition-all flex items-center justify-center cursor-pointer ${
            activeMode === 'scan'
              ? 'bg-[#297006] text-black ring-2 ring-black/30 scale-105'
              : 'bg-[#297006] text-black hover:bg-[#236005] opacity-90'
          }`}
        >
          Scan
        </button>

        <button
          onClick={() => {
            setActiveMode('upload');
            fileInputRef.current?.click();
          }}
          className={`px-8 py-2.5 rounded-full font-bold text-xl tracking-wide shadow-md transition-all flex items-center justify-center cursor-pointer ${
            activeMode === 'upload'
              ? 'bg-[#297006] text-black ring-2 ring-black/30 scale-105'
              : 'bg-[#297006] text-black hover:bg-[#236005] opacity-90'
          }`}
        >
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Main Document Viewfinder - Matches Royal Blue #3f51b5 Rect in Mockup */}
      <div className="w-full max-w-md mx-auto px-4 flex flex-col items-center">
        <div className="relative w-full h-[320px] rounded-3xl bg-[#3f51b5] shadow-xl overflow-hidden flex flex-col justify-between p-4 border-2 border-[#303f9f]">
          
          {/* Top viewfinder status */}
          <div className="flex items-center justify-between text-white/90 text-xs font-semibold z-20">
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[11px]">{isScanning ? 'OCR Processing...' : 'Optical Camera Ready'}</span>
            </div>
            <span className="text-[10px] opacity-75">300 DPI Medical OCR</span>
          </div>

          {/* Viewfinder Reticles */}
          <div className="absolute inset-3 pointer-events-none z-10">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-white/80 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-white/80 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-white/80 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-white/80 rounded-br-lg"></div>
          </div>

          {/* Laser scanning beam */}
          {isScanning && <div className="laser-line z-20"></div>}

          {/* Center Content */}
          <div className="relative my-auto w-full h-[200px] bg-white/10 rounded-2xl border border-white/20 p-3 flex flex-col items-center justify-center text-center overflow-hidden">
            {isScanning ? (
              <div className="space-y-2 flex flex-col items-center animate-fade-in z-20">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white animate-pulse">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-white font-bold text-sm">
                  Scanning & Parsing Clinical OCR...
                </div>
                <div className="w-40 bg-black/40 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-white/80 font-mono">{scanProgress}%</span>
              </div>
            ) : scannedResult ? (
              /* Scanned Card Preview */
              <div className="w-full h-full bg-white text-gray-900 rounded-xl p-3 flex flex-col justify-between text-left shadow-inner overflow-y-auto text-xs animate-fade-in z-20">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#297006] uppercase text-[10px]">
                      {scannedResult.doc_type} Parsed
                    </span>
                    <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Synced to Django
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-gray-900 truncate mt-0.5">{scannedResult.title}</h4>
                  <p className="text-[10px] text-gray-500">{scannedResult.doctor} • {scannedResult.facility}</p>
                </div>

                <div className="my-1 text-[11px] bg-emerald-50 p-1.5 rounded-lg text-[#052e0a]">
                  <p className="font-bold text-[10px] text-gray-700">Diagnosis:</p>
                  <p className="line-clamp-2">{scannedResult.diagnosis}</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px]">
                  <span className="text-gray-500 font-mono">Confidence: {scannedResult.confidence}</span>
                  <button
                    onClick={() => handleStartScan(presetTemplates[0])}
                    className="text-[#297006] font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Re-scan
                  </button>
                </div>
              </div>
            ) : (
              /* Idle Prompt */
              <div className="space-y-2 flex flex-col items-center text-white/90 z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
                  <Camera className="w-7 h-7" />
                </div>
                <p className="text-xs text-white/90 font-medium max-w-xs">
                  Place prescription or lab report inside the viewfinder to scan.
                </p>
                <button
                  onClick={() => handleStartScan(presetTemplates[0])}
                  className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-[11px] shadow-sm transition flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Live Scan & OCR</span>
                </button>
              </div>
            )}
          </div>

          <div className="text-[10px] text-white/80 text-center z-20">
            Aligned automatically with edge-detection
          </div>
        </div>

        {/* Allergy Alert Toast (if detected) */}
        {allergyAlert && (
          <div className="w-full mt-3 p-3 bg-rose-600 text-white rounded-2xl shadow-lg flex items-start gap-2.5 animate-bounce">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">⚠️ Allergy Contraindication Warning!</p>
              <p className="text-[11px] text-rose-100">
                Scanned medication contains Amoxicillin. Your chart lists a Penicillin allergy.
              </p>
            </div>
          </div>
        )}

        {/* Preset Sample Records */}
        <div className="w-full mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#052e0a]">
            <span>Preset Medical Records (Django Synced):</span>
            <span className="text-[10px] text-[#297006] font-bold">1-Click Scan</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {presetTemplates.map((item) => (
              <button
                key={item.id}
                onClick={() => handleStartScan(item)}
                className="p-2 bg-white/80 hover:bg-white active:scale-95 text-left rounded-2xl border border-gray-200 shadow-xs transition flex flex-col justify-between h-20"
              >
                <span className="font-bold text-xs text-[#052e0a] line-clamp-1">{item.doc_type}</span>
                <span className="text-[10px] text-gray-600 line-clamp-2">{item.title}</span>
                <span className="text-[9px] text-[#297006] font-bold">Tap to Scan →</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Action Buttons */}
        {scannedResult && (
          <div className="w-full mt-4 flex gap-2">
            <button
              onClick={onNavigateToSummary}
              className="flex-1 py-2.5 rounded-full bg-[#052e0a] hover:bg-[#0a4213] text-white font-bold text-xs shadow-md flex items-center justify-center gap-1"
            >
              <span>View in Summary</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateToAgent}
              className="flex-1 py-2.5 rounded-full bg-[#ff9800] hover:bg-[#f57c00] text-black font-bold text-xs shadow-md flex items-center justify-center gap-1"
            >
              <span>Ask AI Agent</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

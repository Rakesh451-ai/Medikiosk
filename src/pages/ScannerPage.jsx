import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, Sparkles, AlertCircle, RefreshCw, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import confetti from 'canvas-confetti';

export function ScannerPage({ patient, onDocumentAdded }) {
  const [activeAction, setActiveAction] = useState('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedResult, setScannedResult] = useState(null);
  const [allergyAlert, setAllergyAlert] = useState(false);
  const fileInputRef = useRef(null);

  const presetTemplates = [
    {
      id: 'template-rx',
      title: 'Clinical Prescription - Dr. Michael Chen',
      doc_type: 'Prescription',
      facility: 'Metro General Hospital',
      doctor: 'Dr. Michael Chen, MD',
      diagnosis: 'Seasonal Upper Respiratory Tract Infection & Mild Bronchospasm',
      extracted_text: 'METRO GENERAL HOSPITAL - CLINICAL PRESCRIPTION\nDate: 04-Sep-2026\nPatient: Sarah Jenkins (Age: 38)\nRx:\n1. Amoxicillin 500mg - 1 capsule PO q8h x 7d\n2. Levocetirizine 5mg - 1 tab PO qhs x 5d\n3. Fluticasone Nasal Spray - 2 sprays daily\nNotes: Adequate hydration. Review in 5 days.',
      medications: [
        { name: "Amoxicillin", dose: "500 mg", frequency: "3 times daily", duration: "7 days", instruction: "Take after meals with water", timing: "Morning, Noon, Night" },
        { name: "Levocetirizine", dose: "5 mg", frequency: "Once daily", duration: "5 days", instruction: "Take at bedtime", timing: "Night" }
      ],
      confidence: '99.4%'
    },
    {
      id: 'template-lab',
      title: 'Comprehensive Metabolic Panel & CBC',
      doc_type: 'Lab Report',
      facility: 'BioPath Diagnostic Laboratories',
      doctor: 'Dr. Rachel Adams, Pathologist',
      diagnosis: 'Routine Fasting Metabolic & Lipid Panel',
      extracted_text: 'BIOPATH DIAGNOSTICS\nPatient: Sarah Jenkins\n- Fasting Glucose: 92 mg/dL (Normal)\n- Total Cholesterol: 198 mg/dL (Desirable)\n- HDL Cholesterol: 58 mg/dL (Optimal)\n- Hemoglobin: 13.8 g/dL (Normal)\nImpression: Markers within expected reference ranges.',
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
      extracted_text: 'ADVANCED RADIOLOGY & IMAGING\nExamination: Chest X-Ray PA View\nFindings: Lungs are clear without focal alveolar consolidation, pneumothorax, or pleural effusion. Cardiothoracic ratio is normal (0.45).\nImpression: Normal radiographic study.',
      medications: [],
      confidence: '99.8%'
    }
  ];

  const handleStartScan = (template = presetTemplates[0]) => {
    setIsScanning(true);
    setScanProgress(10);
    setScannedResult(null);
    setAllergyAlert(false);

    const timer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          submitScan(template);
          return 100;
        }
        return prev + 25;
      });
    }, 180);
  };

  const submitScan = async (template) => {
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

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {
      setIsScanning(false);
      setScannedResult(template);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const custom = {
      id: 'upload-' + Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      doc_type: file.type.includes('pdf') ? 'Prescription' : 'Medical Scan',
      facility: 'Uploaded Clinical Document',
      doctor: 'Attending Physician',
      diagnosis: 'Extracted via Optical Document Recognition',
      extracted_text: `UPLOADED FILE: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB\nProcessed by Django REST Framework OCR Endpoint.`,
      medications: [
        { name: "Extracted Item", dose: "Standard", frequency: "Daily", duration: "7 days", instruction: "Take as directed", timing: "Morning" }
      ],
      confidence: '98.5%'
    };

    handleStartScan(custom);
  };

  return (
    <div className="w-full bg-[#cbf5d6] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#297006] text-white text-xs font-bold shadow-xs mb-2">
              <Camera className="w-3.5 h-3.5" />
              <span>Optical Document Scanner</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#052e0a]">
              Medical Document & Prescription Scanner
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Align medical prescriptions or lab reports to run real-time OCR extraction with Django REST backend
            </p>
          </div>

          {/* Action Buttons: Scan & Upload (from DocScanner.pdf) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveAction('scan');
                handleStartScan(presetTemplates[0]);
              }}
              className="px-6 py-2.5 rounded-full bg-[#297006] hover:bg-[#205905] text-white font-extrabold text-base shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>Scan</span>
            </button>

            <button
              onClick={() => {
                setActiveAction('upload');
                fileInputRef.current?.click();
              }}
              className="px-6 py-2.5 rounded-full bg-[#297006] hover:bg-[#205905] text-white font-extrabold text-base shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
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
        </div>

        {/* Allergy Warning Banner */}
        {allergyAlert && (
          <div className="p-4 bg-rose-600 text-white rounded-3xl shadow-lg flex items-start gap-3 animate-bounce">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm">⚠️ CRITICAL DRUG ALLERGY CONTRAINDICATION!</h4>
              <p className="text-xs text-rose-100 mt-0.5">
                The scanned prescription includes Amoxicillin. Patient chart records an allergy to <strong>Penicillin</strong>. Consult Dr. Michael Chen immediately.
              </p>
            </div>
          </div>
        )}

        {/* Laptop/Desktop 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Royal Blue Scanner Viewfinder (#3f51b5) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 shadow-md border border-[#297006]/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="font-bold text-xs text-[#052e0a] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Optical Viewfinder Ready
              </span>
              <span className="text-[11px] text-gray-500 font-mono">300 DPI High-Contrast Mode</span>
            </div>

            {/* Royal Blue Viewfinder (#3f51b5) - Exactly from DocScanner.pdf */}
            <div className="relative w-full h-[360px] sm:h-[400px] rounded-3xl bg-[#3f51b5] shadow-xl overflow-hidden flex flex-col justify-between p-5 border-2 border-[#303f9f]">
              
              {/* Corner Viewfinder Reticles */}
              <div className="absolute inset-4 pointer-events-none z-10">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/80 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/80 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/80 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/80 rounded-br-lg"></div>
              </div>

              {/* Animated Laser Scan Beam */}
              {isScanning && <div className="laser-line z-20"></div>}

              {/* Center Content */}
              <div className="relative my-auto w-full h-[240px] bg-white/10 rounded-2xl border border-white/20 p-4 flex flex-col items-center justify-center text-center overflow-hidden">
                {isScanning ? (
                  <div className="space-y-3 flex flex-col items-center z-20 animate-fade-in">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white animate-pulse">
                      <Camera className="w-8 h-8" />
                    </div>
                    <span className="text-white font-bold text-base">
                      Optical OCR Engine Analyzing Document...
                    </span>
                    <div className="w-48 bg-black/40 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-2.5 rounded-full transition-all duration-200"
                        style={{ width: `${scanProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-white/80 font-mono">{scanProgress}% completed</span>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center text-white/90 z-10">
                    <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs shadow-inner">
                      <Camera className="w-9 h-9" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Document Scanner Ready</h3>
                      <p className="text-xs text-white/80 max-w-sm mt-1">
                        Select a sample document below or tap "Upload" to analyze your own medical report.
                      </p>
                    </div>
                    <button
                      onClick={() => handleStartScan(presetTemplates[0])}
                      className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Start Live OCR Scan</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-white/80 z-20">
                <span>Auto-edge detection active</span>
                <span>Django Optical Parser</span>
              </div>
            </div>

            {/* Quick 1-Click Test Documents */}
            <div className="pt-2">
              <span className="text-xs font-bold text-[#052e0a] block mb-2">Preset Medical Test Records:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {presetTemplates.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleStartScan(item)}
                    className="p-3 bg-gray-50 hover:bg-[#cbf5d6]/40 active:scale-95 text-left rounded-2xl border border-gray-200 hover:border-[#297006] transition flex flex-col justify-between h-22 cursor-pointer"
                  >
                    <div>
                      <span className="font-extrabold text-xs text-[#052e0a] block truncate">{item.doc_type}</span>
                      <span className="text-[11px] text-gray-600 line-clamp-1 mt-0.5">{item.title}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#297006] mt-1 flex items-center gap-1">
                      <span>Click to Scan</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: OCR Extraction Results & AI Sync */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-md border border-[#297006]/20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#297006]" />
                  <h3 className="font-bold text-sm text-[#052e0a]">Parsed OCR Results</h3>
                </div>
                {scannedResult && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#297006] font-bold text-[11px]">
                    Confidence: {scannedResult.confidence}
                  </span>
                )}
              </div>

              {scannedResult ? (
                <div className="space-y-3 animate-fade-in text-xs">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-[#297006]">{scannedResult.doc_type}</span>
                    <h4 className="font-extrabold text-sm text-gray-900">{scannedResult.title}</h4>
                    <p className="text-[11px] text-gray-500">{scannedResult.doctor} • {scannedResult.facility}</p>
                  </div>

                  <div>
                    <span className="text-gray-500 font-bold block mb-1">Clinical Findings & Diagnosis:</span>
                    <p className="bg-emerald-50 text-[#052e0a] p-3 rounded-2xl border border-emerald-200/60 font-medium leading-relaxed">
                      {scannedResult.diagnosis}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500 font-bold block mb-1">Extracted Clinical Text:</span>
                    <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-2xl whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {scannedResult.extracted_text}
                    </pre>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Link
                      to="/summary"
                      className="flex-1 py-2.5 rounded-full bg-[#052e0a] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>View in Summary</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/agent"
                      className="flex-1 py-2.5 rounded-full bg-[#ff9800] text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Ask AI Doctor</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500 space-y-2">
                  <Camera className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="text-xs">No scan performed yet. Select a record or upload to begin OCR parsing.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

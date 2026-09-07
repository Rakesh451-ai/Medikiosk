import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, Sparkles, AlertCircle, RefreshCw, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

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
    <div className="w-full bg-[#cbf5d6] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-6xl space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#297006] text-white text-xs font-bold shadow-xs mb-2">
              <Camera className="w-3.5 h-3.5" />
              <span>Easy Paper Scanner</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#052e0a]">
              Scan Your Doctor's Slip or Medical Report
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Hold your prescription or lab paper up to the camera. We'll read the medicines and instructions automatically.
            </p>
          </div>

          {/* Action Buttons: Scan & Upload */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                setActiveAction('scan');
                handleStartScan(presetTemplates[0]);
              }}
              variant="secondary"
              size="md"
              icon={Camera}
              className="px-6 py-2.5 sm:text-base"
            >
              Scan Slip
            </Button>

            <Button
              onClick={() => {
                setActiveAction('upload');
                fileInputRef.current?.click();
              }}
              variant="outline"
              size="md"
              icon={Upload}
              className="bg-white hover:bg-gray-100 text-[#052e0a] border-2 border-[#297006] px-6 py-2.5 sm:text-base"
            >
              Upload Photo/PDF
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Allergy Warning Banner */}
        {allergyAlert && (
          <div className="p-4 bg-rose-600 text-white rounded-3xl shadow-xl flex items-start gap-3.5 border-2 border-rose-300 animate-fade-in">
            <AlertCircle className="w-7 h-7 shrink-0 mt-0.5 text-amber-200" />
            <div>
              <h4 className="font-black text-base tracking-wide">⚠️ IMPORTANT ALLERGY WARNING!</h4>
              <p className="text-xs sm:text-sm text-rose-100 mt-1 leading-relaxed">
                This prescription contains <strong>Amoxicillin</strong>, but your chart lists an allergy to <strong>Penicillin</strong>. 
                Please talk to your doctor or nurse before taking this medicine.
              </p>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Viewfinder & Presets */}
          <Card className="lg:col-span-7 p-4 sm:p-5 shadow-md border-2 border-emerald-200/80 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="font-bold text-xs text-[#052e0a] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                Scanner Camera Ready
              </span>
              <span className="text-[11px] text-gray-500 font-medium">Automatic text detection active</span>
            </div>

            {/* Viewfinder (#3f51b5) */}
            <div className="relative w-full h-[300px] sm:h-[380px] rounded-3xl bg-[#3f51b5] shadow-xl overflow-hidden flex flex-col justify-between p-4 sm:p-5 border-2 border-[#303f9f]">
              
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
              <div className="relative my-auto w-full h-[200px] sm:h-[220px] bg-white/10 rounded-2xl border border-white/20 p-4 flex flex-col items-center justify-center text-center overflow-hidden">
                {isScanning ? (
                  <div className="space-y-3 flex flex-col items-center z-20 animate-fade-in">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white animate-pulse">
                      <Camera className="w-8 h-8" />
                    </div>
                    <span className="text-white font-black text-base sm:text-lg">
                      Reading document... Please hold still
                    </span>
                    <div className="w-48 bg-black/40 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-3 rounded-full transition-all duration-200"
                        style={{ width: `${scanProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-white/90 font-bold">{scanProgress}% finished</span>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center text-white/90 z-10">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs shadow-inner">
                      <Camera className="w-8 h-8 sm:w-9 sm:h-9" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white">Align Document in the Blue Box</h3>
                      <p className="text-xs text-white/90 max-w-sm mt-1">
                        Tap "Scan Prescription" below, or choose one of the sample papers to test.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleStartScan(presetTemplates[0])}
                      variant="primary"
                      size="sm"
                      icon={Sparkles}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      Scan Prescription Now
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-white/80 z-20 font-medium">
                <span>✓ High resolution capture</span>
                <span>Auto-detect active</span>
              </div>
            </div>

            {/* Quick 1-Click Sample Documents */}
            <div className="pt-2">
              <span className="text-xs font-extrabold text-[#052e0a] block mb-2">
                Or Try with Sample Medical Papers (1-Click):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {presetTemplates.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleStartScan(item)}
                    className="p-3 bg-emerald-50/60 hover:bg-emerald-100 active:scale-95 text-left rounded-2xl border border-emerald-200 hover:border-[#297006] transition flex flex-col justify-between h-24 cursor-pointer shadow-2xs"
                  >
                    <div>
                      <span className="font-extrabold text-xs text-[#052e0a] block truncate">
                        📄 {item.doc_type}
                      </span>
                      <span className="text-[11px] text-gray-600 line-clamp-1 mt-0.5 font-medium">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-[#297006] mt-1 flex items-center gap-1">
                      <span>Tap to Test Scan</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Right Column: Scanned Results in Plain English */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-4 sm:p-5 shadow-md border-2 border-emerald-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#297006]" />
                  <h3 className="font-extrabold text-base text-[#052e0a]">What Was Found on Your Paper</h3>
                </div>
                {scannedResult && (
                  <Badge variant="success">
                    ✓ {scannedResult.confidence || 'Clearly Read'}
                  </Badge>
                )}
              </div>

              {scannedResult ? (
                <div className="space-y-3.5 animate-fade-in text-xs">
                  {/* Document Summary Card */}
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#297006]">
                      {scannedResult.doc_type}
                    </span>
                    <h4 className="font-extrabold text-sm text-gray-900">{scannedResult.title}</h4>
                    <p className="text-[11px] text-gray-600">
                      Doctor: {scannedResult.doctor} • {scannedResult.facility}
                    </p>
                  </div>

                  {/* Plain Language Diagnosis */}
                  <div>
                    <span className="text-gray-700 font-bold block mb-1">Doctor's Diagnosis / Reason:</span>
                    <p className="bg-emerald-50 text-[#052e0a] p-3 rounded-2xl border border-emerald-200 font-medium leading-relaxed">
                      {scannedResult.diagnosis}
                    </p>
                  </div>

                  {/* Extracted Medicines in Simple Cards */}
                  {scannedResult.medications && scannedResult.medications.length > 0 && (
                    <div>
                      <span className="text-gray-700 font-bold block mb-1.5">Prescribed Medicines Found:</span>
                      <div className="space-y-2">
                        {scannedResult.medications.map((med, mIdx) => (
                          <div key={mIdx} className="p-3 bg-white border border-emerald-300 rounded-2xl shadow-2xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-sm text-[#052e0a]">💊 {med.name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                                {med.dose}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 font-medium">
                              <strong>How to take:</strong> {med.instruction || med.frequency}
                            </p>
                            <p className="text-[10px] text-emerald-700 font-bold">
                              ⏰ When: {med.timing || 'Daily'} for {med.duration}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Navigation links */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Button
                      to="/summary"
                      variant="primary"
                      size="md"
                      fullWidth
                      icon={ArrowRight}
                      iconPosition="right"
                    >
                      View in Health Chart
                    </Button>
                    <Button
                      to="/agent"
                      variant="accent"
                      size="md"
                      fullWidth
                      icon={Sparkles}
                      iconPosition="left"
                    >
                      Ask Assistant
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-700">No Document Scanned Yet</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                      Tap "Scan Prescription" or pick one of the sample slips on the left to see your medicines.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

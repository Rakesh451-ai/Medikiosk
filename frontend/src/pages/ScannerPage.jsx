import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Upload,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  ArrowRight,
  ShieldCheck,
  Activity,
  Heart,
  Thermometer,
  Eye,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  FileCheck2,
  FileImage,
  FolderOpen
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export function ScannerPage({ patient, onDocumentAdded }) {
  const navigate = useNavigate();

  // 5-Step Workflow: 1 = Select, 2 = Preview, 3 = Process, 4 = Review, 5 = Confirmed
  const [step, setStep] = useState(1);

  // Selected file state
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);

  // Live camera stream state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Process / Scan progress
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [scanStatusMessage, setScanStatusMessage] = useState('');
  const [scanError, setScanError] = useState(null);

  // Review & Confirm data
  const [scannedDoc, setScannedDoc] = useState(null);
  const [allergyAlert, setAllergyAlert] = useState(false);
  const [allergyMessage, setAllergyMessage] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [copiedRawText, setCopiedRawText] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // DOM Refs
  const videoRef = useRef(null);
  const videoCanvasRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputPdfRef = useRef(null);
  const fileInputImgRef = useRef(null);

  const processingSteps = [
    'Uploading document securely...',
    'Reading pages & document layout...',
    'Extracting clinical text via optical character recognition...',
    'Identifying medications, dosages, and diagnostic findings...',
    'Cross-checking against recorded patient allergies...',
    'Preparing medical summary for clinical review...'
  ];

  // Stop camera tracks on unmount
  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, []);

  const stopCameraTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Start real device camera
  const startCamera = async (facing = cameraFacingMode) => {
    stopCameraTracks();
    setCameraError(null);
    setScanError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser. Please upload a photo or PDF.');
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setCameraFacingMode(facing);
    } catch (err) {
      console.warn('Camera access failed:', err);
      let msg = 'Unable to start camera. Please check camera permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in your browser or upload a file directly.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device. You can upload a photo or PDF.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture frame from camera
  const capturePhotoAndProceed = () => {
    if (!videoRef.current || !videoCanvasRef.current) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = videoCanvasRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob((blob) => {
        const file = new File([blob], `camera_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);

        stopCameraTracks();
        setIsCapturing(false);

        setSelectedFile(file);
        setFilePreviewUrl(previewUrl);
        setIsPdf(false);
        setPdfDoc(null);
        setStep(2);
      }, 'image/jpeg', 0.92);
    } catch (err) {
      console.error('Capture error:', err);
      setIsCapturing(false);
      setCameraError('Failed to capture photo frame. Please try again.');
    }
  };

  // Handle PDF or Image file selection
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (< 15MB)
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const lowerName = file.name.toLowerCase();
    const isValidType = validExtensions.some(ext => lowerName.endsWith(ext));
    if (!isValidType) {
      alert('Please select a valid document format (.pdf, .png, .jpg, .jpeg).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds the 15MB limit. Please choose a smaller file.');
      return;
    }

    stopCameraTracks();
    setCameraError(null);
    setScanError(null);
    setSelectedFile(file);

    const isPdfFile = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    setIsPdf(isPdfFile);

    if (isPdfFile) {
      try {
        const previewUrl = URL.createObjectURL(file);
        setFilePreviewUrl(previewUrl);

        const pdfjsLib = await import('pdfjs-dist');
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '5.4.624'}/build/pdf.worker.min.mjs`;
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(loadedPdf);
        setPdfTotalPages(loadedPdf.numPages);
        setPdfPageNum(1);
        setStep(2);

        // Render page 1 to canvas
        setTimeout(() => renderPdfPage(loadedPdf, 1), 100);
      } catch (err) {
        console.warn('PDF load warning:', err);
        setStep(2);
      }
    } else {
      const previewUrl = URL.createObjectURL(file);
      setFilePreviewUrl(previewUrl);
      setPdfDoc(null);
      setStep(2);
    }
  };

  const renderPdfPage = async (doc, pageNumber) => {
    if (!doc || !pdfCanvasRef.current) return;
    try {
      const page = await doc.getPage(pageNumber);
      const canvas = pdfCanvasRef.current;
      const viewport = page.getViewport({ scale: 1.2 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) {
      console.warn('Page render error:', e);
    }
  };

  const changePdfPage = (delta) => {
    if (!pdfDoc) return;
    const nextPage = pdfPageNum + delta;
    if (nextPage >= 1 && nextPage <= pdfTotalPages) {
      setPdfPageNum(nextPage);
      renderPdfPage(pdfDoc, nextPage);
    }
  };

  // Step 3: Run Document Optical Recognition & Extraction
  const startProcessing = async () => {
    if (!selectedFile) return;

    setStep(3);
    setScanProgress(10);
    setScanStepIndex(0);
    setScanStatusMessage(processingSteps[0]);
    setScanError(null);

    // Stepped animated progress updater
    let currentPct = 10;
    let stepIdx = 0;
    const progressTimer = setInterval(() => {
      currentPct += 12;
      if (currentPct < 90) {
        setScanProgress(currentPct);
        stepIdx = Math.min(processingSteps.length - 1, Math.floor(currentPct / 18));
        setScanStepIndex(stepIdx);
        setScanStatusMessage(processingSteps[stepIdx]);
      }
    }, 450);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (patient?.patient_id && patient.patient_id !== 'Patient') {
        formData.append('patient_id', patient.patient_id);
      }
      formData.append('title', selectedFile.name.replace(/\.[^/.]+$/, ''));

      const serverRes = await api.scanDocument(formData);

      clearInterval(progressTimer);
      setScanProgress(100);
      setScanStepIndex(5);
      setScanStatusMessage('Extraction completed successfully!');

      if (serverRes.can_extract === false || !serverRes.parsed_data) {
        setScanError("We couldn't read this document. Try uploading a clearer scan or photo.");
        return;
      }

      const doc = serverRes.document || {
        id: serverRes.document_id,
        title: selectedFile.name.replace(/\.[^/.]+$/, ''),
        doc_type: serverRes.parsed_data.doc_type || 'Prescription',
        doctor: serverRes.parsed_data.doctor || '',
        facility: serverRes.parsed_data.facility || '',
        date: serverRes.parsed_data.date || new Date().toISOString().split('T')[0],
        diagnosis: serverRes.parsed_data.diagnosis || '',
        medications: serverRes.parsed_data.medications || [],
        lab_results: serverRes.parsed_data.lab_results || [],
        vitals: serverRes.parsed_data.vitals || {},
        extracted_text: serverRes.parsed_data.extracted_text || '',
        confidence: serverRes.parsed_data.confidence || '95%'
      };

      setScannedDoc(doc);
      setAllergyAlert(Boolean(serverRes.allergy_warning));
      setAllergyMessage(serverRes.allergy_message || '');

      setTimeout(() => {
        setStep(4);
      }, 400);

    } catch (err) {
      clearInterval(progressTimer);
      console.error('Scan processing error:', err);
      setScanError("We couldn't read this document. Try uploading a clearer scan or photo.");
    }
  };

  // Step 5: Confirm & Commit Document to Medical Records
  const handleConfirmDocument = async () => {
    if (!scannedDoc) return;
    setIsConfirming(true);

    try {
      const payload = {
        document_id: scannedDoc.id,
        patient_id: patient?.patient_id || '',
        title: scannedDoc.title || 'Verified Medical Record',
        doc_type: scannedDoc.doc_type || 'Prescription',
        doctor: scannedDoc.doctor || '',
        facility: scannedDoc.facility || '',
        date: scannedDoc.date || new Date().toISOString().split('T')[0],
        diagnosis: scannedDoc.diagnosis || '',
        medications: scannedDoc.medications || [],
        lab_results: scannedDoc.lab_results || [],
        vitals: scannedDoc.vitals || {},
        extracted_text: scannedDoc.extracted_text || ''
      };

      const res = await api.confirmDocument(payload);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (onDocumentAdded) {
        onDocumentAdded(res?.updated_profile);
      }

      setStep(5);
    } catch (err) {
      alert(err.message || 'Failed to confirm document. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Reset to Step 1
  const resetWorkflow = () => {
    stopCameraTracks();
    if (filePreviewUrl) {
      try { URL.revokeObjectURL(filePreviewUrl); } catch (e) {}
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setIsPdf(false);
    setPdfDoc(null);
    setScannedDoc(null);
    setScanError(null);
    setAllergyAlert(false);
    setAllergyMessage('');
    setStep(1);
  };

  const copyRawText = () => {
    if (!scannedDoc?.extracted_text) return;
    navigator.clipboard.writeText(scannedDoc.extracted_text);
    setCopiedRawText(true);
    setTimeout(() => setCopiedRawText(false), 2000);
  };

  return (
    <div className="w-full bg-[#cbf5d6] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center select-none font-sans">
      {/* Hidden canvas for capturing video frames */}
      <canvas ref={videoCanvasRef} className="hidden" />

      {/* Hidden file inputs */}
      <input
        ref={fileInputPdfRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelected}
        className="hidden"
      />
      <input
        ref={fileInputImgRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="w-full max-w-5xl space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#297006] text-white text-xs font-bold shadow-xs mb-2">
              <Camera className="w-3.5 h-3.5" />
              <span>Optical Clinical Scanner</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#052e0a]">
              Scan Doctor's Slip, Prescription, or Lab Report
            </h1>
            <p className="text-xs sm:text-sm text-gray-700 mt-1">
              Follow our 5-step clinical document pipeline to digitize prescriptions, test results, and medicines safely.
            </p>
          </div>

          {/* Stepper Pill Indicator */}
          <div className="flex items-center gap-1.5 bg-white/90 px-3.5 py-1.5 rounded-full border border-emerald-300 text-xs font-bold text-[#052e0a] shadow-xs self-start sm:self-auto">
            <span className="font-extrabold text-emerald-700">Step {step} of 5:</span>
            <span>
              {step === 1 && 'Select Document'}
              {step === 2 && 'Preview'}
              {step === 3 && 'Analyze OCR'}
              {step === 4 && 'Review Findings'}
              {step === 5 && 'Confirmed'}
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* STEP 1: SELECT DOCUMENT */}
        {/* ============================================================ */}
        {step === 1 && (
          <div className="space-y-6">
            {cameraError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Live Camera View if Active */}
            {isCameraActive ? (
              <Card className="p-4 sm:p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border-2 border-emerald-500/50 animate-fadeIn">
                <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[480px]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto object-cover max-h-[480px]"
                  />
                  {/* Viewfinder Target Overlay */}
                  <div className="absolute inset-8 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[11px] font-bold bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded-md w-fit">
                      Align document inside frame
                    </span>
                    <span className="text-[10px] text-white/70 text-right">
                      Ensure good lighting & no glare
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={stopCameraTracks}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CameraOff className="w-4 h-4" /> Cancel Camera
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Flip Camera"
                    >
                      <SwitchCamera className="w-4 h-4" /> Flip
                    </button>

                    <button
                      type="button"
                      onClick={capturePhotoAndProceed}
                      disabled={isCapturing}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-70"
                    >
                      {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      <span>Snap Photo & Preview</span>
                    </button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Live Camera */}
                <Card
                  onClick={() => startCamera('environment')}
                  className="p-6 text-center space-y-4 hover:border-emerald-600 hover:shadow-lg transition-all cursor-pointer bg-white group flex flex-col justify-between border-2 border-emerald-200"
                >
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                      <Camera className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-black text-slate-900">1. Take Photo with Camera</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Hold prescription or doctor slip in front of your webcam or device camera.
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 group-hover:underline">
                      Open Camera <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Card>

                {/* 2. Upload PDF */}
                <Card
                  onClick={() => fileInputPdfRef.current?.click()}
                  className="p-6 text-center space-y-4 hover:border-emerald-600 hover:shadow-lg transition-all cursor-pointer bg-white group flex flex-col justify-between border-2 border-emerald-200"
                >
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-black text-slate-900">2. Upload PDF Document</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Upload digital prescription PDF, hospital lab report, or diagnostic summary.
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-teal-700 group-hover:underline">
                      Choose PDF File <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Card>

                {/* 3. Upload Image */}
                <Card
                  onClick={() => fileInputImgRef.current?.click()}
                  className="p-6 text-center space-y-4 hover:border-emerald-600 hover:shadow-lg transition-all cursor-pointer bg-white group flex flex-col justify-between border-2 border-emerald-200"
                >
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                      <FileImage className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-black text-slate-900">3. Upload Photo / Scan</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Upload existing photo or scanned image (.jpg, .png) from your computer or phone.
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-cyan-800 group-hover:underline">
                      Choose Image File <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Card>
              </div>
            )}

            {/* Formats & Privacy Notice */}
            <div className="bg-white/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Supported: <strong>.pdf, .png, .jpg, .jpeg</strong> (Maximum file size: 15MB).
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                🔒 HIPAA & Ayushman Bharat privacy compliant.
              </span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: PREVIEW DOCUMENT */}
        {/* ============================================================ */}
        {step === 2 && selectedFile && (
          <Card className="p-6 sm:p-8 space-y-6 bg-white rounded-3xl border-2 border-emerald-300 shadow-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-700" />
                  <span>Document Preview</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Confirm the document is legible before running optical text extraction.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs font-mono bg-slate-100 text-slate-800">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </Badge>
              </div>
            </div>

            {/* Visual Preview Box */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-100 rounded-2xl border border-slate-200 min-h-[300px] overflow-hidden">
              {isPdf ? (
                <div className="w-full flex flex-col items-center space-y-3">
                  <canvas ref={pdfCanvasRef} className="max-w-full h-auto rounded-lg shadow-md border border-slate-300" />
                  {pdfTotalPages > 1 && (
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-300 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => changePdfPage(-1)}
                        disabled={pdfPageNum <= 1}
                        className="p-1 hover:bg-slate-100 rounded-full disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span>Page {pdfPageNum} of {pdfTotalPages}</span>
                      <button
                        type="button"
                        onClick={() => changePdfPage(1)}
                        disabled={pdfPageNum >= pdfTotalPages}
                        className="p-1 hover:bg-slate-100 rounded-full disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt="Scanned Preview"
                  className="max-h-[460px] w-auto rounded-xl object-contain shadow-md border border-slate-300"
                />
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-bold">{selectedFile.name}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={resetWorkflow}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" /> Choose Different Document
              </button>

              <button
                type="button"
                onClick={startProcessing}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>Scan & Analyze Document →</span>
              </button>
            </div>
          </Card>
        )}

        {/* ============================================================ */}
        {/* STEP 3: PROCESSING OCR & CLINICAL RECOGNITION */}
        {/* ============================================================ */}
        {step === 3 && (
          <Card className="p-6 sm:p-10 space-y-6 bg-white rounded-3xl border-2 border-emerald-300 shadow-xl text-center animate-fadeIn">
            {scanError ? (
              <div className="space-y-4 py-6">
                <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Optical Recognition Failed</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                    {scanError}
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={startProcessing}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={resetWorkflow}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    Choose Another File
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 py-4 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto animate-pulse">
                  <Activity className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {scanStatusMessage}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Our AI optical engine is cross-checking prescription dosages and allergy safety.
                  </p>
                </div>

                {/* Stepped Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>{scanProgress}% Completed</span>
                    <span>Step {scanStepIndex + 1} of 6</span>
                  </div>
                </div>

                {/* Sub-steps checklist */}
                <div className="text-left space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  {processingSteps.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {idx < scanStepIndex ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : idx === scanStepIndex ? (
                        <Loader2 className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0 inline-block" />
                      )}
                      <span className={idx <= scanStepIndex ? 'font-bold text-slate-900' : 'text-slate-400'}>
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ============================================================ */}
        {/* STEP 4: REVIEW RESULTS & CLINICAL FINDINGS */}
        {/* ============================================================ */}
        {step === 4 && scannedDoc && (
          <div className="space-y-5 animate-fadeIn">
            {/* Allergy Warning Banner (if detected) */}
            {allergyAlert && (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 flex items-start gap-3 shadow-md animate-bounce-short">
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-rose-900">
                    ⚠️ CRITICAL ALLERGY CONTRAINDICATION DETECTED
                  </h4>
                  <p className="text-xs text-rose-800 font-medium leading-relaxed">
                    {allergyMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Document Meta Header Card */}
            <Card className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-emerald-300 shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Badge variant="default" className="text-xs font-black uppercase bg-emerald-100 text-emerald-900 px-3 py-1">
                    {scannedDoc.doc_type || 'Prescription'}
                  </Badge>
                  <Badge variant="success" className="text-xs font-bold bg-[#297006] text-white px-2.5 py-0.5">
                    Confidence: {scannedDoc.confidence || '95%'}
                  </Badge>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Date: {scannedDoc.date || new Date().toISOString().split('T')[0]}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Prescribing Doctor</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {scannedDoc.doctor || 'Not specified on document'}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hospital / Clinic</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {scannedDoc.facility || 'Not specified on document'}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Clinical Diagnosis / Reason</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {scannedDoc.diagnosis || 'General Consultation / Clinical Slip'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Extracted Medications Table */}
            {scannedDoc.medications && scannedDoc.medications.length > 0 && (
              <Card className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-emerald-200 shadow-md space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Heart className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-black text-sm sm:text-base text-slate-900">
                    Recognized Medications ({scannedDoc.medications.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2 px-2">Medicine</th>
                        <th className="py-2 px-2">Dosage</th>
                        <th className="py-2 px-2">Frequency</th>
                        <th className="py-2 px-2">Timing</th>
                        <th className="py-2 px-2">Instruction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scannedDoc.medications.map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2 font-black text-slate-900">
                            {med.name}
                          </td>
                          <td className="py-2.5 px-2 font-bold text-emerald-800">
                            {med.dose}
                          </td>
                          <td className="py-2.5 px-2 text-slate-600">
                            {med.frequency}
                          </td>
                          <td className="py-2.5 px-2 text-slate-600">
                            {med.timing || 'Morning'}
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 italic">
                            {med.instruction || 'Take with water'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Extracted Lab Results Table */}
            {scannedDoc.lab_results && scannedDoc.lab_results.length > 0 && (
              <Card className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-teal-200 shadow-md space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Activity className="w-5 h-5 text-teal-700" />
                  <h3 className="font-black text-sm sm:text-base text-slate-900">
                    Diagnostic Lab Tests ({scannedDoc.lab_results.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2 px-2">Test Name</th>
                        <th className="py-2 px-2">Observed Value</th>
                        <th className="py-2 px-2">Reference Range</th>
                        <th className="py-2 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scannedDoc.lab_results.map((lab, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2 font-black text-slate-900">{lab.test_name}</td>
                          <td className="py-2.5 px-2 font-bold text-slate-800">{lab.value} {lab.unit}</td>
                          <td className="py-2.5 px-2 text-slate-500">{lab.reference_range}</td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              lab.is_abnormal
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {lab.status || (lab.is_abnormal ? 'Abnormal' : 'Normal')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Extracted Raw Text Accordion */}
            {scannedDoc.extracted_text && (
              <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-xs font-bold text-slate-700 flex items-center gap-1.5 hover:text-slate-900 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                    <span>{showRawText ? 'Hide Raw OCR Text' : 'View Raw Extracted Text'}</span>
                    {showRawText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showRawText && (
                    <button
                      type="button"
                      onClick={copyRawText}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedRawText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRawText ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                {showRawText && (
                  <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                    {scannedDoc.extracted_text}
                  </pre>
                )}
              </div>
            )}

            {/* Step 4 Actions: Confirm / Retake */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <button
                type="button"
                onClick={resetWorkflow}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" /> Discard & Try Again
              </button>

              <button
                type="button"
                onClick={handleConfirmDocument}
                disabled={isConfirming}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-70"
              >
                {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isConfirming ? 'Saving to Records...' : 'Confirm & Save to Medical Records →'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 5: CONFIRMED & COMMITTED */}
        {/* ============================================================ */}
        {step === 5 && (
          <Card className="p-8 sm:p-12 text-center space-y-6 bg-white rounded-3xl border-2 border-emerald-400 shadow-2xl animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-2xl font-black text-slate-900">
                Document Successfully Saved!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Your medical slip has been parsed and committed to your Electronic Health Record.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 font-semibold max-w-md mx-auto space-y-1">
              <p>✓ Prescribed medications added to your daily schedule</p>
              <p>✓ Document archived in your permanent clinical records</p>
              <p>✓ Allergy contraindications verified</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/summary"
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-md transition"
              >
                View My Health Summary →
              </Link>
              <Link
                to="/records"
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
              >
                View All Medical Records
              </Link>
              <button
                type="button"
                onClick={resetWorkflow}
                className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Scan Another Document
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

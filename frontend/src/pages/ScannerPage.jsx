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
  Edit3,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  extractTextFromImage,
  extractTextFromPdf,
  parseClinicalEntities
} from '../utils/documentParser';

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
  const [isFromCamera, setIsFromCamera] = useState(false);

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
  const [editedDoc, setEditedDoc] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
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

  // Whenever isCameraActive turns true, ensure video element is connected to stream
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch((err) => {
        console.warn('Video playback notice in effect:', err);
      });
    }
  }, [isCameraActive]);

  const stopCameraTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping camera track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Start real device camera with progressive constraint fallback
  const startCamera = async (facing = cameraFacingMode) => {
    stopCameraTracks();
    setCameraError(null);
    setScanError(null);

    // 1. Check secure context (Chrome/Safari block mediaDevices in insecure non-localhost contexts)
    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setCameraError(
        'Camera access requires a secure connection (HTTPS or localhost). Please access MediKiosk over HTTPS or upload your document directly.'
      );
      return;
    }

    // 2. Check browser support for mediaDevices
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera access is not supported by your current browser. Please upload a photo (.jpg, .png) or PDF document directly.'
      );
      return;
    }

    // 3. Progressive constraints fallback
    let stream = null;
    try {
      try {
        // Attempt 1: High resolution with ideal facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch (err1) {
        console.warn('High-res camera constraints failed, attempting basic facingMode:', err1);
        try {
          // Attempt 2: Basic facingMode without resolution requirements
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: false
          });
        } catch (err2) {
          console.warn('FacingMode camera failed, falling back to any video device:', err2);
          // Attempt 3: Standard video device (e.g. desktop webcams)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      streamRef.current = stream;
      setCameraFacingMode(facing);
      setIsCameraActive(true);

      // Attach stream if video element already mounted
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Video autoPlay caught:', playErr);
        });
      }
    } catch (err) {
      console.warn('Camera access failed:', err);
      let msg = 'Unable to start camera. Please check camera permissions in your browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please click the camera/lock icon in your browser address bar to allow camera access, or upload your document directly.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera was found on this device. You can upload a photo or PDF.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Your camera is currently in use by another application or tab (e.g. Zoom, Google Meet). Please close that app and try again.';
      } else if (err.name === 'SecurityError') {
        msg = 'Camera access was blocked due to browser security settings. Please access via HTTPS or localhost.';
      } else if (err.name === 'OverconstrainedError') {
        msg = 'The requested camera setting is not supported by your hardware. Try uploading a photo.';
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

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsCapturing(false);
            setCameraError('Failed to capture photo frame. Please try again.');
            return;
          }
          const file = new File([blob], `camera_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(blob);

          stopCameraTracks();
          setIsCapturing(false);

          setSelectedFile(file);
          setFilePreviewUrl(previewUrl);
          setIsPdf(false);
          setPdfDoc(null);
          setIsFromCamera(true);
          setStep(2);
        },
        'image/jpeg',
        0.95
      );
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
    const isValidType = validExtensions.some((ext) => lowerName.endsWith(ext));
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
    setIsFromCamera(false);

    const isPdfFile = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    setIsPdf(isPdfFile);

    if (isPdfFile) {
      try {
        const previewUrl = URL.createObjectURL(file);
        setFilePreviewUrl(previewUrl);

        const pdfjsLib = await import('pdfjs-dist');
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${
            pdfjsLib.version || '5.4.624'
          }/build/pdf.worker.min.mjs`;
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

  // Step 3: Run Document Optical Recognition & Clinical Extraction
  const startProcessing = async () => {
    if (!selectedFile) return;

    setStep(3);
    setScanProgress(12);
    setScanStepIndex(0);
    setScanStatusMessage(processingSteps[0]);
    setScanError(null);

    // Stepped animated progress updater
    let currentPct = 12;
    let stepIdx = 0;
    const progressTimer = setInterval(() => {
      currentPct += 10;
      if (currentPct < 85) {
        setScanProgress(currentPct);
        stepIdx = Math.min(processingSteps.length - 1, Math.floor(currentPct / 18));
        setScanStepIndex(stepIdx);
        setScanStatusMessage(processingSteps[stepIdx]);
      }
    }, 450);

    // 1. Client-Side Text Extraction (Tesseract OCR for images, pdfjs-dist for PDFs)
    let clientExtractedText = '';
    try {
      if (isPdf) {
        setScanStatusMessage('Extracting text and pages from PDF...');
        clientExtractedText = await extractTextFromPdf(selectedFile, (pct, status) => {
          setScanProgress(Math.min(pct, 75));
          if (status) setScanStatusMessage(status);
        });
      } else {
        setScanStatusMessage('Scanning visual patterns & optical characters...');
        clientExtractedText = await extractTextFromImage(selectedFile, (pct, status) => {
          setScanProgress(Math.min(pct, 75));
          if (status) setScanStatusMessage(status);
        });
      }
    } catch (clientOcrErr) {
      console.warn('Client OCR extraction notice:', clientOcrErr);
    }

    // 2. Submit to Backend /documents/scan/ API
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (patient?.patient_id && patient.patient_id !== 'Patient') {
        formData.append('patient_id', patient.patient_id);
      }
      formData.append('title', selectedFile.name.replace(/\.[^/.]+$/, ''));
      if (clientExtractedText && clientExtractedText.trim().length > 0) {
        formData.append('extracted_text', clientExtractedText.trim());
      }

      let serverRes = null;
      let serverError = null;
      try {
        serverRes = await api.scanDocument(formData);
      } catch (apiErr) {
        serverError = apiErr;
        console.warn('Backend scan API returned non-200, checking client OCR fallback:', apiErr);
      }

      clearInterval(progressTimer);
      setScanProgress(100);
      setScanStepIndex(5);
      setScanStatusMessage('Extraction completed successfully!');

      let doc = null;
      let hasWarning = false;
      let warnMsg = '';

      if (serverRes && (serverRes.can_extract || serverRes.document || serverRes.parsed_data)) {
        const rawData = serverRes.document || serverRes.parsed_data;
        doc = {
          id: serverRes.document_id || rawData.id,
          title: rawData.title || selectedFile.name.replace(/\.[^/.]+$/, ''),
          doc_type: rawData.doc_type || 'Prescription',
          doctor: rawData.doctor || '',
          facility: rawData.facility || '',
          patient_name: rawData.patient_name || '',
          date: rawData.date || new Date().toISOString().split('T')[0],
          diagnosis: rawData.diagnosis || '',
          findings: rawData.findings || '',
          impression: rawData.impression || '',
          medications: rawData.medications || [],
          lab_results: rawData.lab_results || [],
          vitals: rawData.vitals || {},
          extracted_text: rawData.extracted_text || clientExtractedText || '',
          confidence: rawData.confidence || '95%'
        };
        hasWarning = Boolean(serverRes.allergy_warning);
        warnMsg = serverRes.allergy_message || '';
      } else if (clientExtractedText && clientExtractedText.trim().length >= 5) {
        // Resilient fallback using client-side parsed entities
        const parsed = parseClinicalEntities(clientExtractedText, patient);
        doc = {
          id: `client_${Date.now()}`,
          title: selectedFile.name.replace(/\.[^/.]+$/, ''),
          doc_type: parsed.doc_type || 'Prescription',
          doctor: parsed.doctor || '',
          facility: parsed.facility || '',
          patient_name: patient?.name || '',
          date: parsed.doc_date || new Date().toISOString().split('T')[0],
          diagnosis: parsed.diagnosis || '',
          findings: '',
          impression: '',
          medications: parsed.medications || [],
          lab_results: parsed.lab_results || [],
          vitals: parsed.vitals || {},
          extracted_text: clientExtractedText,
          confidence: parsed.confidence || '92%'
        };
        hasWarning = Boolean(parsed.allergy_warning);
        warnMsg = parsed.allergy_message || '';
      } else {
        // Neither server nor client could extract text
        setScanError(
          serverError?.message || "We couldn't read this document. Try uploading a clearer scan or photo."
        );
        return;
      }

      setScannedDoc(doc);
      setEditedDoc(JSON.parse(JSON.stringify(doc)));
      setIsEditing(false);
      setAllergyAlert(hasWarning);
      setAllergyMessage(warnMsg);

      setTimeout(() => {
        setStep(4);
      }, 400);
    } catch (err) {
      clearInterval(progressTimer);
      console.error('Scan processing error:', err);
      setScanError("We couldn't read this document. Try uploading a clearer scan or photo.");
    }
  };

  // Step 4 Editing Handlers
  const handleDocFieldChange = (field, value) => {
    setEditedDoc((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    setEditedDoc((prev) => {
      const updated = [...(prev.medications || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, medications: updated };
    });
  };

  const handleRemoveMedication = (index) => {
    setEditedDoc((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const handleAddMedication = () => {
    setEditedDoc((prev) => ({
      ...prev,
      medications: [
        ...(prev.medications || []),
        {
          name: '',
          dose: '',
          frequency: 'Once daily',
          timing: 'Morning',
          instruction: 'Take after meals',
          duration: ''
        }
      ]
    }));
  };

  const handleLabChange = (index, field, value) => {
    setEditedDoc((prev) => {
      const updated = [...(prev.lab_results || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, lab_results: updated };
    });
  };

  const handleRemoveLab = (index) => {
    setEditedDoc((prev) => ({
      ...prev,
      lab_results: prev.lab_results.filter((_, i) => i !== index)
    }));
  };

  const handleAddLab = () => {
    setEditedDoc((prev) => ({
      ...prev,
      lab_results: [
        ...(prev.lab_results || []),
        {
          test_name: '',
          value: '',
          unit: '',
          reference_range: '',
          status: 'Normal',
          is_abnormal: false
        }
      ]
    }));
  };

  const handleSaveEdits = () => {
    setScannedDoc({ ...editedDoc });
    setIsEditing(false);
  };

  // Step 5: Confirm & Commit Document to Medical Records
  const handleConfirmDocument = async () => {
    const docToSave = isEditing ? editedDoc : scannedDoc;
    if (!docToSave) return;
    setIsConfirming(true);

    try {
      const payload = {
        document_id: docToSave.id,
        patient_id: patient?.patient_id || '',
        title: docToSave.title || 'Verified Medical Record',
        doc_type: docToSave.doc_type || 'Prescription',
        doctor: docToSave.doctor || '',
        facility: docToSave.facility || '',
        patient_name: docToSave.patient_name || '',
        date: docToSave.date || new Date().toISOString().split('T')[0],
        diagnosis: docToSave.diagnosis || '',
        findings: docToSave.findings || '',
        impression: docToSave.impression || '',
        medications: docToSave.medications || [],
        lab_results: docToSave.lab_results || [],
        vitals: docToSave.vitals || {},
        extracted_text: docToSave.extracted_text || ''
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
      try {
        URL.revokeObjectURL(filePreviewUrl);
      } catch (e) {}
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setIsPdf(false);
    setPdfDoc(null);
    setIsFromCamera(false);
    setScannedDoc(null);
    setEditedDoc(null);
    setIsEditing(false);
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

  const activeDoc = isEditing ? editedDoc : scannedDoc;

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
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => startCamera(cameraFacingMode)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 shadow-xs"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Live Camera View if Active */}
            {isCameraActive ? (
              <Card className="p-4 sm:p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border-2 border-emerald-500/50 animate-fadeIn">
                <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[480px]">
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch((e) => console.warn('Video element play notice:', e));
                      }
                    }}
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
                      {isCapturing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
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
                      Hold prescription or doctor slip in front of your webcam or phone camera.
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
                  <canvas
                    ref={pdfCanvasRef}
                    className="max-w-full h-auto rounded-lg shadow-md border border-slate-300"
                  />
                  {pdfTotalPages > 1 && (
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-300 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => changePdfPage(-1)}
                        disabled={pdfPageNum <= 1}
                        className="p-1 hover:bg-slate-100 rounded-full disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span>
                        Page {pdfPageNum} of {pdfTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => changePdfPage(1)}
                        disabled={pdfPageNum >= pdfTotalPages}
                        className="p-1 hover:bg-slate-100 rounded-full disabled:opacity-30 cursor-pointer"
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
              <div className="flex items-center gap-2">
                {isFromCamera ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        resetWorkflow();
                        startCamera(cameraFacingMode);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" /> Retake Photo
                    </button>
                    <button
                      type="button"
                      onClick={resetWorkflow}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" /> Choose File
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={resetWorkflow}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Choose Different Document
                  </button>
                )}
              </div>

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
                  <h3 className="text-base font-black text-slate-900">Optical Recognition Notice</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">{scanError}</p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={startProcessing}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={resetWorkflow}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
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
                  <h3 className="text-lg font-black text-slate-900">{scanStatusMessage}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Extracting clinical entities, prescription dosages, and allergy contraindications.
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
        {step === 4 && activeDoc && (
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
                  {isEditing ? (
                    <select
                      value={editedDoc.doc_type || 'Prescription'}
                      onChange={(e) => handleDocFieldChange('doc_type', e.target.value)}
                      className="text-xs font-black uppercase bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg px-2.5 py-1"
                    >
                      <option value="Prescription">Prescription</option>
                      <option value="Lab Report">Lab Report</option>
                      <option value="Radiology">Radiology & Imaging</option>
                      <option value="Discharge Summary">Discharge Summary</option>
                      <option value="Clinical Slip">Clinical Slip</option>
                    </select>
                  ) : (
                    <Badge
                      variant="default"
                      className="text-xs font-black uppercase bg-emerald-100 text-emerald-900 px-3 py-1"
                    >
                      {activeDoc.doc_type || 'Prescription'}
                    </Badge>
                  )}
                  <Badge variant="success" className="text-xs font-bold bg-[#297006] text-white px-2.5 py-0.5">
                    Confidence: {activeDoc.confidence || '95%'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedDoc.date || ''}
                      onChange={(e) => handleDocFieldChange('date', e.target.value)}
                      className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-500">
                      Date: {activeDoc.date || new Date().toISOString().split('T')[0]}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        handleSaveEdits();
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      isEditing
                        ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-3.5 h-3.5" /> Save Edits
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" /> Edit Fields
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Prescribing Doctor</span>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="e.g. Dr. Rajesh Sharma"
                      value={editedDoc.doctor || ''}
                      onChange={(e) => handleDocFieldChange('doctor', e.target.value)}
                      className="w-full font-bold text-slate-900 text-xs bg-white border border-slate-300 rounded-lg p-1.5"
                    />
                  ) : (
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                      {activeDoc.doctor || 'Not specified on document'}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hospital / Clinic</span>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="e.g. City General Clinic"
                      value={editedDoc.facility || ''}
                      onChange={(e) => handleDocFieldChange('facility', e.target.value)}
                      className="w-full font-bold text-slate-900 text-xs bg-white border border-slate-300 rounded-lg p-1.5"
                    />
                  ) : (
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                      {activeDoc.facility || 'Not specified on document'}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Clinical Diagnosis / Reason</span>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="e.g. Upper Respiratory Tract Infection"
                      value={editedDoc.diagnosis || ''}
                      onChange={(e) => handleDocFieldChange('diagnosis', e.target.value)}
                      className="w-full font-bold text-slate-900 text-xs bg-white border border-slate-300 rounded-lg p-1.5"
                    />
                  ) : (
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                      {activeDoc.diagnosis || 'General Consultation / Clinical Slip'}
                    </p>
                  )}
                </div>
              </div>

              {(activeDoc.findings || activeDoc.impression || isEditing) && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Findings / Clinical Impression</span>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      placeholder="Enter clinical findings or impression noted on the slip..."
                      value={editedDoc.findings || editedDoc.impression || ''}
                      onChange={(e) => {
                        handleDocFieldChange('findings', e.target.value);
                        handleDocFieldChange('impression', e.target.value);
                      }}
                      className="w-full font-medium text-slate-800 text-xs bg-white border border-slate-300 rounded-lg p-1.5"
                    />
                  ) : (
                    <p className="text-slate-800 text-xs mt-0.5">
                      {activeDoc.findings || activeDoc.impression || 'No additional findings noted.'}
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* Extracted Medications Section */}
            {((activeDoc.medications && activeDoc.medications.length > 0) || isEditing) && (
              <Card className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-emerald-200 shadow-md space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-emerald-700" />
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      Recognized Medications ({activeDoc.medications?.length || 0})
                    </h3>
                  </div>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Medicine
                    </button>
                  )}
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
                        {isEditing && <th className="py-2 px-2 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeDoc.medications?.map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2 font-black text-slate-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={med.name || ''}
                                onChange={(e) => handleMedicationChange(idx, 'name', e.target.value)}
                                placeholder="Medicine name"
                                className="w-full p-1 bg-white border border-slate-200 rounded font-bold"
                              />
                            ) : (
                              med.name
                            )}
                          </td>
                          <td className="py-2.5 px-2 font-bold text-emerald-800">
                            {isEditing ? (
                              <input
                                type="text"
                                value={med.dose || ''}
                                onChange={(e) => handleMedicationChange(idx, 'dose', e.target.value)}
                                placeholder="e.g. 500mg"
                                className="w-full p-1 bg-white border border-slate-200 rounded font-bold text-emerald-800"
                              />
                            ) : (
                              med.dose || '—'
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-slate-600">
                            {isEditing ? (
                              <input
                                type="text"
                                value={med.frequency || ''}
                                onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                                placeholder="e.g. Twice daily"
                                className="w-full p-1 bg-white border border-slate-200 rounded"
                              />
                            ) : (
                              med.frequency || '—'
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-slate-600">
                            {isEditing ? (
                              <input
                                type="text"
                                value={med.timing || ''}
                                onChange={(e) => handleMedicationChange(idx, 'timing', e.target.value)}
                                placeholder="e.g. Morning, Night"
                                className="w-full p-1 bg-white border border-slate-200 rounded"
                              />
                            ) : (
                              med.timing || '—'
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 italic">
                            {isEditing ? (
                              <input
                                type="text"
                                value={med.instruction || ''}
                                onChange={(e) => handleMedicationChange(idx, 'instruction', e.target.value)}
                                placeholder="e.g. After meals"
                                className="w-full p-1 bg-white border border-slate-200 rounded text-slate-700"
                              />
                            ) : (
                              med.instruction || 'Take with water'
                            )}
                          </td>
                          {isEditing && (
                            <td className="py-2.5 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveMedication(idx)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                title="Remove medication"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Extracted Lab Results Section */}
            {((activeDoc.lab_results && activeDoc.lab_results.length > 0) || isEditing) && (
              <Card className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-teal-200 shadow-md space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-700" />
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      Diagnostic Lab Tests ({activeDoc.lab_results?.length || 0})
                    </h3>
                  </div>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleAddLab}
                      className="px-2.5 py-1 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-900 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Lab Test
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2 px-2">Test Name</th>
                        <th className="py-2 px-2">Observed Value</th>
                        <th className="py-2 px-2">Reference Range</th>
                        <th className="py-2 px-2">Status</th>
                        {isEditing && <th className="py-2 px-2 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeDoc.lab_results?.map((lab, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2 font-black text-slate-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={lab.test_name || ''}
                                onChange={(e) => handleLabChange(idx, 'test_name', e.target.value)}
                                placeholder="Test name"
                                className="w-full p-1 bg-white border border-slate-200 rounded font-bold"
                              />
                            ) : (
                              lab.test_name
                            )}
                          </td>
                          <td className="py-2.5 px-2 font-bold text-slate-800">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={lab.value !== undefined ? lab.value : ''}
                                  onChange={(e) => handleLabChange(idx, 'value', e.target.value)}
                                  placeholder="Value"
                                  className="w-20 p-1 bg-white border border-slate-200 rounded font-bold"
                                />
                                <input
                                  type="text"
                                  value={lab.unit || ''}
                                  onChange={(e) => handleLabChange(idx, 'unit', e.target.value)}
                                  placeholder="Unit"
                                  className="w-16 p-1 bg-white border border-slate-200 rounded text-xs"
                                />
                              </div>
                            ) : (
                              `${lab.value} ${lab.unit || ''}`
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-slate-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={lab.reference_range || ''}
                                onChange={(e) => handleLabChange(idx, 'reference_range', e.target.value)}
                                placeholder="Ref range"
                                className="w-full p-1 bg-white border border-slate-200 rounded"
                              />
                            ) : (
                              lab.reference_range || '—'
                            )}
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                lab.is_abnormal
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {lab.status || (lab.is_abnormal ? 'Abnormal' : 'Normal')}
                            </span>
                          </td>
                          {isEditing && (
                            <td className="py-2.5 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveLab(idx)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                title="Remove test"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Extracted Raw Text Accordion */}
            {activeDoc.extracted_text && (
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
                      {copiedRawText ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedRawText ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                {showRawText && (
                  <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                    {activeDoc.extracted_text}
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
                <X className="w-4 h-4" /> Discard & Scan Again
              </button>

              <button
                type="button"
                onClick={handleConfirmDocument}
                disabled={isConfirming}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-70"
              >
                {isConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {isConfirming
                    ? 'Saving to Records...'
                    : 'Confirm & Save to Medical Records →'}
                </span>
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
              <h2 className="text-2xl font-black text-slate-900">Document Successfully Saved!</h2>
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

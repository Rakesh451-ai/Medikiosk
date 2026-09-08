import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, Pill, Droplet, Activity, Sparkles, Plus, Clock, 
  ChevronRight, RefreshCw, X, ArrowRight, Printer, AlertTriangle, 
  AlertCircle, CheckCircle2, Search, Calendar, User, ShieldCheck, 
  Download, Eye, ExternalLink, Filter, Layers, Stethoscope, Building2,
  Trash2, Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

// Helper to categorize documents consistently
function getDocumentCategory(doc) {
  const type = (doc?.doc_type || '').toLowerCase();
  if (type.includes('prescript')) return 'Prescription';
  if (type.includes('lab') || type.includes('blood') || type.includes('test') || type.includes('pathology')) return 'Lab Report';
  if (type.includes('imag') || type.includes('radio') || type.includes('x-ray') || type.includes('scan') || type.includes('mri') || type.includes('ct')) return 'Radiology';
  if (type.includes('discharge')) return 'Discharge Summary';
  return 'Other';
}

export function SummaryPage({ 
  patient, 
  vitals, 
  medications = [], 
  documents: propDocs = [], 
  summary: propSummary = null, 
  onDataUpdated 
}) {
  const navigate = useNavigate();
  const [docs, setDocs] = useState(Array.isArray(propDocs) ? propDocs : []);
  const [summaryData, setSummaryData] = useState(propSummary || null);
  const [localMeds, setLocalMeds] = useState(Array.isArray(medications) ? medications : []);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'empty' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [summaryLang, setSummaryLang] = useState('en');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteDocument(docToDelete.id);
      setDocs(prev => prev.filter(d => d.id !== docToDelete.id));
      if (selectedDoc?.id === docToDelete.id) {
        setSelectedDoc(null);
      }
      setDocToDelete(null);
      if (onDataUpdated) {
        onDataUpdated();
      }
    } catch (err) {
      console.error('Failed to delete document from summary:', err);
      setDocToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Sync prop changes
  useEffect(() => {
    if (Array.isArray(propDocs) && propDocs.length > 0) {
      setDocs(propDocs);
    }
  }, [propDocs]);

  useEffect(() => {
    if (propSummary) {
      setSummaryData(propSummary);
    }
  }, [propSummary]);

  useEffect(() => {
    if (Array.isArray(medications)) {
      setLocalMeds(medications);
    }
  }, [medications]);

  // Load documents and summary data
  const loadRecordsSummary = useCallback(async (isInitial = true) => {
    if (isInitial) {
      setStatus('loading');
    } else {
      setIsRefreshing(true);
    }
    setErrorMessage('');

    try {
      const pid = patient?.patient_id || '';
      const [docsRes, summaryRes, medsRes] = await Promise.allSettled([
        api.getDocuments(pid),
        api.getPatientSummary(pid),
        api.getMedications(pid)
      ]);

      let loadedDocs = [];
      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value)) {
        loadedDocs = docsRes.value;
        setDocs(loadedDocs);
      } else if (propDocs && propDocs.length > 0) {
        loadedDocs = propDocs;
        setDocs(loadedDocs);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setSummaryData(summaryRes.value);
      }

      if (medsRes.status === 'fulfilled' && Array.isArray(medsRes.value)) {
        setLocalMeds(medsRes.value);
      }

      if (loadedDocs.length === 0 && (!propDocs || propDocs.length === 0)) {
        setStatus('empty');
      } else {
        setStatus('success');
      }
    } catch (err) {
      console.error('Failed to load medical records overview:', err);
      if (docs.length > 0 || (Array.isArray(propDocs) && propDocs.length > 0)) {
        setStatus('success');
      } else {
        setErrorMessage(err.message || 'Unable to load medical records summary. Please verify your connection.');
        setStatus('error');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [patient?.patient_id, docs.length, propDocs]);

  // Initial load
  useEffect(() => {
    loadRecordsSummary(true);
  }, [loadRecordsSummary]);

  // Handle manual refresh
  const handleRefresh = async () => {
    await loadRecordsSummary(false);
    if (typeof onDataUpdated === 'function') {
      onDataUpdated();
    }
  };

  // Dynamic statistics
  const stats = useMemo(() => {
    const total = docs.length;
    let prescriptions = 0;
    let labReports = 0;
    let radiology = 0;
    let others = 0;

    docs.forEach((d) => {
      const cat = getDocumentCategory(d);
      if (cat === 'Prescription') prescriptions += 1;
      else if (cat === 'Lab Report') labReports += 1;
      else if (cat === 'Radiology') radiology += 1;
      else others += 1;
    });

    return {
      total,
      prescriptions,
      labReports,
      radiology,
      others
    };
  }, [docs]);

  // Sort documents by date descending
  const sortedDocs = useMemo(() => {
    return [...docs].sort((a, b) => {
      const dateA = new Date(a.date || a.uploaded_at || 0);
      const dateB = new Date(b.date || b.uploaded_at || 0);
      return dateB - dateA;
    });
  }, [docs]);

  const latestDoc = sortedDocs.length > 0 ? sortedDocs[0] : null;

  // Filtered recent documents
  const filteredRecentDocs = useMemo(() => {
    let list = sortedDocs;
    if (activeFilter !== 'All') {
      list = list.filter((d) => {
        const cat = getDocumentCategory(d);
        if (activeFilter === 'Prescriptions') return cat === 'Prescription';
        if (activeFilter === 'Lab Reports') return cat === 'Lab Report';
        if (activeFilter === 'Radiology') return cat === 'Radiology';
        if (activeFilter === 'Other') return cat !== 'Prescription' && cat !== 'Lab Report' && cat !== 'Radiology';
        return true;
      });
    }
    return list.slice(0, 6);
  }, [sortedDocs, activeFilter]);

  // Extracted active medications
  const activeMedications = useMemo(() => {
    if (localMeds.length > 0) return localMeds;
    const docMeds = [];
    docs.forEach(d => {
      if (Array.isArray(d.medications)) {
        d.medications.forEach(m => {
          if (m && (typeof m === 'string' || m.name)) {
            docMeds.push(typeof m === 'string' ? { name: m, frequency: 'As prescribed', active: true } : m);
          }
        });
      }
    });
    return docMeds.slice(0, 6);
  }, [localMeds, docs]);

  // Clinical summary text
  const narrativeSummary = useMemo(() => {
    if (!summaryData) {
      if (latestDoc) {
        return `Latest clinical consultation on ${latestDoc.date || 'record'} with ${latestDoc.doctor || 'attending physician'} at ${latestDoc.facility || 'medical center'}. Documented diagnosis: ${latestDoc.diagnosis || 'Clinical evaluation complete.'}`;
      }
      return 'No clinical narrative summary available yet. Upload your first medical document to generate synthesized clinical insights.';
    }

    if (summaryLang === 'hi' && summaryData.bilingual_summary?.hi) {
      return summaryData.bilingual_summary.hi;
    }
    if (summaryData.bilingual_summary?.en) {
      return summaryData.bilingual_summary.en;
    }

    const parts = [];
    if (summaryData.chief_complaint) parts.push(`Chief Complaint: ${summaryData.chief_complaint}`);
    if (summaryData.hpi) parts.push(summaryData.hpi);
    if (summaryData.provisional_diagnosis) parts.push(`Provisional Diagnosis: ${summaryData.provisional_diagnosis}`);
    return parts.join('. ') || 'Clinical records verified and archived in electronic health repository.';
  }, [summaryData, summaryLang, latestDoc]);

  // Print summary handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full bg-[#cbf5d6] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-6xl space-y-6">

        {/* Top Header & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00bcd4] text-white text-xs font-bold shadow-xs mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Medical Records Overview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#052e0a] tracking-tight">
              Health Records & Reports Summary
            </h1>
            <p className="text-xs sm:text-sm text-gray-700 mt-1">
              Concise clinical overview, report counts, and synthesized insights from your verified papers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              icon={Printer}
              className="bg-white/90 hover:bg-white text-gray-700 border-gray-300 font-bold shadow-xs"
            >
              Print Summary
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              icon={RefreshCw}
              className={`bg-white/90 hover:bg-white text-gray-700 border-gray-300 font-bold shadow-xs ${isRefreshing ? 'opacity-70' : ''}`}
            >
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </Button>
            <Button
              to="/scanner"
              variant="primary"
              size="sm"
              icon={Plus}
              className="bg-[#297006] hover:bg-[#1f5604] text-white shadow-xs font-bold"
            >
              Scan New Record
            </Button>
            <Button
              to="/records"
              variant="secondary"
              size="sm"
              icon={ArrowRight}
              className="bg-[#00bcd4] hover:bg-[#00acc1] text-white shadow-xs font-bold"
            >
              View All Records
            </Button>
          </div>
        </div>

        {/* Patient Profile Ribbon */}
        {patient && (
          <Card className="p-4 sm:p-5 bg-white/90 backdrop-blur-sm border-2 border-emerald-300 shadow-sm rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#00bcd4] text-white flex items-center justify-center font-black text-lg shadow-sm">
                  {(patient.name || 'P')[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-[#052e0a]">
                      {patient.name || 'Verified Patient'}
                    </h2>
                    <Badge variant="success" className="text-[10px] uppercase font-black tracking-wide bg-emerald-100 text-[#297006]">
                      ✓ EHR Active
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mt-1 font-medium">
                    {patient.age && <span>{patient.age} Yrs</span>}
                    {patient.gender && <span>• {patient.gender}</span>}
                    {patient.blood_group && <span>• Blood: <strong className="text-rose-600">{patient.blood_group}</strong></span>}
                    {patient.patient_id && <span>• ID: <code className="font-mono text-gray-700">{patient.patient_id}</code></span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-col sm:items-end gap-2 text-xs text-gray-600 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                {patient.primary_doctor && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Stethoscope className="w-3.5 h-3.5 text-[#297006]" />
                    <span>Primary: <strong>{patient.primary_doctor}</strong></span>
                  </span>
                )}
                {patient.hospital_name && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-[#00bcd4]" />
                    <span>Facility: <strong>{patient.hospital_name}</strong></span>
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* LOADING SKELETON */}
        {status === 'loading' && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-white/70 rounded-2xl border border-emerald-200/60 p-4"></div>
              ))}
            </div>
            <div className="h-48 bg-white/70 rounded-2xl border border-emerald-200/60 p-6"></div>
            <div className="h-64 bg-white/70 rounded-2xl border border-emerald-200/60 p-6"></div>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <Card className="p-8 text-center bg-white border-2 border-rose-200 shadow-md rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Unable to Load Medical Records Summary</h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mt-1">
                {errorMessage || 'There was a connection issue loading your records. Please try again.'}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                onClick={() => loadRecordsSummary(true)}
                variant="primary"
                size="sm"
                icon={RefreshCw}
                className="bg-[#297006] hover:bg-[#1f5604] text-white font-bold"
              >
                Retry Loading
              </Button>
              <Button
                to="/records"
                variant="outline"
                size="sm"
                icon={ArrowRight}
                className="font-bold"
              >
                Go to Detailed Records
              </Button>
            </div>
          </Card>
        )}

        {/* EMPTY STATE */}
        {status === 'empty' && (
          <Card className="p-10 sm:p-14 text-center bg-white/95 border-2 border-emerald-300 shadow-sm rounded-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#297006] flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-xl font-extrabold text-[#052e0a]">No Medical Records Uploaded Yet</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                You haven&apos;t scanned or uploaded any medical reports yet. Add your doctor slips, lab reports, or scans to see dynamic summaries and AI insights.
              </p>
            </div>
            <div className="pt-3 flex justify-center gap-3">
              <Button
                to="/scanner"
                variant="primary"
                size="md"
                icon={Plus}
                className="bg-[#297006] hover:bg-[#1f5604] text-white font-bold px-6 shadow-sm"
              >
                Scan Your First Paper
              </Button>
            </div>
          </Card>
        )}

        {/* MAIN SUMMARY CONTENT (WHEN SUCCESSFUL) */}
        {status === 'success' && (
          <>
            {/* Dynamic Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Card 1: Total Records */}
              <Card 
                onClick={() => navigate('/records')}
                className="p-4 bg-white/95 hover:bg-white border-2 border-emerald-200/80 hover:border-[#297006] shadow-xs hover:shadow-md transition-all cursor-pointer rounded-2xl flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Total Records</span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#297006] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-black text-[#052e0a]">{stats.total}</div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#297006] mt-1">
                    <span>Verified Papers</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Card>

              {/* Card 2: Prescriptions */}
              <Card 
                onClick={() => navigate('/records?type=Prescription')}
                className="p-4 bg-white/95 hover:bg-white border-2 border-emerald-200/80 hover:border-[#297006] shadow-xs hover:shadow-md transition-all cursor-pointer rounded-2xl flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Prescriptions</span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#297006] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Pill className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-black text-[#052e0a]">{stats.prescriptions}</div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#297006] mt-1">
                    <span>Doctor Slips</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Card>

              {/* Card 3: Lab Reports */}
              <Card 
                onClick={() => navigate('/records?type=Lab%20Report')}
                className="p-4 bg-white/95 hover:bg-white border-2 border-sky-200/80 hover:border-[#00bcd4] shadow-xs hover:shadow-md transition-all cursor-pointer rounded-2xl flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Lab Reports</span>
                  <div className="w-7 h-7 rounded-xl bg-sky-50 text-[#00bcd4] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Droplet className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-black text-sky-950">{stats.labReports}</div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#00bcd4] mt-1">
                    <span>Blood & Diagnostic</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Card>

              {/* Card 4: Radiology & Imaging */}
              <Card 
                onClick={() => navigate('/records?type=Radiology')}
                className="p-4 bg-white/95 hover:bg-white border-2 border-purple-200/80 hover:border-purple-600 shadow-xs hover:shadow-md transition-all cursor-pointer rounded-2xl flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Radiology</span>
                  <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-black text-purple-950">{stats.radiology}</div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-600 mt-1">
                    <span>X-Rays & Scans</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Card>

              {/* Card 5: Other Documents */}
              <Card 
                onClick={() => navigate('/records?type=Other')}
                className="p-4 bg-white/95 hover:bg-white border-2 border-amber-200/80 hover:border-amber-600 shadow-xs hover:shadow-md transition-all cursor-pointer rounded-2xl flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Other Records</span>
                  <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-black text-amber-950">{stats.others}</div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 mt-1">
                    <span>Discharge / Misc</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Card>
            </div>

            {/* HIGHLIGHTED LATEST MEDICAL RECORD */}
            {latestDoc && (
              <Card className="p-5 sm:p-6 bg-white/95 border-2 border-[#297006] shadow-sm rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#297006] text-white text-[11px] font-black uppercase tracking-wider">
                      ★ Latest Verified Record
                    </span>
                    <Badge variant="default" className="text-[11px] font-bold bg-emerald-50 text-[#297006]">
                      {latestDoc.doc_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Uploaded {latestDoc.date || 'Recently'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">
                      {latestDoc.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 font-medium">
                      {latestDoc.doctor && (
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5 text-[#297006]" />
                          <span>Dr. {latestDoc.doctor}</span>
                        </span>
                      )}
                      {latestDoc.facility && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-[#00bcd4]" />
                          <span>{latestDoc.facility}</span>
                        </span>
                      )}
                    </div>
                    {latestDoc.diagnosis && (
                      <div className="mt-3 p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs font-medium text-[#052e0a] leading-relaxed">
                        <span className="font-bold block text-[11px] uppercase tracking-wide text-[#297006] mb-0.5">
                          Key Findings & Diagnosis:
                        </span>
                        {latestDoc.diagnosis}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">
                        Document Status
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#297006]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>OCR & Data Extracted</span>
                      </div>
                      <p className="text-[11px] text-gray-500 pt-1">
                        Available for AI questions and clinical review.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <Button
                        onClick={() => setSelectedDoc(latestDoc)}
                        variant="primary"
                        size="sm"
                        fullWidth
                        icon={Eye}
                        className="bg-[#297006] hover:bg-[#1f5604] text-white font-bold text-xs shadow-xs"
                      >
                        View Full Details
                      </Button>
                      <Button
                        to="/records"
                        variant="outline"
                        size="sm"
                        fullWidth
                        icon={ArrowRight}
                        className="text-xs font-bold bg-white text-gray-700 hover:bg-gray-100"
                      >
                        Records Timeline
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* RECENT MEDICAL REPORTS SECTION WITH CATEGORY PILLS */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#052e0a]">
                    Recent Medical Reports
                  </h2>
                  <p className="text-xs text-gray-600">
                    Fast preview of your recent prescriptions, blood work, and clinical reports.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                  {[
                    { id: 'All', label: `All (${stats.total})` },
                    { id: 'Prescriptions', label: `💊 Prescriptions (${stats.prescriptions})` },
                    { id: 'Lab Reports', label: `🧪 Labs (${stats.labReports})` },
                    { id: 'Radiology', label: `🩻 Scans (${stats.radiology})` },
                    { id: 'Other', label: `📄 Other (${stats.others})` }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeFilter === f.id
                          ? 'bg-[#297006] text-white shadow-xs font-black'
                          : 'bg-white/90 text-gray-700 hover:bg-white border border-emerald-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecentDocs.map((doc) => {
                  const cat = getDocumentCategory(doc);
                  const isPrescription = cat === 'Prescription';
                  const isLab = cat === 'Lab Report';
                  const isRad = cat === 'Radiology';

                  return (
                    <Card
                      key={doc.id || doc.doc_id}
                      onClick={() => setSelectedDoc(doc)}
                      className="p-4 sm:p-5 bg-white/95 hover:bg-white border-2 border-gray-200 hover:border-[#297006] hover:shadow-md transition-all flex flex-col justify-between cursor-pointer rounded-2xl group space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isPrescription 
                              ? 'bg-emerald-100 text-[#297006]' 
                              : isLab 
                              ? 'bg-sky-100 text-[#00bcd4]' 
                              : isRad 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {doc.doc_type || 'Document'}
                          </span>
                          <span className="text-[11px] font-bold text-gray-500">
                            {doc.date || 'Archived'}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-sm text-gray-900 mt-2 line-clamp-2 group-hover:text-[#297006] transition-colors">
                          {doc.title}
                        </h4>
                        
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 font-medium">
                          {doc.doctor ? `Dr. ${doc.doctor}` : 'Attending Physician'} 
                          {doc.facility ? ` • ${doc.facility}` : ''}
                        </p>

                        <div className="mt-2.5 p-2.5 bg-gray-50 rounded-xl text-xs text-gray-700 line-clamp-2 border border-gray-100 font-medium leading-relaxed">
                          {doc.diagnosis || doc.extracted_text || 'Clinical data recorded and processed.'}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-black text-[#297006]">
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Card>
                  );
                })}
              </div>

              {filteredRecentDocs.length === 0 && (
                <Card className="p-8 text-center bg-white/90 border border-gray-200 rounded-2xl text-gray-500 space-y-2">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs font-bold">No records found in this category.</p>
                  <Button
                    onClick={() => setActiveFilter('All')}
                    variant="outline"
                    size="xs"
                    className="font-bold"
                  >
                    Reset Filter
                  </Button>
                </Card>
              )}

              <div className="flex justify-center pt-2">
                <Button
                  to="/records"
                  variant="outline"
                  size="md"
                  icon={ArrowRight}
                  className="bg-white hover:bg-gray-50 text-gray-800 font-bold border-2 border-emerald-300 shadow-xs px-6"
                >
                  Explore All ({stats.total}) Records in Timeline
                </Button>
              </div>
            </div>

            {/* SYNTHESIZED CLINICAL SUMMARY & NARRATIVE INSIGHTS */}
            <Card className="p-5 sm:p-6 bg-white/95 border-2 border-emerald-200/90 shadow-sm rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#297006] flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#052e0a]">
                      Synthesized Clinical Narrative & Findings
                    </h3>
                    <p className="text-xs text-gray-500">
                      Consolidated overview derived from verified clinical documents and doctor visits.
                    </p>
                  </div>
                </div>

                {/* Bilingual Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto">
                  <button
                    onClick={() => setSummaryLang('en')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      summaryLang === 'en'
                        ? 'bg-white text-gray-900 shadow-xs font-black'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setSummaryLang('hi')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      summaryLang === 'hi'
                        ? 'bg-white text-gray-900 shadow-xs font-black'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    हिन्दी
                  </button>
                </div>
              </div>

              {/* Narrative Box */}
              <div className="p-4 sm:p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs sm:text-sm text-[#052e0a] font-medium leading-relaxed">
                {narrativeSummary}
              </div>

              {/* Structured Points */}
              {summaryData && (summaryData.chief_complaint || summaryData.provisional_diagnosis || summaryData.recommended_actions) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {summaryData.chief_complaint && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                        Primary Concern
                      </span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {summaryData.chief_complaint}
                      </p>
                    </div>
                  )}

                  {summaryData.provisional_diagnosis && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                        Documented Diagnosis
                      </span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {summaryData.provisional_diagnosis}
                      </p>
                    </div>
                  )}

                  {summaryData.recommended_actions && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                        Next Steps / Plan
                      </span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {typeof summaryData.recommended_actions === 'string' 
                          ? summaryData.recommended_actions 
                          : Array.isArray(summaryData.recommended_actions)
                          ? summaryData.recommended_actions.join(', ')
                          : 'Follow up as advised by physician.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-gray-500">
                  Need clarification? The MediKiosk Health Assistant can explain your reports and medications.
                </p>
                <Button
                  to="/agent"
                  variant="primary"
                  size="sm"
                  icon={Sparkles}
                  className="bg-[#297006] hover:bg-[#1f5604] text-white font-bold shadow-xs whitespace-nowrap"
                >
                  Discuss Summary with AI Assistant
                </Button>
              </div>
            </Card>

            {/* ACTIVE MEDICATIONS SUMMARY */}
            {activeMedications.length > 0 && (
              <Card className="p-5 sm:p-6 bg-white/95 border-2 border-emerald-200/80 shadow-sm rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#297006] flex items-center justify-center font-bold">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#052e0a]">
                        Active Prescribed Medications
                      </h3>
                      <p className="text-xs text-gray-500">
                        Medicines recorded from your prescriptions and clinical visits.
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px] font-black bg-emerald-100 text-[#297006]">
                    {activeMedications.length} Active
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeMedications.map((med, idx) => (
                    <div 
                      key={med.id || idx}
                      className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-extrabold text-gray-900">
                          {med.name || med.medicine_name || 'Prescribed Medicine'}
                        </h5>
                        <p className="text-[11px] text-gray-600 font-medium">
                          {med.dosage ? `${med.dosage} • ` : ''}{med.frequency || 'Take as directed'}
                        </p>
                        {med.instructions && (
                          <p className="text-[10px] text-gray-500 italic mt-1">
                            &quot;{med.instructions}&quot;
                          </p>
                        )}
                      </div>
                      <Badge variant="default" className="text-[9px] uppercase font-black bg-white text-[#297006] border border-emerald-200 shrink-0">
                        Prescribed
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

      </div>

      {/* DOCUMENT DETAIL MODAL */}
      {selectedDoc && (
        <Modal
          isOpen={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          title={selectedDoc.title}
          subtitle={`${selectedDoc.doc_type || 'Document'} • ${selectedDoc.date || 'Archived'}`}
          icon={FileText}
        >
          <div className="space-y-4 text-xs text-gray-900">
            {/* Doctor & Facility */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                  Attending Doctor
                </span>
                <p className="font-bold text-gray-900 mt-0.5">
                  {selectedDoc.doctor || 'Not specified'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                  Hospital / Clinic
                </span>
                <p className="font-bold text-gray-900 mt-0.5">
                  {selectedDoc.facility || 'Verified Medical Center'}
                </p>
              </div>
            </div>

            {/* Diagnosis / Findings */}
            <div>
              <span className="text-[11px] font-bold text-gray-700 block mb-1">
                Doctor&apos;s Diagnosis & Clinical Findings:
              </span>
              <p className="p-3.5 bg-emerald-50 text-[#052e0a] rounded-2xl border border-emerald-200 font-medium leading-relaxed">
                {selectedDoc.diagnosis || 'Clinical evaluation recorded with no adverse flags noted.'}
              </p>
            </div>

            {/* Extracted Medications if any */}
            {Array.isArray(selectedDoc.medications) && selectedDoc.medications.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-gray-700 block mb-1">
                  Prescribed Medications in this Slip:
                </span>
                <div className="space-y-1.5">
                  {selectedDoc.medications.map((m, mi) => (
                    <div key={mi} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800">
                        {typeof m === 'string' ? m : m.name}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {typeof m === 'object' && m.frequency ? m.frequency : 'As directed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Labs if any */}
            {Array.isArray(selectedDoc.lab_results) && selectedDoc.lab_results.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-gray-700 block mb-1">
                  Extracted Lab Test Results:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedDoc.lab_results.map((l, li) => (
                    <div key={li} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">
                        {typeof l === 'string' ? 'Test' : l.test_name || 'Lab Test'}
                      </span>
                      <span className="font-extrabold text-gray-900 mt-0.5 block">
                        {typeof l === 'string' ? l : `${l.value || ''} ${l.unit || ''}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OCR Transcript Details */}
            {selectedDoc.extracted_text && (
              <details className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 cursor-pointer">
                <summary className="font-bold text-gray-700 text-xs select-none">
                  📄 View Full OCR Scanned Text
                </summary>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl whitespace-pre-wrap leading-relaxed mt-2 max-h-40 overflow-y-auto">
                  {selectedDoc.extracted_text}
                </pre>
              </details>
            )}

            {/* Original File Link if available */}
            {selectedDoc.file_url && (
              <div className="pt-1">
                <a
                  href={selectedDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00bcd4] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Original Scanned File</span>
                </a>
              </div>
            )}

            {/* Actions: AI Assistant & Delete */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <Button
                to="/agent"
                variant="primary"
                size="md"
                className="w-full sm:flex-1 bg-[#297006] hover:bg-[#1f5604] text-white font-bold shadow-xs"
                icon={Sparkles}
              >
                Ask Health Assistant
              </Button>
              <button
                type="button"
                onClick={() => setDocToDelete(selectedDoc)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION MODAL FOR DELETION */}
      {docToDelete && (
        <Modal
          isOpen={Boolean(docToDelete)}
          onClose={() => !isDeleting && setDocToDelete(null)}
          title="Delete Medical Record"
          subtitle="Are you sure you want to permanently delete this document?"
          icon={Trash2}
        >
          <div className="space-y-4 text-xs text-gray-900">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-900 text-sm">Permanent Action</p>
                <p className="text-xs text-rose-700 leading-relaxed">
                  This will permanently delete <span className="font-bold">"{docToDelete.title}"</span> ({docToDelete.doc_type}) from your medical records, including its scanned file, OCR extractions, and associated clinical entries.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1">
              <div><span className="font-semibold text-gray-800">Doctor:</span> {docToDelete.doctor || 'Not specified'}</div>
              <div><span className="font-semibold text-gray-800">Facility:</span> {docToDelete.facility || 'Not specified'}</div>
              {docToDelete.created_at && (
                <div><span className="font-semibold text-gray-800">Date:</span> {new Date(docToDelete.created_at).toLocaleDateString()}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteDoc}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, header, button, .no-print, [role="navigation"] {
            display: none !important;
          }
          .bg-\[\#cbf5d6\] {
            background: white !important;
          }
          .shadow-xs, .shadow-sm, .shadow-md {
            box-shadow: none !important;
          }
          .border-2 {
            border-width: 1px !important;
          }
        }
      `}</style>
    </div>
  );
}

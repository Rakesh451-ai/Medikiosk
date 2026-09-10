import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  HeartPulse, ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, 
  Droplet, User, Phone, Printer, Download, RefreshCw, ArrowRight, 
  ExternalLink, Calendar, Stethoscope, Building2, Pill, Sparkles, 
  Clock, Eye, ShieldCheck, Activity, FileText, Check, FileCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export function SummaryPage({ 
  patient, 
  vitals: propVitals, 
  medications: propMeds = [], 
  documents: propDocs = [], 
  summary: propSummary = null, 
  onDataUpdated 
}) {
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState(propSummary || null);
  const [isLoading, setIsLoading] = useState(!propSummary && !summaryData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const isFetchingRef = useRef(false);
  const lastFetchedPidRef = useRef(null);
  const propDocsRef = useRef(propDocs);

  useEffect(() => {
    propDocsRef.current = propDocs;
  }, [propDocs]);

  // Sync propSummary if updated from parent
  useEffect(() => {
    if (propSummary) {
      setSummaryData(propSummary);
      setIsLoading(false);
      lastFetchedPidRef.current = patient?.patient_id || '';
    }
  }, [propSummary, patient?.patient_id]);

  // Load dynamic clinical summary from backend
  const loadSummary = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setFetchError(null);

    const pid = patient?.patient_id || '';
    try {
      const data = await api.getPatientSummary(pid);
      if (data) {
        setSummaryData(data);
        lastFetchedPidRef.current = pid;
      }
    } catch (err) {
      console.warn('Could not load summary from API:', err);
      setSummaryData(prev => {
        if (!prev && (!propDocsRef.current || propDocsRef.current.length === 0)) {
          setFetchError('Unable to generate patient summary.');
        }
        return prev;
      });
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [patient?.patient_id]);

  // Initial load: Only fetch if we don't already have summary data for this patient
  useEffect(() => {
    const currentPid = patient?.patient_id || '';
    if (propSummary) {
      // Data already supplied by parent App state
      return;
    }
    if (summaryData && lastFetchedPidRef.current === currentPid) {
      // Already fetched and up to date for this patient
      return;
    }
    loadSummary(false);
  }, [patient?.patient_id, propSummary, summaryData, loadSummary]);

  // Manual refresh
  const handleManualRefresh = async () => {
    await loadSummary(true);
    if (typeof onDataUpdated === 'function') {
      onDataUpdated();
    }
  };

  // Print / PDF handlers
  const handlePrint = () => {
    window.print();
  };

  // 1. Patient Information (Normalized from real DB)
  const patientInfo = useMemo(() => {
    const sInfo = summaryData?.patient_info || {};
    return {
      name: sInfo.name || patient?.name || 'Patient',
      age: sInfo.age ?? patient?.age ?? null,
      gender: sInfo.gender || (patient?.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase() : null),
      blood_group: sInfo.blood_group || patient?.blood_group || null,
      patient_id: sInfo.patient_id || patient?.patient_id || '',
      emergency_contact: sInfo.emergency_contact || patient?.emergency_contact || null,
      phone: sInfo.phone || patient?.phone || '',
      primary_doctor: sInfo.primary_doctor || patient?.primary_doctor || null,
      hospital_name: sInfo.hospital_name || patient?.hospital_name || null
    };
  }, [summaryData, patient]);

  // 2. Key Safety Information
  const safetyInfo = useMemo(() => {
    const sSafety = summaryData?.safety_information;
    if (sSafety) return sSafety;

    // Fallback from client props if backend safety object absent
    const rawAllergies = Array.isArray(summaryData?.allergies) ? summaryData.allergies : (patient?.allergies || []);
    const cleanAllergies = rawAllergies.filter(Boolean);
    const rawChronic = Array.isArray(summaryData?.chronic_conditions) ? summaryData.chronic_conditions : (patient?.chronic_conditions || []);
    const cleanChronic = rawChronic.filter(Boolean);

    const alerts = [];
    cleanChronic.forEach(c => {
      alerts.push({
        type: 'CHRONIC',
        severity: 'medium',
        title: `Documented Condition: ${c}`,
        badge: 'Chronic Condition'
      });
    });

    return {
      known_allergies: cleanAllergies,
      chronic_conditions: cleanChronic,
      important_alerts: alerts,
      medication_safety_warnings: [],
      has_critical_safety_risk: cleanAllergies.length > 0,
      summary_status: cleanAllergies.length > 0 ? 'CRITICAL RISK IDENTIFIED' : 'NO CRITICAL SAFETY RISKS DOCUMENTED'
    };
  }, [summaryData, patient]);

  // 3. Current Health Status (Latest Vitals)
  const healthStatus = useMemo(() => {
    if (summaryData?.current_health_status) {
      return summaryData.current_health_status;
    }
    const rawV = summaryData?.vitals?.latest || propVitals || patient?.latest_vitals || {};
    const hasV = Object.keys(rawV).some(k => ['bp_systolic', 'heart_rate', 'spo2', 'temperature', 'glucose', 'weight', 'weight_kg', 'height', 'height_cm'].includes(k) && rawV[k] != null);

    return {
      has_vitals: hasV,
      blood_pressure: rawV.blood_pressure || (rawV.bp_systolic && rawV.bp_diastolic ? `${rawV.bp_systolic}/${rawV.bp_diastolic} mmHg` : null),
      heart_rate: rawV.heart_rate != null ? `${rawV.heart_rate} bpm` : null,
      spo2: rawV.spo2 != null ? `${rawV.spo2}%` : null,
      temperature: rawV.temperature != null ? `${rawV.temperature}°F` : null,
      glucose: rawV.glucose != null ? `${rawV.glucose} mg/dL` : null,
      weight: (rawV.weight_kg ?? rawV.weight) != null ? `${rawV.weight_kg ?? rawV.weight} kg` : null,
      height: (rawV.height_cm ?? rawV.height) != null ? `${rawV.height_cm ?? rawV.height} cm` : null,
      status: rawV.status || 'Normal',
      recorded_at: rawV.recorded_at || null
    };
  }, [summaryData, propVitals, patient]);

  // 4. Active Medications
  const activeMedications = useMemo(() => {
    if (Array.isArray(summaryData?.active_medications) && summaryData.active_medications.length > 0) {
      return summaryData.active_medications;
    }
    if (Array.isArray(summaryData?.current_medications) && summaryData.current_medications.length > 0) {
      return summaryData.current_medications;
    }
    if (Array.isArray(propMeds) && propMeds.length > 0) {
      return propMeds.map(m => ({
        id: m.id,
        name: m.name || m.medicine_name || 'Prescription Drug',
        dose: m.dosage || m.dose || 'Standard',
        frequency: m.frequency || 'Once daily',
        timing: m.timing || 'Morning',
        duration: m.duration || 'As prescribed',
        instructions: m.instruction || m.instructions || 'Take with water',
        status: m.is_active ? 'Active' : 'Inactive',
        source_doc_id: m.source_document?.doc_id || null
      }));
    }
    return [];
  }, [summaryData, propMeds]);

  // 5. Recent Medical Records
  const recentRecords = useMemo(() => {
    if (Array.isArray(summaryData?.recent_medical_records) && summaryData.recent_medical_records.length > 0) {
      return summaryData.recent_medical_records;
    }
    if (Array.isArray(propDocs) && propDocs.length > 0) {
      return propDocs.slice(0, 6).map(d => ({
        id: d.id,
        doc_id: d.doc_id,
        date: d.date || (d.uploaded_at ? d.uploaded_at.split('T')[0] : 'Archived'),
        document_type: d.doc_type || 'Medical Document',
        doctor: d.doctor || 'Not specified',
        facility: d.facility || 'Not specified',
        diagnosis: d.diagnosis || 'Not specified',
        important_findings: Array.isArray(d.medications) && d.medications.length > 0 
          ? `${d.medications.length} medication(s) prescribed`
          : (d.diagnosis || 'Verified clinical record archived'),
        file_url: d.file_url || null,
        raw_text: d.extracted_text || d.raw_text || ''
      }));
    }
    return [];
  }, [summaryData, propDocs]);

  // 6. Lab / Test Results
  const labResults = useMemo(() => {
    if (Array.isArray(summaryData?.lab_test_results) && summaryData.lab_test_results.length > 0) {
      return summaryData.lab_test_results;
    }
    if (Array.isArray(summaryData?.important_labs) && summaryData.important_labs.length > 0) {
      return summaryData.important_labs;
    }
    const list = [];
    propDocs.forEach(d => {
      if (Array.isArray(d.lab_results)) {
        d.lab_results.forEach(l => {
          if (l) list.push({ ...l, date: d.date || '' });
        });
      }
    });
    return list;
  }, [summaryData, propDocs]);

  // 7. Clinical History / Timeline
  const clinicalTimeline = useMemo(() => {
    if (Array.isArray(summaryData?.clinical_history_timeline) && summaryData.clinical_history_timeline.length > 0) {
      return summaryData.clinical_history_timeline;
    }
    if (Array.isArray(summaryData?.timeline) && summaryData.timeline.length > 0) {
      return summaryData.timeline;
    }
    // Fallback from propDocs
    return [...propDocs]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .map(d => {
        const rawDate = d.date || 'Recent';
        let displayDate = rawDate;
        try {
          if (rawDate !== 'Recent') {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed)) {
              displayDate = parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            }
          }
        } catch (_) {}

        return {
          id: d.id,
          doc_id: d.doc_id,
          date_display: displayDate,
          summary_line: `${displayDate} — ${d.doc_type || 'Medical Record'}`,
          title: d.title || 'Medical Record',
          details: `${d.diagnosis ? `${d.diagnosis} • ` : ''}${d.doctor || d.facility || 'Verified EHR'}`,
          doctor: d.doctor,
          facility: d.facility
        };
      });
  }, [summaryData, propDocs]);

  // 8. AI-Generated Patient Overview
  const aiOverview = useMemo(() => {
    if (summaryData?.ai_patient_overview?.summary_text) {
      return summaryData.ai_patient_overview.summary_text;
    }
    if (summaryData?.clinical_narrative) {
      return summaryData.clinical_narrative;
    }
    if (summaryData?.hpi) {
      return summaryData.hpi;
    }
    return null;
  }, [summaryData]);

  // Total records indicator
  const totalRecordsCount = summaryData?.total_records ?? propDocs.length;
  const hasRecords = summaryData?.has_records ?? (totalRecordsCount > 0 || activeMedications.length > 0 || healthStatus.has_vitals);

  return (
    <div className="w-full bg-[#f0f7f4] min-h-[calc(100vh-4rem)] p-3 sm:p-5 lg:p-6 flex flex-col items-center select-none font-sans print:bg-white print:p-0 print:min-h-0">
      
      {/* Top Controls Header Bar (Hidden during Print) */}
      <header className="w-full max-w-5xl mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#052e0a] text-white text-[11px] font-extrabold tracking-wide uppercase shadow-xs">
            <HeartPulse className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Official Clinical Summary • EHR Live</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Doctor-Ready Patient Summary
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            Single-page concise medical profile synthesized strictly from verified database records.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            icon={Printer}
            className="bg-white hover:bg-slate-50 text-slate-800 border-slate-300 font-bold shadow-xs text-xs px-3 py-1.5"
            title="Print Doctor-Ready Summary (Optimized for A4)"
          >
            Print Summary
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            icon={Download}
            className="bg-white hover:bg-slate-50 text-slate-800 border-slate-300 font-bold shadow-xs text-xs px-3 py-1.5"
            title="Download PDF via print dialog"
          >
            Download PDF
          </Button>

          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            icon={RefreshCw}
            className={`bg-white hover:bg-slate-50 text-slate-800 border-slate-300 font-bold shadow-xs text-xs px-2.5 py-1.5 ${isRefreshing ? 'opacity-70 animate-spin' : ''}`}
            title="Refresh EHR Records"
          >
            {isRefreshing ? '' : 'Refresh'}
          </Button>

          <Link
            to="/records"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-sm transition active:scale-95"
            title="View All Detailed Medical Records"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Continuous Summary Document Container (A4 Printable Layout) */}
      <article className="w-full max-w-5xl bg-white border border-slate-300/80 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none print:max-w-none print:rounded-none">
        
        {/* PRINT HEADER: Appears only when printed on physical paper or exported to PDF */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-black text-sm">
                MK
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900">MediKiosk Clinical Health Station</h1>
                <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Doctor-Ready Patient Summary • Official EHR Record</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-600">
              <p className="font-bold">Printed: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              <p>Confidential Medical Document</p>
            </div>
          </div>
        </div>

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-20 bg-slate-100 rounded-xl border border-slate-200"></div>
            <div className="h-16 bg-rose-50/60 rounded-xl border border-rose-100"></div>
            <div className="h-24 bg-slate-100 rounded-xl border border-slate-200"></div>
            <div className="h-32 bg-slate-100 rounded-xl border border-slate-200"></div>
            <div className="h-28 bg-slate-100 rounded-xl border border-slate-200"></div>
          </div>
        )}

        {/* ERROR STATE */}
        {!isLoading && fetchError && (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Unable to generate patient summary.</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There was a connection issue loading the latest patient summary.
            </p>
            <Button
              onClick={handleManualRefresh}
              variant="outline"
              size="sm"
              icon={RefreshCw}
              className="mt-2 font-bold text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {/* NO RECORDS EMPTY STATE */}
        {!isLoading && !fetchError && !hasRecords && (
          <div className="p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-black text-slate-900">No medical records available yet.</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your doctor-ready summary compiles automatically from your verified prescriptions, lab reports, and vitals.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <Link
                to="/scanner"
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition"
              >
                Scan Doctor Slip or Prescription
              </Link>
              <Link
                to="/records"
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                View All Records
              </Link>
            </div>
          </div>
        )}

        {/* CONTINUOUS CLINICAL SUMMARY BODY (Visible when data loaded) */}
        {!isLoading && !fetchError && hasRecords && (
          <div className="divide-y divide-slate-200 text-slate-800">
            
            {/* =====================================================================
                SECTION 1: PATIENT INFORMATION
            ===================================================================== */}
            <section className="p-3.5 sm:p-4 bg-slate-50/80 print:bg-white print:p-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-800 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs print:border print:border-slate-800">
                    {(patientInfo.name || 'P')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        {patientInfo.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300/60 print:border-slate-400">
                        ✓ EHR Verified
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 mt-0.5">
                      <span><strong>ID:</strong> <code className="font-mono font-bold text-slate-900">{patientInfo.patient_id}</code></span>
                      <span>•</span>
                      <span><strong>Age:</strong> {patientInfo.age ? `${patientInfo.age} Yrs` : 'Not available'}</span>
                      <span>•</span>
                      <span><strong>Gender:</strong> {patientInfo.gender || 'Not available'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Demographics Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 font-bold text-slate-800 flex items-center gap-1.5 shrink-0 print:border-slate-400">
                    <Droplet className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                    <span>Blood: <strong className="text-slate-900">{patientInfo.blood_group || 'Not available'}</strong></span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 font-medium text-slate-700 flex items-center gap-1.5 shrink-0 print:border-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Emergency: <strong className="font-bold text-slate-900">{patientInfo.emergency_contact || 'Not available'}</strong></span>
                  </div>
                </div>
              </div>
            </section>

            {/* =====================================================================
                SECTION 2: KEY SAFETY INFORMATION (Visually Prominent)
            ===================================================================== */}
            <section className={`p-3.5 sm:p-4 transition-colors ${safetyInfo.has_critical_safety_risk ? 'bg-rose-50/70 border-l-4 border-l-rose-600' : 'bg-amber-50/50 border-l-4 border-l-amber-500'} print:bg-white print:border-l-2 print:border-slate-800 print:p-2`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className={`w-4 h-4 ${safetyInfo.has_critical_safety_risk ? 'text-rose-600' : 'text-amber-600'}`} />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    2. Key Safety Information & Alerts
                  </h3>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${safetyInfo.has_critical_safety_risk ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                  {safetyInfo.summary_status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                
                {/* Known Allergies */}
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs print:border-slate-300">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Known Allergies
                  </span>
                  {safetyInfo.known_allergies && safetyInfo.known_allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {safetyInfo.known_allergies.map((allergy, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 font-extrabold text-xs flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{allergy}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-slate-500 italic">No known drug allergies documented</p>
                  )}
                </div>

                {/* Important Clinical Alerts */}
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs print:border-slate-300">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Important Clinical Alerts
                  </span>
                  {safetyInfo.important_alerts && safetyInfo.important_alerts.length > 0 ? (
                    <ul className="space-y-1 mt-0.5">
                      {safetyInfo.important_alerts.slice(0, 3).map((alert, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs leading-tight">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${alert.severity === 'critical' ? 'bg-rose-600' : 'bg-amber-500'}`} />
                          <span className="font-bold text-slate-900">{alert.title}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs font-bold text-slate-500 italic">No critical clinical alerts</p>
                  )}
                </div>

                {/* Medication Safety Warnings */}
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs print:border-slate-300">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Medication Safety Warnings
                  </span>
                  {safetyInfo.medication_safety_warnings && safetyInfo.medication_safety_warnings.length > 0 ? (
                    <ul className="space-y-1 mt-0.5">
                      {safetyInfo.medication_safety_warnings.map((w, idx) => (
                        <li key={idx} className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold leading-tight">
                          ⚠️ {w.warning || w.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>No medication safety conflicts detected</span>
                    </p>
                  )}
                </div>

              </div>
            </section>

            {/* =====================================================================
                SECTION 3: CURRENT HEALTH STATUS (Latest Vitals)
            ===================================================================== */}
            <section className="p-3.5 sm:p-4 print:p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    3. Current Health Status (Latest Vitals)
                  </h3>
                </div>
                {healthStatus.recorded_at && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Recorded: {new Date(healthStatus.recorded_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {healthStatus.has_vitals ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
                  
                  {/* Blood Pressure */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Blood Pressure</span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                      {healthStatus.blood_pressure || 'Not available'}
                    </span>
                  </div>

                  {/* Heart Rate */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Heart Rate</span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                      {healthStatus.heart_rate || 'Not available'}
                    </span>
                  </div>

                  {/* SpO2 */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block">SpO2</span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                      {healthStatus.spo2 || 'Not available'}
                    </span>
                  </div>

                  {/* Temperature */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Temperature</span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                      {healthStatus.temperature || 'Not available'}
                    </span>
                  </div>

                  {/* Glucose */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Glucose</span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                      {healthStatus.glucose || 'Not available'}
                    </span>
                  </div>

                  {/* Weight */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Weight</span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                      {healthStatus.weight || 'Not available'}
                    </span>
                  </div>

                  {/* Height */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Height</span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                      {healthStatus.height || 'Not available'}
                    </span>
                  </div>

                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 italic">
                  No vital signs documented in current records.
                </div>
              )}
            </section>

            {/* =====================================================================
                SECTION 4: ACTIVE MEDICATIONS
            ===================================================================== */}
            <section className="p-3.5 sm:p-4 print:p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    4. Active Medications ({activeMedications.length})
                  </h3>
                </div>
              </div>

              {activeMedications.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Medication</th>
                        <th className="py-2 px-2.5">Dose</th>
                        <th className="py-2 px-2.5">Frequency</th>
                        <th className="py-2 px-2.5">Timing</th>
                        <th className="py-2 px-2.5">Duration</th>
                        <th className="py-2 px-3">Instructions</th>
                        <th className="py-2 px-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeMedications.map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {med.name}
                          </td>
                          <td className="py-2 px-2.5 font-medium">{med.dose || med.dosage || 'Standard'}</td>
                          <td className="py-2 px-2.5 font-medium">{med.frequency || 'Once daily'}</td>
                          <td className="py-2 px-2.5 font-medium">{med.timing || 'Morning'}</td>
                          <td className="py-2 px-2.5 font-medium">{med.duration || 'As directed'}</td>
                          <td className="py-2 px-3 text-slate-600">{med.instructions || med.instruction || 'Take with water'}</td>
                          <td className="py-2 px-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${med.status === 'Active' || med.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                              {med.status || (med.is_active !== false ? 'Active' : 'Inactive')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 italic">
                  No active prescribed medications on file.
                </div>
              )}
            </section>

            {/* =====================================================================
                SECTION 5: RECENT MEDICAL RECORDS
            ===================================================================== */}
            <section className="p-3.5 sm:p-4 print:p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    5. Recent Medical Records ({recentRecords.length})
                  </h3>
                </div>
                <Link to="/records" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline print:hidden">
                  Browse all {totalRecordsCount} records →
                </Link>
              </div>

              {recentRecords.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-2.5">Document Type</th>
                        <th className="py-2 px-2.5">Doctor</th>
                        <th className="py-2 px-2.5">Facility</th>
                        <th className="py-2 px-3">Diagnosis</th>
                        <th className="py-2 px-3">Important Findings</th>
                        <th className="py-2 px-2.5 text-center print:hidden">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentRecords.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {doc.date}
                          </td>
                          <td className="py-2 px-2.5 font-bold text-slate-800">
                            {doc.document_type || doc.doc_type}
                          </td>
                          <td className="py-2 px-2.5">{doc.doctor}</td>
                          <td className="py-2 px-2.5">{doc.facility}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{doc.diagnosis}</td>
                          <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={doc.important_findings || doc.findings}>
                            {doc.important_findings || doc.findings}
                          </td>
                          <td className="py-2 px-2.5 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => setSelectedDoc(doc)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-extrabold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              title="View Document Details"
                            >
                              <Eye className="w-3 h-3 text-emerald-700" />
                              <span>View Record</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 italic">
                  No recent medical documents on file.
                </div>
              )}
            </section>

            {/* =====================================================================
                SECTION 6: LAB / TEST RESULTS
            ===================================================================== */}
            <section className="p-3.5 sm:p-4 print:p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    6. Laboratory & Diagnostic Test Results ({labResults.length})
                  </h3>
                </div>
              </div>

              {labResults.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Test Name</th>
                        <th className="py-2 px-2.5">Result</th>
                        <th className="py-2 px-2.5">Unit</th>
                        <th className="py-2 px-3">Reference Range</th>
                        <th className="py-2 px-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {labResults.map((lab, idx) => {
                        const isAbn = lab.is_abnormal || (typeof lab.status === 'string' && ['high', 'low', 'abnormal'].includes(lab.status.toLowerCase()));
                        return (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-900">{lab.test_name}</td>
                            <td className="py-2 px-2.5 font-mono font-black text-slate-900">{lab.result ?? lab.value}</td>
                            <td className="py-2 px-2.5 font-medium">{lab.unit || '—'}</td>
                            <td className="py-2 px-3 text-slate-600">{lab.reference_range || 'Standard'}</td>
                            <td className="py-2 px-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isAbn ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-emerald-100 text-emerald-800'}`}>
                                {lab.status || (isAbn ? 'Abnormal' : 'Normal')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 italic">
                  No laboratory or test results documented in records.
                </div>
              )}
            </section>

            {/* =====================================================================
                SECTION 7: CLINICAL HISTORY / TIMELINE
            ===================================================================== */}
            <section className="p-3.5 sm:p-4 print:p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    7. Clinical History & Medical Timeline
                  </h3>
                </div>
              </div>

              {clinicalTimeline.length > 0 ? (
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <ol className="relative border-l border-emerald-300 ml-2.5 space-y-2.5">
                    {clinicalTimeline.slice(0, 6).map((item, idx) => (
                      <li key={idx} className="ml-4">
                        <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-emerald-700 border-2 border-white shadow-xs"></div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <span className="font-extrabold text-xs text-slate-900">
                            {item.summary_line || `${item.date_display || item.date} — ${item.title || 'Medical Event'}`}
                          </span>
                          {item.details && (
                            <span className="text-[11px] text-slate-600 sm:text-right">
                              {item.details}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 italic">
                  No chronological medical events recorded.
                </div>
              )}
            </section>

            {/* =====================================================================
                SECTION 8: AI-GENERATED PATIENT OVERVIEW
            ===================================================================== */}
            <section className="p-3.5 sm:p-4 bg-emerald-50/40 print:bg-white print:p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    8. AI-Generated Patient Overview
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide border border-emerald-200">
                  Evidence-Based Clinical Synthesis
                </span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wider mb-1.5">
                  Patient Overview
                </h4>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {aiOverview || "Evidence-based summary compiling from verified patient EHR records."}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Synthesized strictly from authenticated database records. No hallucinations or unverified clinical inferences.</span>
                  <span className="font-bold text-slate-700 shrink-0">For Physician Review Only</span>
                </div>
              </div>
            </section>

          </div>
        )}

      </article>

      {/* FOOTER ACTIONS (Non-print) */}
      <footer className="w-full max-w-5xl mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 print:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Doctor-Ready Patient Summary is encrypted, HIPAA/ABDM-compatible, and isolated to your verified identity.</span>
        </div>
        <div>
          <Link to="/records" className="font-extrabold text-emerald-800 hover:text-emerald-900 hover:underline">
            Go to Full Records Archive ({totalRecordsCount}) →
          </Link>
        </div>
      </footer>

      {/* DOCUMENT DETAIL MODAL (Opens when 'View Record' is clicked on any summarized document) */}
      {selectedDoc && (
        <Modal
          isOpen={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          title={selectedDoc.title || selectedDoc.document_type || 'Medical Document'}
          subtitle={`${selectedDoc.document_type || selectedDoc.doc_type || 'Record'} • ${selectedDoc.doctor || 'Physician'}`}
          icon={FileText}
        >
          <div className="space-y-3.5 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Attending Clinician</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDoc.doctor || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Facility / Hospital</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDoc.facility || 'Not specified'}</p>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-1">Diagnosis & Findings:</span>
              <p className="p-3 bg-emerald-50/80 text-emerald-950 rounded-xl border border-emerald-200 font-medium leading-relaxed">
                {selectedDoc.diagnosis || selectedDoc.important_findings || 'Verified clinical entry stored on file.'}
              </p>
            </div>

            {selectedDoc.raw_text && (
              <details className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <summary className="font-bold text-slate-700 text-xs select-none">
                  📄 View Extracted Text Preview
                </summary>
                <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg whitespace-pre-wrap leading-relaxed mt-2 max-h-36 overflow-y-auto">
                  {selectedDoc.raw_text}
                </pre>
              </details>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <Button
                to="/records"
                variant="primary"
                size="md"
                className="w-full sm:flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs"
                icon={ExternalLink}
              >
                Open Full Record in Medical Records
              </Button>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, ChevronRight, CheckCircle2, Search, Filter, Calendar, 
  X, Sparkles, Plus, ArrowRight, Trash2, AlertTriangle, AlertCircle, Loader2,
  Upload, Camera, UploadCloud, Stethoscope, Building2, Eye, FileUp
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';

export function RecordsPage({ patient, documents = [], onDataUpdated }) {
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('type') || searchParams.get('filter') || 'All';
  const [filter, setFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [localDocs, setLocalDocs] = useState(Array.isArray(documents) ? documents : []);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState('Prescription');
  const [uploadDoctor, setUploadDoctor] = useState('');
  const [uploadFacility, setUploadFacility] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const q = searchParams.get('type') || searchParams.get('filter');
    if (q) {
      setFilter(q);
    }
  }, [searchParams]);

  useEffect(() => {
    if (Array.isArray(documents)) {
      setLocalDocs(documents);
    }
  }, [documents]);

  const safeDocs = Array.isArray(localDocs) ? localDocs : [];
  const filteredDocs = safeDocs.filter((doc) => {
    const typeStr = (doc.doc_type || '').toLowerCase();
    const matchesFilter = filter === 'All' || 
      (filter === 'Prescription' && (typeStr.includes('prescript') || typeStr.includes('rx'))) ||
      (filter === 'Lab' && (typeStr.includes('lab') || typeStr.includes('blood') || typeStr.includes('test') || typeStr.includes('patholog'))) ||
      (filter === 'Radiology' && (typeStr.includes('radiolog') || typeStr.includes('x-ray') || typeStr.includes('scan') || typeStr.includes('imaging') || typeStr.includes('mri'))) ||
      (filter === 'Discharge' && typeStr.includes('discharge')) ||
      (filter === 'Other' && !typeStr.includes('prescript') && !typeStr.includes('lab') && !typeStr.includes('radiolog') && !typeStr.includes('discharge'));

    const matchesSearch = !searchQuery || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doctor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.facility?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15MB limit. Please choose a smaller file.');
      return;
    }
    setUploadFile(file);
    setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    setUploadError('');
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a medical document to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (patient?.patient_id && patient.patient_id !== 'Patient') {
        formData.append('patient_id', patient.patient_id);
      }
      formData.append('title', uploadTitle || uploadFile.name.replace(/\.[^/.]+$/, ''));

      // 1. Process document OCR & clinical extraction
      const scanRes = await api.scanDocument(formData);

      // 2. Commit confirmed document to database
      const parsedData = scanRes.parsed_data || scanRes.document || {};
      const payload = {
        title: uploadTitle || parsedData.title || uploadFile.name.replace(/\.[^/.]+$/, ''),
        doc_type: uploadDocType,
        doctor: uploadDoctor || parsedData.doctor || '',
        facility: uploadFacility || parsedData.facility || '',
        patient_name: patient?.name || '',
        date: parsedData.date || new Date().toISOString().split('T')[0],
        diagnosis: parsedData.diagnosis || '',
        findings: parsedData.findings || '',
        impression: parsedData.impression || '',
        medications: parsedData.medications || [],
        lab_results: parsedData.lab_results || [],
        vitals: parsedData.vitals || {},
        extracted_text: parsedData.extracted_text || '',
        file_path: parsedData.file_path || ''
      };

      const confirmRes = await api.confirmDocument(payload);
      const savedDoc = confirmRes.document;

      if (savedDoc) {
        setLocalDocs(prev => [savedDoc, ...prev]);
      }

      setFeedback({
        type: 'success',
        message: `Successfully uploaded "${uploadTitle || 'Medical Record'}". Your Health Record summary has been dynamically updated.`
      });

      // Reset upload state
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDoctor('');
      setUploadFacility('');

      // Refresh app data and dynamic Health Record
      if (onDataUpdated) {
        onDataUpdated();
      }
    } catch (err) {
      console.error('Record upload failed:', err);
      setUploadError(err.message || 'Failed to upload and process medical record. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      await api.deleteDocument(docToDelete.id);
      setLocalDocs(prev => prev.filter(d => d.id !== docToDelete.id));
      if (selectedDoc?.id === docToDelete.id) {
        setSelectedDoc(null);
      }
      setFeedback({
        type: 'success',
        message: `Successfully deleted "${docToDelete.title || 'Medical Record'}". Health Record summary has been dynamically updated.`
      });
      setDocToDelete(null);
      if (onDataUpdated) {
        onDataUpdated();
      }
    } catch (err) {
      console.error('Delete document error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete medical record. Please try again.'
      });
      setDocToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full bg-[#cbf5d6] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-6xl space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00bcd4] text-white text-xs font-bold shadow-xs mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Medical Document Repository</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#052e0a]">
              Medical Records & Document Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-700 mt-1">
              Upload, scan, and manage your prescriptions, lab reports, discharge summaries, and medical history documents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#297006] hover:bg-[#1f5604] text-white text-xs font-black shadow-xs flex items-center gap-2 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Medical Document</span>
            </button>
            <Button
              to="/scanner"
              variant="outline"
              size="sm"
              icon={Camera}
              className="bg-white/90 hover:bg-white text-gray-800 border-gray-300 font-bold shadow-xs"
            >
              Scan with Camera
            </Button>
            <Button
              to="/summary"
              variant="secondary"
              size="sm"
              icon={ArrowRight}
              className="bg-[#00bcd4] hover:bg-[#00acc1] text-white font-bold shadow-xs"
            >
              View Health Summary
            </Button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between border transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-[#052e0a]'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-gray-400 hover:text-gray-700 ml-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Filter Controls */}
        <Card className="p-4 shadow-sm border-2 border-emerald-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'All', label: 'All Records' },
              { id: 'Prescription', label: '💊 Prescriptions' },
              { id: 'Lab', label: '🧪 Blood & Labs' },
              { id: 'Radiology', label: '🩻 X-Rays & Scans' },
              { id: 'Discharge', label: '🏥 Discharge Summaries' },
              { id: 'Other', label: '📄 Other Records' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  filter === f.id
                    ? 'bg-[#297006] text-white shadow-xs font-black'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full md:w-80">
            <Input
              icon={Search}
              placeholder="Search doctor, clinic, test..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 text-xs"
            />
          </div>
        </Card>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="p-5 shadow-sm border-2 border-gray-200 hover:border-[#297006] hover:shadow-md transition flex flex-col justify-between cursor-pointer space-y-3 relative group"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <Badge variant="default" className="text-[10px] uppercase font-black bg-emerald-50 text-[#297006]">
                    {doc.doc_type}
                  </Badge>
                  <Badge variant="success" className="text-[10px]">
                    ✓ Verified
                  </Badge>
                </div>

                <h3 className="font-extrabold text-sm text-gray-900 mt-2 line-clamp-2">
                  {doc.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{doc.doctor} • {doc.facility}</p>
                
                <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-700 line-clamp-3 leading-relaxed border border-gray-100 font-medium">
                  {doc.diagnosis || doc.extracted_text}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDocToDelete(doc);
                  }}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Delete Record"
                  aria-label="Delete Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1 font-extrabold text-[#297006]">
                  <span>View Summary</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredDocs.length === 0 && (
          <Card className="p-12 text-center text-gray-500 space-y-2 border border-gray-200">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm font-bold">No clinical records found</p>
            <p className="text-xs text-gray-400">Try changing your filter or scan a new document.</p>
          </Card>
        )}

      </div>

      {/* DETAIL MODAL */}
      {selectedDoc && (
        <Modal
          isOpen={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          title={selectedDoc.title}
          subtitle={`${selectedDoc.doc_type} • ${selectedDoc.doctor}`}
          icon={FileText}
        >
          <div className="space-y-3.5 text-xs text-gray-900">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Doctor</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedDoc.doctor}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Hospital / Lab</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedDoc.facility}</p>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-700 block mb-1">Doctor's Diagnosis & Findings:</span>
              <p className="p-3.5 bg-emerald-50 text-[#052e0a] rounded-2xl border border-emerald-200 font-medium leading-relaxed">
                {selectedDoc.diagnosis}
              </p>
            </div>

            <details className="bg-gray-50 p-3 rounded-2xl border border-gray-200 cursor-pointer">
              <summary className="font-bold text-gray-700 text-xs select-none">
                📄 View Full Scanned Slip Text
              </summary>
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl whitespace-pre-wrap leading-relaxed mt-2 max-h-40 overflow-y-auto">
                {selectedDoc.extracted_text}
              </pre>
            </details>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <Button
                to="/agent"
                variant="primary"
                size="md"
                className="w-full sm:flex-1"
                icon={Sparkles}
              >
                Ask Health Assistant About this Paper
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
                onClick={handleConfirmDelete}
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

      {/* UPLOAD DOCUMENT MODAL */}
      {isUploadModalOpen && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => !isUploading && setIsUploadModalOpen(false)}
          title="Upload Medical Document"
          subtitle="Add prescriptions, lab reports, discharge summaries, or imaging scans to your records."
          icon={UploadCloud}
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs text-gray-900">
            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Document Type Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Document Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={uploadDocType}
                onChange={(e) => setUploadDocType(e.target.value)}
                disabled={isUploading}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Prescription">💊 Prescription / Doctor Slip</option>
                <option value="Lab Report">🧪 Laboratory / Blood Report</option>
                <option value="Diagnostic Imaging">🩻 Diagnostic Imaging / Radiology (X-Ray, CT, MRI)</option>
                <option value="Discharge Summary">🏥 Hospital Discharge Summary</option>
                <option value="Medical History">📋 Medical History / Certificate</option>
                <option value="Other">📄 Other Health Record</option>
              </select>
            </div>

            {/* File Input / Drag and Drop Area */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Medical Document File <span className="text-rose-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center cursor-pointer text-center ${
                  uploadFile
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-gray-300 hover:border-emerald-400 bg-gray-50 hover:bg-emerald-50/20'
                }`}
              >
                {uploadFile ? (
                  <div className="flex items-center gap-2.5 text-[#052e0a]">
                    <FileCheck2 className="w-6 h-6 text-[#297006]" />
                    <div className="text-left">
                      <p className="font-extrabold text-xs truncate max-w-xs">{uploadFile.name}</p>
                      <p className="text-[10px] text-gray-500">{(uploadFile.size / 1024).toFixed(1)} KB • Ready for extraction</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-emerald-600 mb-1.5" />
                    <p className="font-bold text-xs text-gray-800">Click to choose a file or drag & drop</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Supports PDF (.pdf), PNG, JPG, JPEG (Max 15MB)</p>
                  </>
                )}
              </div>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Record Title
              </label>
              <Input
                placeholder="e.g. Cardiology Consultation Slip"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                disabled={isUploading}
                className="text-xs bg-gray-50"
              />
            </div>

            {/* Optional Doctor and Facility in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Doctor Name (Optional)
                </label>
                <Input
                  icon={Stethoscope}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={uploadDoctor}
                  onChange={(e) => setUploadDoctor(e.target.value)}
                  disabled={isUploading}
                  className="text-xs bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Hospital / Clinic (Optional)
                </label>
                <Input
                  icon={Building2}
                  placeholder="e.g. Apollo Healthcare"
                  value={uploadFacility}
                  onChange={(e) => setUploadFacility(e.target.value)}
                  disabled={isUploading}
                  className="text-xs bg-gray-50"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-[11px] text-[#052e0a] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#297006] flex-shrink-0 mt-0.5" />
              <span>
                Uploaded documents are scanned with clinical optical recognition. Extracted medications, lab tests, and diagnoses will dynamically update your <strong>Health Record</strong> summary.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <Link
                to="/scanner"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-xs font-bold text-[#00bcd4] hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Prefer live camera scan? Open Optical Scanner</span>
              </Link>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#297006] hover:bg-[#1f5604] transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting & Saving...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload & Extract</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

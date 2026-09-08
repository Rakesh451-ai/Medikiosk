import React, { useState, useEffect } from 'react';
import { 
  FileText, ChevronRight, CheckCircle2, Search, Filter, Calendar, 
  X, Sparkles, Plus, ArrowRight, Trash2, AlertTriangle, AlertCircle, Loader2 
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
    const matchesFilter = filter === 'All' || doc.doc_type?.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch = !searchQuery || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doctor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.facility?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
        message: `Successfully deleted "${docToDelete.title || 'Medical Record'}".`
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
              <span>Saved Medical Papers</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#052e0a]">
              My Past Prescriptions & Medical Reports
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              All your doctor slips, blood tests, and imaging scans safely organized and easy to read.
            </p>
          </div>

          <Button
            to="/scanner"
            variant="secondary"
            size="md"
            icon={Plus}
            className="w-full sm:w-auto"
          >
            Scan New Paper
          </Button>
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
              { id: 'All', label: 'All Papers' },
              { id: 'Prescription', label: '💊 Prescriptions' },
              { id: 'Lab Report', label: '🧪 Blood & Labs' },
              { id: 'Radiology', label: '🩻 X-Rays & Scans' }
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
    </div>
  );
}

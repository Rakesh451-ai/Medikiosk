import React, { useState, useEffect } from 'react';
import { FileText, ChevronRight, CheckCircle2, Search, Filter, Calendar, X, Sparkles, Plus, ArrowRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export function RecordsPage({ documents = [] }) {
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('type') || searchParams.get('filter') || 'All';
  const [filter, setFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    const q = searchParams.get('type') || searchParams.get('filter');
    if (q) {
      setFilter(q);
    }
  }, [searchParams]);

  const safeDocs = Array.isArray(documents) ? documents : [];
  const filteredDocs = safeDocs.filter((doc) => {
    const matchesFilter = filter === 'All' || doc.doc_type?.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch = !searchQuery || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doctor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.facility?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
              className="p-5 shadow-sm border-2 border-gray-200 hover:border-[#297006] hover:shadow-md transition flex flex-col justify-between cursor-pointer space-y-3"
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

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-extrabold text-[#297006]">
                <span>View Summary</span>
                <ChevronRight className="w-4 h-4" />
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

      {/* DETAIL MODAL USING REUSABLE MODAL COMPONENT */}
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

            <div className="pt-2">
              <Button
                to="/agent"
                variant="primary"
                size="md"
                fullWidth
                icon={Sparkles}
              >
                Ask Health Assistant About this Paper
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { FileText, ChevronRight, CheckCircle2, Search, Filter, Calendar, X, Sparkles } from 'lucide-react';

export function MobileRecords({ documents = [], onNavigateToScanner, onNavigateToAgent }) {
  const [filter, setFilter] = useState('All');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const filteredDocs = filter === 'All' 
    ? documents 
    : documents.filter((d) => d.doc_type?.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="relative w-full h-full flex flex-col bg-[#cbf5d6] select-none font-sans overflow-y-auto pb-6">
      {/* Header */}
      <div className="w-full bg-[#052e0a] py-3 px-4 shadow-sm flex items-center justify-between text-white z-20">
        <div>
          <h3 className="font-bold text-sm">Medical Records & Reports</h3>
          <p className="text-[10px] text-emerald-300">Synced with Django REST Framework</p>
        </div>
        <button
          onClick={onNavigateToScanner}
          className="px-3 py-1 bg-[#297006] text-white rounded-full text-xs font-bold hover:bg-[#205905] transition"
        >
          + Scan New
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none z-10">
        {['All', 'Prescription', 'Lab Report', 'Radiology'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
              filter === f
                ? 'bg-[#297006] text-white shadow-xs'
                : 'bg-white/80 text-gray-700 hover:bg-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="flex-1 w-full max-w-md mx-auto px-4 space-y-2.5 z-10">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            onClick={() => setSelectedDoc(doc)}
            className="bg-white rounded-2xl p-3.5 shadow-xs border border-gray-100 hover:border-[#297006] transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3f51b5] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-[#297006]">
                  {doc.doc_type}
                </span>
                <h4 className="font-bold text-xs text-gray-900 line-clamp-1 mt-0.5">{doc.title}</h4>
                <p className="text-[10px] text-gray-500">{doc.doctor} • {doc.facility}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-[9px] font-mono text-emerald-600 font-bold">{doc.confidence}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-xs">
            No records found for this category.
          </div>
        )}
      </div>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border-4 border-[#297006] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#297006]" />
                <h3 className="font-bold text-sm text-gray-900 truncate">{selectedDoc.title}</h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Provider</span>
                  <p className="font-semibold text-gray-800">{selectedDoc.doctor}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Facility</span>
                  <p className="font-semibold text-gray-800">{selectedDoc.facility}</p>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase">Extracted Clinical Content</span>
                <pre className="mt-1 p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl whitespace-pre-wrap leading-relaxed">
                  {selectedDoc.extracted_text}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  onNavigateToAgent();
                }}
                className="flex-1 py-2.5 rounded-full bg-[#052e0a] text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Ask AI Agent About this Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

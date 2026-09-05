import React, { useState } from 'react';
import { FileText, ChevronRight, CheckCircle2, Search, Filter, Calendar, X, Sparkles, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RecordsPage({ documents = [] }) {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const filteredDocs = documents.filter((doc) => {
    const matchesFilter = filter === 'All' || doc.doc_type?.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch = !searchQuery || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doctor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.facility?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full bg-[#cbf5d6] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00bcd4] text-white text-xs font-bold shadow-xs mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Diagnostic Archive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#052e0a]">
              Medical Records & Diagnostic Reports
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Verified optical OCR archive synced directly with Django database
            </p>
          </div>

          <Link
            to="/scanner"
            className="px-5 py-2.5 rounded-full bg-[#297006] hover:bg-[#205905] text-white font-bold text-sm shadow-md transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Scan New Record</span>
          </Link>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#297006]/20 flex flex-wrap items-center justify-between gap-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {['All', 'Prescription', 'Lab Report', 'Radiology'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  filter === f
                    ? 'bg-[#297006] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports or doctors..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#297006]"
            />
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200 hover:border-[#297006] hover:shadow-md transition flex flex-col justify-between cursor-pointer space-y-3"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-[#297006]">
                    {doc.doc_type}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                    OCR {doc.confidence}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-gray-900 mt-2 line-clamp-2">
                  {doc.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{doc.doctor} • {doc.facility}</p>
                
                <div className="mt-3 p-2.5 bg-gray-50 rounded-xl text-xs text-gray-700 line-clamp-3 leading-relaxed">
                  {doc.diagnosis || doc.extracted_text}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#297006]">
                <span>Inspect Clinical Record</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {filteredDocs.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-500 space-y-2 border border-gray-200">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm font-bold">No clinical records found</p>
            <p className="text-xs text-gray-400">Try changing your filter or scan a new document.</p>
          </div>
        )}

      </div>

      {/* DETAIL MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-gray-900">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border-4 border-[#297006] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="font-extrabold text-base text-gray-900 truncate">{selectedDoc.title}</h3>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Physician</span>
                  <p className="font-semibold text-gray-800">{selectedDoc.doctor}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Hospital / Lab</span>
                  <p className="font-semibold text-gray-800">{selectedDoc.facility}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Extracted Clinical Data</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl whitespace-pre-wrap leading-relaxed mt-1">
                  {selectedDoc.extracted_text}
                </pre>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Link
                to="/agent"
                className="flex-1 py-2.5 rounded-full bg-[#052e0a] text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Ask AI Agent About this Report</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

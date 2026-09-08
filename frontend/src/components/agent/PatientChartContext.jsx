import React from 'react';
import { ShieldCheck, AlertTriangle, Activity, Heart, Thermometer, Droplets, Pill, MessageSquare } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export function PatientChartContext({
  patient,
  vitals,
  medications = [],
  conversations = [],
  currentConversationId = null,
  onSelectConversation,
  className = ''
}) {
  const getBpDisplay = () => {
    if (vitals?.bp_systolic && vitals?.bp_diastolic) {
      return `${vitals.bp_systolic}/${vitals.bp_diastolic}`;
    }
    if (vitals?.blood_pressure) {
      return vitals.blood_pressure;
    }
    return null;
  };

  const hasAllergies = patient?.allergies && patient.allergies.length > 0;

  return (
    <Card className={`p-4 sm:p-5 shadow-xs border border-emerald-100 bg-white/95 backdrop-blur-md space-y-4 rounded-2xl ${className}`}>
      {/* Card Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span>What the Assistant Knows</span>
        </h3>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          Verified Chart
        </span>
      </div>

      {/* Drug Allergies */}
      {hasAllergies ? (
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50/90 to-rose-100/50 border border-rose-200/80 text-xs text-rose-900 space-y-1 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Known Drug Allergies:</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
              High Risk
            </span>
          </div>
          <p className="font-black text-rose-950 tracking-tight text-[13px]">
            {patient.allergies.join(', ')}
          </p>
          <p className="text-[10px] text-rose-700/90">The assistant checks every question against this.</p>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border border-emerald-200/70 text-xs text-emerald-900 space-y-0.5">
          <span className="font-bold flex items-center gap-1.5 text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Documented Allergies:</span>
          </span>
          <p className="font-semibold text-slate-700">No known drug allergies recorded.</p>
        </div>
      )}

      {/* Vitals Grid */}
      <div className="space-y-1.5 text-xs">
        <span className="text-slate-700 font-bold block text-[11px] uppercase tracking-wider">
          Your Current Vitals:
        </span>
        <div className="grid grid-cols-2 gap-2">
          {/* Heart Rate */}
          <div className="bg-slate-50/80 hover:bg-emerald-50/40 p-2.5 rounded-xl border border-slate-200/70 transition-colors">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold block">Heart Rate</span>
              <Heart className="w-3 h-3 text-rose-500" />
            </div>
            <strong className="text-slate-900 text-sm font-black block mt-0.5">
              {vitals?.heart_rate ? `${vitals.heart_rate} bpm` : '—'}
            </strong>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
              {vitals?.heart_rate ? '✓ Normal' : 'Not recorded'}
            </span>
          </div>

          {/* Blood Pressure */}
          <div className="bg-slate-50/80 hover:bg-emerald-50/40 p-2.5 rounded-xl border border-slate-200/70 transition-colors">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold block">Blood Pressure</span>
              <Activity className="w-3 h-3 text-blue-500" />
            </div>
            <strong className="text-slate-900 text-sm font-black block mt-0.5">
              {getBpDisplay() || '—'}
            </strong>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
              {getBpDisplay() ? '✓ Target' : 'Not recorded'}
            </span>
          </div>

          {/* SpO2 */}
          {vitals?.spo2 ? (
            <div className="bg-slate-50/80 hover:bg-emerald-50/40 p-2.5 rounded-xl border border-slate-200/70 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-semibold block">Oxygen (SpO2)</span>
                <Droplets className="w-3 h-3 text-cyan-500" />
              </div>
              <strong className="text-slate-900 text-sm font-black block mt-0.5">{vitals.spo2}%</strong>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Target 95-100%</span>
            </div>
          ) : null}

          {/* Temperature */}
          {vitals?.temperature ? (
            <div className="bg-slate-50/80 hover:bg-emerald-50/40 p-2.5 rounded-xl border border-slate-200/70 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-semibold block">Temperature</span>
                <Thermometer className="w-3 h-3 text-amber-500" />
              </div>
              <strong className="text-slate-900 text-sm font-black block mt-0.5">{vitals.temperature}°F</strong>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Body Temp</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Prescribed Medications */}
      <div className="text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-700 font-bold block text-[11px] uppercase tracking-wider">
            Your Prescribed Medicines:
          </span>
          {medications && medications.length > 0 && (
            <span className="text-[10px] text-slate-500 font-medium">{medications.length} items</span>
          )}
        </div>

        {medications && medications.length > 0 ? (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {medications.map((m) => (
              <li
                key={m.id}
                className="p-2.5 bg-slate-50/80 hover:bg-emerald-50/30 rounded-xl border border-slate-100 flex justify-between items-center transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-md bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Pill className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">{m.name}</span>
                    <span className="text-[10px] text-slate-500 block">{m.timing || 'Daily'}</span>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px] font-bold shrink-0">
                  {m.dose || m.dosage}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl text-center text-slate-500 font-medium">
            No active medications recorded yet.
          </div>
        )}
      </div>

      {/* Past Consultations Quick Selector */}
      {conversations.length > 1 && (
        <div className="pt-2.5 border-t border-slate-100 text-xs">
          <span className="text-slate-700 font-bold block mb-1.5 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Past Consultations:</span>
          </span>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {conversations.map((c) => {
              const isActive = currentConversationId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectConversation && onSelectConversation(c.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] truncate flex items-center justify-between transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300/80 shadow-xs'
                      : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border border-transparent'
                  }`}
                >
                  <span className="truncate">{c.title || 'Consultation'}</span>
                  {c.message_count ? (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full border ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}>
                      {c.message_count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export default PatientChartContext;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import KioskView from './pages/kiosk/KioskView';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorLogin from './pages/doctor/DoctorLogin';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/kiosk" element={<KioskView />} />
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

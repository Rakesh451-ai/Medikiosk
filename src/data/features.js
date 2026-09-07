import { Camera, Activity, Bot, FileText } from 'lucide-react';

export const features = [
  {
    title: "Scan Prescription or Slip",
    description: "Hold your doctor's slip or lab report under the camera. The kiosk reads it clearly in seconds.",
    icon: Camera,
    to: "/scanner",
    tag: "1-Tap Camera Scan",
    gradient: "from-emerald-600 to-teal-700",
    bgSoft: "bg-emerald-50 text-emerald-800 border-emerald-200",
    iconBg: "bg-emerald-600 text-white",
    actionText: "Scan My Paper"
  },
  {
    title: "My Health & Vitals",
    description: "See your heart rate, blood pressure, oxygen, and daily medicines explained in plain, comforting words.",
    icon: Activity,
    to: "/summary",
    tag: "Heart & Numbers",
    gradient: "from-teal-600 to-emerald-800",
    bgSoft: "bg-teal-50 text-teal-800 border-teal-200",
    iconBg: "bg-teal-700 text-white",
    actionText: "View My Health"
  },
  {
    title: "Ask Health Assistant",
    description: "Have questions about pills or symptoms? Talk naturally with our voice-enabled friendly assistant.",
    icon: Bot,
    to: "/agent",
    tag: "Voice & Chat",
    gradient: "from-emerald-700 to-green-900",
    bgSoft: "bg-emerald-50 text-emerald-800 border-emerald-200",
    iconBg: "bg-emerald-800 text-white",
    actionText: "Talk to Assistant"
  },
  {
    title: "Past Medical Records",
    description: "Browse previous doctor prescriptions, blood tests, and scans safely kept in your personal record.",
    icon: FileText,
    to: "/records",
    tag: "Private & Safe",
    gradient: "from-teal-700 to-cyan-800",
    bgSoft: "bg-cyan-50 text-cyan-800 border-cyan-200",
    iconBg: "bg-teal-800 text-white",
    actionText: "Browse Records"
  }
];

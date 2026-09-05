/**
 * MediKiosk Design Tokens
 * Shared design variables between Patient Kiosk UI and Doctor Clinical Dashboard.
 */

export const tokens = {
  colors: {
    kiosk: {
      primary: '#15803d',       // Deep Clinical Emerald
      primaryHover: '#166534',
      primaryActive: '#14532d',
      primaryLight: '#dcfce7',
      accent: '#22c55e',
      mintBg: '#f0fdf4',
      bannerGreen: '#cbf5d6',   // From original design PDF
      headerGreen: '#297006',
      card: '#ffffff',
      textPrimary: '#0f172a',
      textMuted: '#475569',
      border: '#bbf7d0',
      touchFocusRing: '#22c55e',
    },
    doctor: {
      primary: '#2563eb',       // Clinical Royal Blue
      primaryHover: '#1d4ed8',
      sidebarBg: '#0f172a',     // Deep Slate Navy
      pageBg: '#f8fafc',
      cardBg: '#ffffff',
      textMain: '#0f172a',
      textSub: '#475569',
      textMuted: '#94a3b8',
      borderSubtle: '#e2e8f0',
      borderFocus: '#3b82f6',
    },
    triage: {
      critical: '#dc2626',      // Red Flag
      criticalBg: '#fef2f2',
      criticalBorder: '#fecaca',
      warning: '#d97706',       // Yellow / Orange
      warningBg: '#fffbeb',
      warningBorder: '#fde68a',
      safe: '#16a34a',          // Green
      safeBg: '#f0fdf4',
      safeBorder: '#bbf7d0',
    },
    neutral: {
      white: '#ffffff',
      black: '#000000',
      gray50: '#f8fafc',
      gray100: '#f1f5f9',
      gray200: '#e2e8f0',
      gray300: '#cbd5e1',
      gray400: '#94a3b8',
      gray500: '#64748b',
      gray600: '#475569',
      gray700: '#334155',
      gray800: '#1e293b',
      gray900: '#0f172a',
    }
  },

  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    kiosk: {
      heroTitle: 'text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight',
      sectionHeader: 'text-2xl sm:text-3xl font-bold',
      promptText: 'text-xl sm:text-2xl font-semibold leading-relaxed',
      buttonLabel: 'text-xl font-bold tracking-wide',
      supportingText: 'text-lg text-slate-600',
    },
    doctor: {
      pageTitle: 'text-xl sm:text-2xl font-bold text-slate-900',
      sectionHeader: 'text-sm font-semibold uppercase tracking-wider text-slate-500',
      metricValue: 'text-xl font-bold text-slate-800',
      bodyDense: 'text-xs sm:text-sm leading-normal',
      badgeText: 'text-xs font-semibold uppercase tracking-wide',
    }
  },

  touchTargets: {
    minHeight: '64px',
    largeButton: 'h-16 px-8 rounded-2xl',
    iconButton: 'w-16 h-16 rounded-2xl',
    cardPadding: 'p-6 sm:p-8',
    pillHeight: 'h-12 px-6',
  },

  spacing: {
    kioskGutter: 'p-6 sm:p-10 max-w-5xl mx-auto',
    doctorGutter: 'p-4 sm:p-6 max-w-7xl mx-auto',
  },

  radii: {
    card: 'rounded-2xl',
    modal: 'rounded-3xl',
    button: 'rounded-2xl',
    pill: 'rounded-full',
  },

  shadows: {
    soft: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
    kioskButton: '0 10px 25px -5px rgba(21, 128, 61, 0.25)',
    alert: '0 8px 25px -4px rgba(220, 38, 38, 0.25)',
  }
};

export default tokens;

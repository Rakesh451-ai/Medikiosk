import React from 'react';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('MediKiosk runtime boundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoLogin = () => {
    try {
      localStorage.removeItem('medikiosk_token');
      localStorage.removeItem('medikiosk_refresh');
      localStorage.removeItem('medikiosk_user');
    } catch (_) {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#f0f7f4] flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-rose-200 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 mx-auto flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Health Station Encountered an Issue</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                The clinical interface experienced an unexpected rendering error. You can reload the application or return to the sign in page.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-[11px] font-mono text-rose-700 overflow-auto max-h-28">
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoLogin}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In Screen</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

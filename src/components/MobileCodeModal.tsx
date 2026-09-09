import React, { useState } from 'react';
import { Smartphone, Code, Copy, Check, X, Layers } from 'lucide-react';
import { FLUTTER_CODE, REACT_NATIVE_CODE } from '../data/firmwareModule1Code';

interface MobileCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileCodeModal: React.FC<MobileCodeModalProps> = ({ isOpen, onClose }) => {
  const [selectedFramework, setSelectedFramework] = useState<'flutter' | 'react_native'>('flutter');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = selectedFramework === 'flutter' ? FLUTTER_CODE : REACT_NATIVE_CODE;
  const currentFilename = selectedFramework === 'flutter' ? 'lib/screens/smart_switch_screen.dart' : 'src/screens/SmartSwitchScreen.tsx';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Mobile Application Source Code</h3>
              <p className="text-xs text-slate-400">Production-ready mobile UI components for iOS & Android</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Framework Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                id="select-flutter-tab"
                onClick={() => setSelectedFramework('flutter')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  selectedFramework === 'flutter'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Flutter (Dart)
              </button>
              <button
                id="select-rn-tab"
                onClick={() => setSelectedFramework('react_native')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  selectedFramework === 'react_native'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                React Native (TS)
              </button>
            </div>

            <button
              id="copy-mobile-code-btn"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              id="close-mobile-code-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-slate-950 overflow-y-auto flex-1 font-mono text-xs text-slate-300">
          <div className="text-[11px] text-slate-400 mb-2 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span>File: <strong className="text-white">{currentFilename}</strong></span>
            <span>Architecture: BLoC / StateNotifier • Clean Separation</span>
          </div>
          <pre>
            <code>{currentCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

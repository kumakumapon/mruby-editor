import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const Console: React.FC = () => {
  const { consoleEntries, lastResult, clearConsole } = useAppStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleEntries, lastResult]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="console-panel flex flex-col h-full bg-slate-900 text-slate-100 font-mono text-sm">
      <div className="console-header flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
        <h3 className="font-semibold">Console</h3>
        <button
          onClick={clearConsole}
          className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
        >
          Clear
        </button>
      </div>

      <div className="console-output flex-1 overflow-auto p-3 space-y-1">
        {consoleEntries.length === 0 && !lastResult && (
          <div className="text-slate-500 text-xs">No output yet...</div>
        )}

        {consoleEntries.map((entry) => (
          <div key={entry.id} className="flex gap-2 items-start">
            <div className="mt-0.5">{getIcon(entry.type)}</div>
            <div className="flex-1 whitespace-pre-wrap break-words">
              {entry.message}
            </div>
          </div>
        ))}

        {lastResult?.error && (
          <div className="text-red-400 whitespace-pre-wrap break-words">
            ❌ {lastResult.error}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {lastResult && (
        <div className="console-stats px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
          Execution time: {lastResult.executionTime.toFixed(2)}ms
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const Console: React.FC = () => {
  const { consoleEntries, lastResult, clearConsole, clearConsoleInputLines, consoleInputLines, addConsoleInputLine } = useAppStore();
  const endRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

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

  const handleClear = () => {
    clearConsole();
    clearConsoleInputLines();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addConsoleInputLine(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="console-panel flex flex-col h-full bg-slate-900 text-slate-100 font-mono text-sm">
      <div className="console-header flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
        <h3 className="font-semibold">Console</h3>
        <button
          onClick={handleClear}
          className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
        >
          Clear
        </button>
      </div>

      <div className="console-output flex-1 overflow-auto p-3 space-y-1">
        {consoleEntries.length === 0 && consoleInputLines.length === 0 && !lastResult && (
          <div className="text-slate-500 text-xs">No output yet...</div>
        )}

        {consoleInputLines.length > 0 && (
          <div className="mb-1">
            {consoleInputLines.map((line, i) => (
              <div key={i} className="text-cyan-400 flex gap-1">
                <span className="text-slate-500 select-none">&gt;</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        )}

        {consoleEntries.map((entry) => (
          <div key={entry.id} className="flex gap-2 items-start">
            <div className="mt-0.5">{getIcon(entry.type)}</div>
            <div className="flex-1 whitespace-pre-wrap break-words">
              {entry.message}
            </div>
          </div>
        ))}

        <div ref={endRef} />
      </div>

      {lastResult && (
        <div className="console-stats px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
          Execution time: {lastResult.executionTime.toFixed(2)}ms
        </div>
      )}

      <div className="console-input flex flex-col bg-slate-800 border-t border-slate-700">
        <div className="flex items-center justify-between px-3 pt-1">
          <span className="text-xs text-slate-400">
            stdin — pre-type lines below before running (<code className="text-cyan-400">gets</code>/<code className="text-cyan-400">readline</code>)
          </span>
          {consoleInputLines.length > 0 && (
            <span className="text-xs text-cyan-500">{consoleInputLines.length} line{consoleInputLines.length !== 1 ? 's' : ''} queued</span>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-cyan-400 select-none">stdin&gt;</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a line and press Enter to queue it..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-xs"
          />
        </div>
      </div>
    </div>
  );
};

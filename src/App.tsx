import React, { useCallback, useState, useRef, useEffect } from 'react';
import { CodeEditor } from '@/components/Editor';
import { Console } from '@/components/Console';
import { Debugger } from '@/components/Debugger';
import { useAppStore } from '@/store/useAppStore';
import { getCodeSnippets } from '@/utils/codeFormatter';
import { Play, RotateCcw, Bug, Square, ChevronDown } from 'lucide-react';

export const App: React.FC = () => {
  const {
    code,
    setCode,
    executeCode,
    isExecuting,
    clearOutput,
    clearConsole,
    lastResult,
    debuggerState,
    startDebug,
    stopDebug
  } = useAppStore();

  const [showDebugger, setShowDebugger] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const snippetsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (snippetsRef.current && !snippetsRef.current.contains(e.target as Node)) {
        setShowSnippets(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const snippets = getCodeSnippets();

  const handleRun = useCallback(() => {
    executeCode(code);
  }, [code, executeCode]);

  const handleDebug = useCallback(() => {
    if (debuggerState.isRunning) {
      stopDebug();
    } else {
      startDebug(code);
      setShowDebugger(true);
    }
  }, [code, debuggerState.isRunning, startDebug, stopDebug]);

  const handleClear = useCallback(() => {
    clearOutput();
    clearConsole();
  }, [clearOutput, clearConsole]);

  return (
    <div className="app h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="app-header bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-3 md:px-6 py-3 md:py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <h1 className="text-lg md:text-2xl font-bold text-white whitespace-nowrap">
              mruby WASM Editor
            </h1>
            <span className="px-2 py-0.5 bg-blue-600 rounded-full text-xs font-semibold whitespace-nowrap">
              v0.1.0
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleRun}
              disabled={isExecuting || debuggerState.isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-900 disabled:opacity-50 rounded font-semibold transition-colors text-sm md:text-base"
            >
              <Play className="w-4 h-4" />
              Run
            </button>

            <button
              onClick={handleDebug}
              disabled={isExecuting && !debuggerState.isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded font-semibold transition-colors text-sm md:text-base ${
                debuggerState.isRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-900 disabled:opacity-50'
              }`}
            >
              {debuggerState.isRunning ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop
                </>
              ) : (
                <>
                  <Bug className="w-4 h-4" />
                  Debug
                </>
              )}
            </button>

            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm md:text-base"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>

            <div className="relative" ref={snippetsRef}>
              <button
                onClick={() => setShowSnippets((v) => !v)}
                className="flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm md:text-base"
                title="Insert code snippet"
              >
                Snippets
                <ChevronDown className="w-3 h-3" />
              </button>
              {showSnippets && (
                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded shadow-lg z-10 min-w-40">
                  {snippets.map((s) => (
                    <button
                      key={s.name}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors"
                      onClick={() => {
                        setCode(s.code);
                        setShowSnippets(false);
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDebugger((v) => !v)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors text-sm ${
                showDebugger ? 'bg-slate-600' : 'bg-slate-700 hover:bg-slate-600'
              }`}
              aria-label="Toggle debugger panel"
            >
              <Bug className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isExecuting && !debuggerState.isRunning && (
          <div className="mt-2 flex items-center gap-2 text-sm text-yellow-400">
            <div className="animate-spin">⟳</div>
            Executing...
          </div>
        )}

        {debuggerState.isPaused && (
          <div className="mt-2 flex items-center gap-2 text-sm text-yellow-400">
            ⏸ Debug paused at line {debuggerState.currentLine}
          </div>
        )}

        {lastResult && !isExecuting && !debuggerState.isPaused && (
          <div
            className={`mt-2 text-sm ${
              lastResult.success ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {lastResult.success
              ? '✓ Executed successfully'
              : `✗ Execution failed: ${lastResult.error}`}
          </div>
        )}
      </header>

      <div className="app-body flex flex-col md:flex-row flex-1 overflow-hidden gap-1 p-1">
        <div className="editor-section flex flex-col flex-1 min-h-0 gap-1">
          <div className="flex-1 min-h-0 bg-slate-800 rounded border border-slate-700 overflow-hidden">
            <CodeEditor />
          </div>
          <div className="h-48 bg-slate-800 rounded border border-slate-700 overflow-hidden">
            <Console />
          </div>
        </div>

        <div
          className={`debugger-section w-full md:w-80 bg-slate-800 rounded border border-slate-700 overflow-hidden ${
            showDebugger ? 'block' : 'hidden md:block'
          }`}
          style={{ flexShrink: 0 }}
        >
          <Debugger />
        </div>
      </div>
    </div>
  );
};

export default App;

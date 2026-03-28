import React, { useCallback } from 'react';
import { CodeEditor } from '@/components/Editor';
import { Console } from '@/components/Console';
import { Debugger } from '@/components/Debugger';
import { useAppStore } from '@/store/useAppStore';
import { Play, RotateCcw, Bug, Square } from 'lucide-react';

export const App: React.FC = () => {
  const {
    code,
    executeCode,
    isExecuting,
    clearOutput,
    clearConsole,
    lastResult,
    debuggerState,
    startDebug,
    stopDebug
  } = useAppStore();

  const handleRun = useCallback(() => {
    executeCode(code);
  }, [code, executeCode]);

  const handleDebug = useCallback(() => {
    if (debuggerState.isRunning) {
      stopDebug();
    } else {
      startDebug(code);
    }
  }, [code, debuggerState.isRunning, startDebug, stopDebug]);

  const handleClear = useCallback(() => {
    clearOutput();
    clearConsole();
  }, [clearOutput, clearConsole]);

  return (
    <div className="app h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="app-header bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              mruby WASM Editor
            </h1>
            <span className="px-3 py-1 bg-blue-600 rounded-full text-xs font-semibold">
              v0.1.0
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRun}
              disabled={isExecuting || debuggerState.isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-900 disabled:opacity-50 rounded font-semibold transition-colors"
            >
              <Play className="w-4 h-4" />
              Run
            </button>

            <button
              onClick={handleDebug}
              disabled={isExecuting && !debuggerState.isRunning}
              className={`flex items-center gap-2 px-4 py-2 rounded font-semibold transition-colors ${
                debuggerState.isRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-900 disabled:opacity-50'
              }`}
            >
              {debuggerState.isRunning ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop Debug
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
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        {isExecuting && !debuggerState.isRunning && (
          <div className="mt-3 flex items-center gap-2 text-sm text-yellow-400">
            <div className="animate-spin">⟳</div>
            Executing...
          </div>
        )}

        {debuggerState.isPaused && (
          <div className="mt-3 flex items-center gap-2 text-sm text-yellow-400">
            ⏸ Debug paused at line {debuggerState.currentLine}
          </div>
        )}

        {lastResult && !isExecuting && !debuggerState.isPaused && (
          <div
            className={`mt-3 text-sm ${
              lastResult.success ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {lastResult.success
              ? '✓ Executed successfully'
              : `✗ Execution failed: ${lastResult.error}`}
          </div>
        )}
      </header>

      <div className="app-body flex flex-1 overflow-hidden gap-1 p-1">
        <div className="editor-section flex flex-col flex-1 gap-1">
          <div className="flex-1 bg-slate-800 rounded border border-slate-700 overflow-hidden">
            <CodeEditor />
          </div>
          <div className="h-48 bg-slate-800 rounded border border-slate-700 overflow-hidden">
            <Console />
          </div>
        </div>

        <div className="debugger-section w-80 bg-slate-800 rounded border border-slate-700 overflow-hidden">
          <Debugger />
        </div>
      </div>
    </div>
  );
};

export default App;

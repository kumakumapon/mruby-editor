import React from 'react';
import { useAppStore } from '@/store/useAppStore';

export const Debugger: React.FC = () => {
  const { debuggerState, toggleBreakpoint } = useAppStore();
  const { breakpoints, variables, callStack, currentLine } = debuggerState;

  return (
    <div className="debugger-panel flex flex-col h-full bg-slate-900 text-slate-100 text-sm border-t border-slate-700">
      <div className="debugger-toolbar flex gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
        <button
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
          title="Step Into (F10)"
        >
          Step In
        </button>
        <button
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
          title="Step Over (F11)"
        >
          Step Over
        </button>
        <button
          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
          title="Continue (F5)"
        >
          Continue
        </button>
      </div>

      {currentLine >= 0 && (
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-yellow-400">
          📍 Line {currentLine}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <section className="border-b border-slate-700">
          <h4 className="px-4 py-2 bg-slate-800 font-semibold text-xs">
            BREAKPOINTS ({breakpoints.size})
          </h4>
          <div className="px-2 py-1">
            {breakpoints.size === 0 ? (
              <div className="text-slate-500 text-xs px-2 py-1">No breakpoints</div>
            ) : (
              Array.from(breakpoints.values()).map((bp) => (
                <div
                  key={bp.id}
                  className="flex items-center justify-between px-2 py-1 hover:bg-slate-800 rounded"
                >
                  <span>Line {bp.line}</span>
                  <button
                    onClick={() => toggleBreakpoint(bp.line)}
                    className="text-red-500 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="border-b border-slate-700">
          <h4 className="px-4 py-2 bg-slate-800 font-semibold text-xs">
            VARIABLES ({variables.size})
          </h4>
          <div className="px-2 py-1">
            {variables.size === 0 ? (
              <div className="text-slate-500 text-xs px-2 py-1">No variables</div>
            ) : (
              Array.from(variables.entries()).map(([name, variable]) => (
                <div
                  key={name}
                  className="px-2 py-1 hover:bg-slate-800 rounded text-xs"
                >
                  <span className="text-cyan-400">{name}</span>
                  <span className="text-slate-500">: </span>
                  <span className="text-slate-300">{variable.value}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h4 className="px-4 py-2 bg-slate-800 font-semibold text-xs">
            CALL STACK ({callStack.length})
          </h4>
          <div className="px-2 py-1">
            {callStack.length === 0 ? (
              <div className="text-slate-500 text-xs px-2 py-1">No call stack</div>
            ) : (
              callStack.map((frame, i) => (
                <div key={i} className="px-2 py-1 text-xs hover:bg-slate-800 rounded">
                  <div className="flex gap-2">
                    <span className="text-slate-500">{i}.</span>
                    <span className="text-cyan-400">{frame.functionName}</span>
                    <span className="text-slate-500">@</span>
                    <span className="text-slate-400">
                      {frame.fileName}:{frame.line}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

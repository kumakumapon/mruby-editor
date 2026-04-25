import { create } from 'zustand';
import { EditorState, ExecutionResult, DebuggerState, ConsoleEntry, TraceEvent, Variable } from '@/types';
import { interpretMruby, interpretMrubyDebug } from '@/utils/mrubyInterpreter';
import { storage } from '@/utils/storage';

let consoleEntryCounter = 0;

interface AppStore extends EditorState {
  setCode: (code: string) => void;
  setTheme: (theme: 'vs-dark' | 'vs-light') => void;
  setFontSize: (size: number) => void;

  lastResult: ExecutionResult | null;
  isExecuting: boolean;
  executeCode: (code: string) => Promise<void>;
  clearOutput: () => void;

  consoleEntries: ConsoleEntry[];
  addConsoleEntry: (entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) => void;
  clearConsole: () => void;

  consoleInputLines: string[];
  addConsoleInputLine: (line: string) => void;
  clearConsoleInputLines: () => void;

  debuggerState: DebuggerState;
  toggleBreakpoint: (line: number) => void;
  startDebug: (code: string) => Promise<void>;
  stopDebug: () => void;
  stepInto: () => void;
  stepOver: () => void;
  continueDebug: () => void;
  updateDebugVariable: (name: string, value: string) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  code: storage.loadCode(),
  language: 'ruby',
  theme: 'vs-dark',
  fontSize: 14,

  setCode: (code) => {
    storage.saveCode(code);
    set({ code });
  },
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),

  lastResult: null,
  isExecuting: false,

  executeCode: async (code) => {
    set({ isExecuting: true });
    const startTime = performance.now();

    try {
      const result = interpretMruby(code, get().consoleInputLines);
      const executionTime = performance.now() - startTime;

      if (result.error) {
        set({
          lastResult: {
            success: false,
            output: result.output,
            error: result.error,
            executionTime
          }
        });
        get().addConsoleEntry({
          type: 'error',
          message: result.error
        });
        if (result.output) {
          get().addConsoleEntry({
            type: 'log',
            message: result.output
          });
        }
      } else {
        set({
          lastResult: {
            success: true,
            output: result.output,
            executionTime
          }
        });
        get().addConsoleEntry({
          type: 'log',
          message: result.output
        });
      }
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      set({
        lastResult: {
          success: false,
          output: '',
          error: errorMsg,
          executionTime
        }
      });

      get().addConsoleEntry({
        type: 'error',
        message: errorMsg
      });
    } finally {
      set({ isExecuting: false });
    }
  },

  clearOutput: () => set({ lastResult: null }),

  consoleEntries: [],

  addConsoleEntry: (entry) => {
    set((state) => ({
      consoleEntries: [
        ...state.consoleEntries,
        {
          ...entry,
          id: `console-${++consoleEntryCounter}`,
          timestamp: new Date()
        }
      ]
    }));
  },

  clearConsole: () => set({ consoleEntries: [] }),

  consoleInputLines: [],

  addConsoleInputLine: (line) => {
    set((state) => ({
      consoleInputLines: [...state.consoleInputLines, line]
    }));
  },

  clearConsoleInputLines: () => set({ consoleInputLines: [] }),

  debuggerState: {
    isRunning: false,
    isPaused: false,
    currentLine: -1,
    breakpoints: new Map(),
    callStack: [],
    variables: new Map(),
    stepMode: null,
    trace: [],
    traceIndex: -1,
    fullOutput: '',
    fullError: undefined
  },

  toggleBreakpoint: (line) => {
    set((state) => {
      const bp = state.debuggerState.breakpoints;
      const newBp = new Map(bp);

      if (newBp.has(line)) {
        newBp.delete(line);
      } else {
        newBp.set(line, {
          id: `bp-${line}`,
          line,
          enabled: true
        });
      }

      return {
        debuggerState: {
          ...state.debuggerState,
          breakpoints: newBp
        }
      };
    });
  },

  startDebug: async (code) => {
    set((state) => ({
      debuggerState: {
        ...state.debuggerState,
        isRunning: true,
        isPaused: false,
        currentLine: -1,
        trace: [],
        traceIndex: -1,
        variables: new Map(),
        callStack: [],
        fullOutput: '',
        fullError: undefined
      },
      isExecuting: true,
      consoleEntries: [],
      lastResult: null
    }));

    try {
      const { result, trace } = interpretMrubyDebug(code, get().consoleInputLines);
      const breakpoints = get().debuggerState.breakpoints;

      // Find first breakpoint in trace, or start at index 0
      let startIdx = 0;
      if (breakpoints.size > 0) {
        const bpLines = new Set(Array.from(breakpoints.values()).filter(bp => bp.enabled).map(bp => bp.line));
        const bpIdx = trace.findIndex(e => bpLines.has(e.line));
        if (bpIdx >= 0) startIdx = bpIdx;
      }

      if (trace.length === 0) {
        // No trace (empty code or all comments)
        const executionTime = 0;
        set((state) => ({
          debuggerState: {
            ...state.debuggerState,
            isRunning: false,
            isPaused: false,
            currentLine: -1,
            fullOutput: result.output,
            fullError: result.error
          },
          isExecuting: false,
          lastResult: {
            success: !result.error,
            output: result.output,
            error: result.error,
            executionTime
          }
        }));
        if (result.output) {
          get().addConsoleEntry({ type: 'log', message: result.output });
        }
        if (result.error) {
          get().addConsoleEntry({ type: 'error', message: result.error });
        }
        return;
      }

      // Update variables as Map<string, Variable>
      const firstEvent = trace[startIdx];
      const vars = buildVariableMap(firstEvent);

      set((state) => ({
        debuggerState: {
          ...state.debuggerState,
          isRunning: true,
          isPaused: true,
          trace,
          traceIndex: startIdx,
          currentLine: firstEvent.line,
          variables: vars,
          callStack: firstEvent.callStack.map(name => ({
            functionName: name,
            fileName: 'main.rb',
            line: firstEvent.line,
            column: 1
          })),
          fullOutput: result.output,
          fullError: result.error
        },
        isExecuting: false
      }));

      // Show only the output produced up to the current trace position
      const partialOutput = result.output.substring(0, firstEvent.outputLength);
      if (partialOutput) {
        get().addConsoleEntry({ type: 'log', message: partialOutput });
      }
      if (result.error) {
        get().addConsoleEntry({ type: 'error', message: result.error });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      set((state) => ({
        debuggerState: {
          ...state.debuggerState,
          isRunning: false,
          isPaused: false
        },
        isExecuting: false
      }));
      get().addConsoleEntry({ type: 'error', message: errorMsg });
    }
  },

  stopDebug: () => {
    set((state) => ({
      debuggerState: {
        ...state.debuggerState,
        isRunning: false,
        isPaused: false,
        currentLine: -1,
        trace: [],
        traceIndex: -1,
        variables: new Map(),
        callStack: [],
        stepMode: null,
        fullOutput: '',
        fullError: undefined
      }
    }));
  },

  stepInto: () => {
    const state = get();
    const { trace, traceIndex, fullOutput, fullError } = state.debuggerState;
    if (!state.debuggerState.isPaused || trace.length === 0) return;

    const nextIdx = traceIndex + 1;
    if (nextIdx >= trace.length) {
      // End of trace - show full output
      set((s) => ({
        debuggerState: {
          ...s.debuggerState,
          isRunning: false,
          isPaused: false,
          currentLine: -1,
          stepMode: null
        },
        consoleEntries: buildDebugConsoleEntries(fullOutput, fullError)
      }));
      return;
    }

    const event = trace[nextIdx];
    const vars = buildVariableMap(event);
    const partialOutput = fullOutput.substring(0, event.outputLength);
    set((s) => ({
      debuggerState: {
        ...s.debuggerState,
        traceIndex: nextIdx,
        currentLine: event.line,
        variables: vars,
        callStack: event.callStack.map(name => ({
          functionName: name,
          fileName: 'main.rb',
          line: event.line,
          column: 1
        })),
        stepMode: 'into'
      },
      consoleEntries: buildDebugConsoleEntries(partialOutput)
    }));
  },

  stepOver: () => {
    // Step over: advance to next line at same or outer call stack depth
    const state = get();
    const { trace, traceIndex, fullOutput, fullError } = state.debuggerState;
    if (!state.debuggerState.isPaused || trace.length === 0) return;

    const currentDepth = trace[traceIndex]?.callStack.length ?? 1;
    let nextIdx = traceIndex + 1;
    while (nextIdx < trace.length && trace[nextIdx].callStack.length > currentDepth) {
      nextIdx++;
    }

    if (nextIdx >= trace.length) {
      // End of trace - show full output
      set((s) => ({
        debuggerState: {
          ...s.debuggerState,
          isRunning: false,
          isPaused: false,
          currentLine: -1,
          stepMode: null
        },
        consoleEntries: buildDebugConsoleEntries(fullOutput, fullError)
      }));
      return;
    }

    const event = trace[nextIdx];
    const vars = buildVariableMap(event);
    const partialOutput = fullOutput.substring(0, event.outputLength);
    set((s) => ({
      debuggerState: {
        ...s.debuggerState,
        traceIndex: nextIdx,
        currentLine: event.line,
        variables: vars,
        callStack: event.callStack.map(name => ({
          functionName: name,
          fileName: 'main.rb',
          line: event.line,
          column: 1
        })),
        stepMode: 'over'
      },
      consoleEntries: buildDebugConsoleEntries(partialOutput)
    }));
  },

  continueDebug: () => {
    const state = get();
    const { trace, traceIndex, breakpoints, fullOutput, fullError } = state.debuggerState;
    if (!state.debuggerState.isPaused || trace.length === 0) return;

    const bpLines = new Set(
      Array.from(breakpoints.values())
        .filter(bp => bp.enabled)
        .map(bp => bp.line)
    );

    // Find next breakpoint after current position
    let nextIdx = traceIndex + 1;
    while (nextIdx < trace.length && !bpLines.has(trace[nextIdx].line)) {
      nextIdx++;
    }

    if (nextIdx >= trace.length) {
      // No more breakpoints - finished, show full output
      set((s) => ({
        debuggerState: {
          ...s.debuggerState,
          isRunning: false,
          isPaused: false,
          currentLine: -1,
          stepMode: null
        },
        consoleEntries: buildDebugConsoleEntries(fullOutput, fullError)
      }));
      return;
    }

    const event = trace[nextIdx];
    const vars = buildVariableMap(event);
    const partialOutput = fullOutput.substring(0, event.outputLength);
    set((s) => ({
      debuggerState: {
        ...s.debuggerState,
        traceIndex: nextIdx,
        currentLine: event.line,
        variables: vars,
        callStack: event.callStack.map(name => ({
          functionName: name,
          fileName: 'main.rb',
          line: event.line,
          column: 1
        })),
        stepMode: null
      },
      consoleEntries: buildDebugConsoleEntries(partialOutput)
    }));
  },

  updateDebugVariable: (name: string, value: string) => {
    set((state) => {
      const newVariables = new Map(state.debuggerState.variables);
      const existing = newVariables.get(name);
      if (existing) {
        newVariables.set(name, { ...existing, value });
      }
      return {
        debuggerState: {
          ...state.debuggerState,
          variables: newVariables
        }
      };
    });
  }
}));

function buildVariableMap(event: TraceEvent): Map<string, Variable> {
  const vars = new Map<string, Variable>();
  for (const [name, value] of Object.entries(event.vars)) {
    vars.set(name, {
      name,
      value,
      type: typeof value,
      expandable: false
    });
  }
  return vars;
}

function buildDebugConsoleEntries(output: string, error?: string): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  if (output) {
    const id = ++consoleEntryCounter;
    entries.push({
      id: `debug-output-${id}`,
      type: 'log',
      message: output,
      timestamp: new Date()
    });
  }
  if (error) {
    const id = ++consoleEntryCounter;
    entries.push({
      id: `debug-error-${id}`,
      type: 'error',
      message: error,
      timestamp: new Date()
    });
  }
  return entries;
}

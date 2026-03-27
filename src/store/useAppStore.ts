import { create } from 'zustand';
import { EditorState, ExecutionResult, DebuggerState, ConsoleEntry } from '@/types';
import { interpretMruby } from '@/utils/mrubyInterpreter';

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

  debuggerState: DebuggerState;
  toggleBreakpoint: (line: number) => void;
  stepInto: () => Promise<void>;
  stepOver: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  code: `# mruby コード例\nputs "Hello, mruby!"`,
  language: 'ruby',
  theme: 'vs-dark',
  fontSize: 14,

  setCode: (code) => set({ code }),
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),

  lastResult: null,
  isExecuting: false,

  executeCode: async (code) => {
    set({ isExecuting: true });
    const startTime = performance.now();

    try {
      const result = interpretMruby(code);
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
          id: `console-${Date.now()}`,
          timestamp: new Date()
        }
      ]
    }));
  },

  clearConsole: () => set({ consoleEntries: [] }),

  debuggerState: {
    isRunning: false,
    isPaused: false,
    currentLine: -1,
    breakpoints: new Map(),
    callStack: [],
    variables: new Map(),
    stepMode: null
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

  stepInto: async () => {
    set((state) => ({
      debuggerState: {
        ...state.debuggerState,
        stepMode: 'into'
      }
    }));
  },

  stepOver: async () => {
    set((state) => ({
      debuggerState: {
        ...state.debuggerState,
        stepMode: 'over'
      }
    }));
  }
}));

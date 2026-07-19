# 旧WASM実装案（履歴資料）

> **注意:** この文書は初期の実装案であり、現行コードを表すものではありません。
> 現在の Ruby Subset Editor はWebAssemblyや公式mrubyランタイムを使用せず、
> TypeScript製の独自Rubyサブセットインタープリタを使用しています。

## 当初案: mruby WASM ビジュアルエディタ

## 📝 ファイル別実装例

-----

## 1. プロジェクト初期化

### `package.json`

```json
{
  "name": "mruby-wasm-editor",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && gh-pages -d dist"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@monaco-editor/react": "^4.5.0",
    "zustand": "^4.4.0",
    "lucide-react": "^0.263.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "gh-pages": "^6.0.0"
  }
}
```

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/mruby-wasm-editor/',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'monaco': ['@monaco-editor/react']
        }
      }
    }
  }
});
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

-----

## 2. 型定義

### `src/types/index.ts`

```typescript
// デバッガ関連
export interface Breakpoint {
  id: string;
  line: number;
  condition?: string;
  enabled: boolean;
}

export interface StackFrame {
  functionName: string;
  fileName: string;
  line: number;
  column: number;
}

export interface Variable {
  name: string;
  value: string;
  type: string;
  expandable: boolean;
}

export interface DebuggerState {
  isRunning: boolean;
  isPaused: boolean;
  currentLine: number;
  breakpoints: Map<number, Breakpoint>;
  callStack: StackFrame[];
  variables: Map<string, Variable>;
  stepMode: 'into' | 'over' | 'out' | null;
}

// 実行結果
export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

// コンソール出力
export interface ConsoleEntry {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
}

// エディタ状態
export interface EditorState {
  code: string;
  language: 'ruby' | 'javascript';
  theme: 'vs-dark' | 'vs-light';
  fontSize: number;
}
```

-----

## 3. 状態管理 (Zustand)

### `src/store/useAppStore.ts`

```typescript
import { create } from 'zustand';
import { EditorState, ExecutionResult, DebuggerState, ConsoleEntry } from '@/types';

interface AppStore extends EditorState {
  // エディタ
  setCode: (code: string) => void;
  setTheme: (theme: 'vs-dark' | 'vs-light') => void;
  setFontSize: (size: number) => void;

  // 実行
  lastResult: ExecutionResult | null;
  isExecuting: boolean;
  executeCode: (code: string) => Promise<void>;
  clearOutput: () => void;

  // コンソール
  consoleEntries: ConsoleEntry[];
  addConsoleEntry: (entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) => void;
  clearConsole: () => void;

  // デバッガ
  debuggerState: DebuggerState;
  toggleBreakpoint: (line: number) => void;
  stepInto: () => Promise<void>;
  stepOver: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // エディタ初期状態
  code: `# mruby コード例\nputs "Hello, mruby!"`,
  language: 'ruby',
  theme: 'vs-dark',
  fontSize: 14,

  setCode: (code) => set({ code }),
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),

  // 実行
  lastResult: null,
  isExecuting: false,

  executeCode: async (code) => {
    set({ isExecuting: true });
    const startTime = performance.now();

    try {
      // mruby WASM で実行 (後で実装)
      const output = await executeMrubyCode(code);
      const executionTime = performance.now() - startTime;

      set({
        lastResult: {
          success: true,
          output,
          executionTime
        }
      });

      get().addConsoleEntry({
        type: 'log',
        message: output
      });
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

  // コンソール
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

  // デバッガ
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
    // デバッグ処理 (後で実装)
  },

  stepOver: async () => {
    set((state) => ({
      debuggerState: {
        ...state.debuggerState,
        stepMode: 'over'
      }
    }));
    // デバッグ処理 (後で実装)
  }
}));

// 仮実装: mruby コード実行
async function executeMrubyCode(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // 実装: WASM 呼び出し
      const result = `Output:\n${code}`;
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}
```

-----

## 4. WASM ランタイムラッパー

### `src/hooks/useMruby.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';

export interface MrubyRuntime {
  execute(code: string): Promise<string>;
  eval(expression: string): Promise<any>;
  isReady: boolean;
}

declare global {
  interface Window {
    mruby?: any;
    Module?: any;
  }
}

export const useMruby = (): MrubyRuntime => {
  const runtimeRef = useRef<MrubyRuntime | null>(null);
  const isReadyRef = useRef(false);

  useEffect(() => {
    const initMruby = async () => {
      try {
        // WASM モジュール読み込み
        const wasmScript = document.createElement('script');
        wasmScript.src = '/mruby.js';
        wasmScript.async = true;

        wasmScript.onload = () => {
          // Module インスタンス初期化完了を待つ
          if (window.Module) {
            window.Module.onRuntimeInitialized = () => {
              const mruby = window.mruby || window.Module;

              runtimeRef.current = {
                isReady: true,

                execute: async (code: string): Promise<string> => {
                  return new Promise((resolve, reject) => {
                    try {
                      // mruby WASM の execute メソッド呼び出し
                      const result = mruby.execute(code);
                      resolve(result || '');
                    } catch (error) {
                      reject(error);
                    }
                  });
                },

                eval: async (expression: string): Promise<any> => {
                  return new Promise((resolve, reject) => {
                    try {
                      const result = mruby.eval(expression);
                      resolve(result);
                    } catch (error) {
                      reject(error);
                    }
                  });
                }
              };

              isReadyRef.current = true;
            };
          }
        };

        wasmScript.onerror = () => {
          console.error('Failed to load mruby.wasm');
        };

        document.body.appendChild(wasmScript);
      } catch (error) {
        console.error('Error initializing mruby:', error);
      }
    };

    initMruby();

    return () => {
      // クリーンアップ
      if (window.mruby && typeof window.mruby.cleanup === 'function') {
        window.mruby.cleanup();
      }
    };
  }, []);

  return (
    runtimeRef.current || {
      isReady: false,
      execute: async () => {
        throw new Error('mruby runtime not initialized');
      },
      eval: async () => {
        throw new Error('mruby runtime not initialized');
      }
    }
  );
};
```

### `src/hooks/useDebugger.ts`

```typescript
import { useCallback, useState } from 'react';
import { DebuggerState, StackFrame, Variable, Breakpoint } from '@/types';

export const useDebugger = () => {
  const [state, setState] = useState<DebuggerState>({
    isRunning: false,
    isPaused: false,
    currentLine: -1,
    breakpoints: new Map(),
    callStack: [],
    variables: new Map(),
    stepMode: null
  });

  const toggleBreakpoint = useCallback((line: number) => {
    setState((prev) => {
      const bp = new Map(prev.breakpoints);
      if (bp.has(line)) {
        bp.delete(line);
      } else {
        bp.set(line, {
          id: `bp-${line}`,
          line,
          enabled: true
        });
      }
      return { ...prev, breakpoints: bp };
    });
  }, []);

  const setBreakpointCondition = useCallback(
    (line: number, condition: string) => {
      setState((prev) => {
        const bp = prev.breakpoints.get(line);
        if (bp) {
          bp.condition = condition;
          const newBp = new Map(prev.breakpoints);
          newBp.set(line, bp);
          return { ...prev, breakpoints: newBp };
        }
        return prev;
      });
    },
    []
  );

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true, isRunning: false }));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPaused: false,
      isRunning: true,
      stepMode: null
    }));
  }, []);

  const stepInto = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPaused: true,
      stepMode: 'into'
    }));
  }, []);

  const stepOver = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPaused: true,
      stepMode: 'over'
    }));
  }, []);

  const updateVariables = useCallback((vars: Map<string, Variable>) => {
    setState((prev) => ({ ...prev, variables: vars }));
  }, []);

  const updateCallStack = useCallback((stack: StackFrame[]) => {
    setState((prev) => ({ ...prev, callStack: stack }));
  }, []);

  const updateCurrentLine = useCallback((line: number) => {
    setState((prev) => ({ ...prev, currentLine: line }));
  }, []);

  return {
    ...state,
    toggleBreakpoint,
    setBreakpointCondition,
    pause,
    resume,
    stepInto,
    stepOver,
    updateVariables,
    updateCallStack,
    updateCurrentLine
  };
};
```

-----

## 5. コンポーネント実装

### `src/components/Editor.tsx`

```typescript
import React, { useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '@/store/useAppStore';

export const CodeEditor: React.FC = () => {
  const { code, setCode, theme, fontSize } = useAppStore();

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setCode(value);
      }
    },
    [setCode]
  );

  return (
    <div className="editor-container h-full">
      <Editor
        height="100%"
        language="ruby"
        value={code}
        onChange={handleEditorChange}
        theme={theme === 'vs-dark' ? 'vs-dark' : 'vs'}
        options={{
          minimap: { enabled: false },
          fontSize,
          fontFamily: "'Jetbrains Mono', 'Courier New', monospace",
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          formatOnPaste: true
        }}
      />
    </div>
  );
};
```

### `src/components/Console.tsx`

```typescript
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
```

### `src/components/Debugger.tsx`

```typescript
import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ChevronRight, ChevronDown } from 'lucide-react';

export const Debugger: React.FC = () => {
  const { debuggerState, toggleBreakpoint } = useAppStore();
  const { breakpoints, variables, callStack, currentLine } = debuggerState;

  return (
    <div className="debugger-panel flex flex-col h-full bg-slate-900 text-slate-100 text-sm border-t border-slate-700">
      {/* ツールバー */}
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

      {/* 現在行表示 */}
      {currentLine >= 0 && (
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-yellow-400">
          📍 Line {currentLine}
        </div>
      )}

      {/* ブレークポイント */}
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

        {/* 変数 */}
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

        {/* スタック */}
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
```

-----

## 6. メインアプリケーション

### `src/App.tsx`

```typescript
import React, { useCallback } from 'react';
import { CodeEditor } from '@/components/Editor';
import { Console } from '@/components/Console';
import { Debugger } from '@/components/Debugger';
import { useAppStore } from '@/store/useAppStore';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const App: React.FC = () => {
  const { code, executeCode, isExecuting, clearOutput, lastResult } = useAppStore();

  const handleRun = useCallback(() => {
    executeCode(code);
  }, [code, executeCode]);

  const handleClear = useCallback(() => {
    clearOutput();
  }, [clearOutput]);

  return (
    <div className="app h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* ヘッダー */}
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
              disabled={isExecuting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-900 rounded font-semibold transition-colors"
            >
              <Play className="w-4 h-4" />
              Run
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

        {isExecuting && (
          <div className="mt-3 flex items-center gap-2 text-sm text-yellow-400">
            <div className="animate-spin">
              <Pause className="w-4 h-4" />
            </div>
            Executing...
          </div>
        )}

        {lastResult && !isExecuting && (
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

      {/* メインレイアウト */}
      <div className="app-body flex flex-1 overflow-hidden gap-1 p-1">
        {/* エディタ + コンソール */}
        <div className="editor-section flex flex-col flex-1 gap-1">
          <div className="flex-1 bg-slate-800 rounded border border-slate-700 overflow-hidden">
            <CodeEditor />
          </div>
          <div className="h-48 bg-slate-800 rounded border border-slate-700 overflow-hidden">
            <Console />
          </div>
        </div>

        {/* デバッガパネル */}
        <div className="debugger-section w-80 bg-slate-800 rounded border border-slate-700 overflow-hidden">
          <Debugger />
        </div>
      </div>
    </div>
  );
};

export default App;
```

### `src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --font-mono: 'Jetbrains Mono', 'Courier New', monospace;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: rgb(15, 23, 42);
  color: rgb(226, 232, 240);
}

code,
pre {
  font-family: var(--font-mono);
}

/* カスタムスクロールバー */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgb(30, 41, 59);
}

::-webkit-scrollbar-thumb {
  background: rgb(100, 116, 139);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgb(148, 163, 184);
}

/* Monaco Editor カスタマイズ */
.monaco-editor {
  font-family: var(--font-mono) !important;
}

.editor-container {
  background-color: rgb(30, 41, 59);
  color: rgb(226, 232, 240);
}

/* デバッガパネル */
.debugger-button {
  @apply px-3 py-1 text-xs font-semibold rounded transition-colors;
}

.breakpoint-marker {
  position: absolute;
  left: 0;
  width: 20px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgb(239, 68, 68);
}

.breakpoint-marker:hover {
  background-color: rgba(239, 68, 68, 0.1);
}
```

-----

## 7. GitHub Actions デプロイ設定

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        if: github.ref == 'refs/heads/main'
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          cname: mruby-editor.example.com  # 独自ドメイン使用時
```

-----

## 8. ブートストラップスクリプト

### `public/index.html`

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="mruby WebAssembly Visual Editor and Debugger" />
    <title>mruby WASM Editor</title>

    <!-- Preload WASM -->
    <link rel="preload" href="/mruby.wasm" as="fetch" crossorigin />

    <!-- Monaco Editor CDN (オプション) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

-----

## 9. ユーティリティ関数

### `src/utils/codeFormatter.ts`

```typescript
export const formatCode = (code: string): string => {
  // Ruby コードの自動フォーマット
  return code
    .split('\n')
    .map((line) => {
      // インデント自動調整など
      return line.trim() ? '  '.repeat(getIndentLevel(line)) + line.trim() : '';
    })
    .join('\n');
};

function getIndentLevel(line: string): number {
  const trimmed = line.trim();

  if (
    trimmed.startsWith('def ') ||
    trimmed.startsWith('class ') ||
    trimmed.startsWith('if ') ||
    trimmed.startsWith('unless ') ||
    trimmed.startsWith('while ') ||
    trimmed.startsWith('for ')
  ) {
    return 1;
  }

  if (trimmed.startsWith('end') || trimmed.startsWith('else')) {
    return 0;
  }

  return 0;
}

export const getCodeSnippets = () => [
  {
    name: 'Hello World',
    code: 'puts "Hello, mruby!"'
  },
  {
    name: 'Loop',
    code: '5.times { |i| puts i }'
  },
  {
    name: 'Array',
    code: 'arr = [1, 2, 3]\nputs arr.sum'
  }
];
```

### `src/utils/storage.ts`

```typescript
export const storage = {
  saveCode: (code: string) => {
    try {
      localStorage.setItem('mruby-code', code);
    } catch (e) {
      console.error('Failed to save code', e);
    }
  },

  loadCode: (): string => {
    try {
      return localStorage.getItem('mruby-code') || '# mruby code';
    } catch (e) {
      console.error('Failed to load code', e);
      return '# mruby code';
    }
  },

  clearCode: () => {
    try {
      localStorage.removeItem('mruby-code');
    } catch (e) {
      console.error('Failed to clear code', e);
    }
  }
};
```

-----

## 10. テスト例

### `src/__tests__/store.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '@/store/useAppStore';

describe('useAppStore', () => {
  it('should initialize with default code', () => {
    const { result } = renderHook(() => useAppStore());
    expect(result.current.code).toBeTruthy();
  });

  it('should update code', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setCode('puts "test"');
    });

    expect(result.current.code).toBe('puts "test"');
  });

  it('should toggle breakpoints', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.toggleBreakpoint(5);
    });

    expect(result.current.debuggerState.breakpoints.has(5)).toBe(true);

    act(() => {
      result.current.toggleBreakpoint(5);
    });

    expect(result.current.debuggerState.breakpoints.has(5)).toBe(false);
  });
});
```

-----

## 📋 セットアップ手順

```bash
# 1. プロジェクト作成
npm create vite@latest mruby-wasm-editor -- --template react-ts
cd mruby-wasm-editor

# 2. 依存関係インストール
npm install

# 3. 上記ファイルをコピー

# 4. mruby.wasm + mruby.js を public/ に配置
cp ../mruby-build/mruby.{wasm,js} public/

# 5. 開発サーバー起動
npm run dev

# 6. ビルド
npm run build

# 7. デプロイ
npm run deploy
```

このコード集で、すぐに実装を開始できます! 🚀

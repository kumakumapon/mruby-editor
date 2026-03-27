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

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface ConsoleEntry {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
}

export interface EditorState {
  code: string;
  language: 'ruby' | 'javascript';
  theme: 'vs-dark' | 'vs-light';
  fontSize: number;
}

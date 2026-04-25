import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      code: '# mruby コード例\nputs "Hello, mruby!"',
      language: 'ruby',
      theme: 'vs-dark',
      fontSize: 14,
      lastResult: null,
      isExecuting: false,
      consoleEntries: [],
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
      }
    });
  });

  it('should initialize with default code', () => {
    const state = useAppStore.getState();
    expect(state.code).toBeTruthy();
  });

  it('should update code', () => {
    const { setCode } = useAppStore.getState();
    setCode('puts "test"');
    expect(useAppStore.getState().code).toBe('puts "test"');
  });

  it('should toggle breakpoints', () => {
    const { toggleBreakpoint } = useAppStore.getState();
    toggleBreakpoint(5);
    expect(useAppStore.getState().debuggerState.breakpoints.has(5)).toBe(true);
    toggleBreakpoint(5);
    expect(useAppStore.getState().debuggerState.breakpoints.has(5)).toBe(false);
  });

  it('should add console entries', () => {
    const { addConsoleEntry } = useAppStore.getState();
    addConsoleEntry({ type: 'log', message: 'test message' });
    const entries = useAppStore.getState().consoleEntries;
    expect(entries.length).toBe(1);
    expect(entries[0].message).toBe('test message');
  });

  it('should clear console', () => {
    const { addConsoleEntry, clearConsole } = useAppStore.getState();
    addConsoleEntry({ type: 'log', message: 'test' });
    clearConsole();
    expect(useAppStore.getState().consoleEntries.length).toBe(0);
  });

  it('should update theme', () => {
    const { setTheme } = useAppStore.getState();
    setTheme('vs-light');
    expect(useAppStore.getState().theme).toBe('vs-light');
  });

  it('should update font size', () => {
    const { setFontSize } = useAppStore.getState();
    setFontSize(18);
    expect(useAppStore.getState().fontSize).toBe(18);
  });

  it('should execute code and produce output', async () => {
    const { executeCode } = useAppStore.getState();
    await executeCode('puts "hello"');
    const state = useAppStore.getState();
    expect(state.lastResult).not.toBeNull();
    expect(state.lastResult?.success).toBe(true);
    expect(state.lastResult?.output).toContain('hello');
  });
});

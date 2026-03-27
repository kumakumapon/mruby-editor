import { useCallback, useState } from 'react';
import { DebuggerState, StackFrame, Variable } from '@/types';

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
        bp.set(line, { id: `bp-${line}`, line, enabled: true });
      }
      return { ...prev, breakpoints: bp };
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true, isRunning: false }));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false, isRunning: true, stepMode: null }));
  }, []);

  const stepInto = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true, stepMode: 'into' }));
  }, []);

  const stepOver = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true, stepMode: 'over' }));
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
    pause,
    resume,
    stepInto,
    stepOver,
    updateVariables,
    updateCallStack,
    updateCurrentLine
  };
};

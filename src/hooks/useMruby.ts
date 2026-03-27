import { useEffect, useRef } from 'react';
import { interpretMruby } from '@/utils/mrubyInterpreter';

export interface MrubyRuntime {
  execute(code: string): Promise<string>;
  eval(expression: string): Promise<unknown>;
  isReady: boolean;
}

export const useMruby = (): MrubyRuntime => {
  const runtimeRef = useRef<MrubyRuntime>({
    isReady: true,
    execute: async (code: string): Promise<string> => {
      const result = interpretMruby(code);
      if (result.error) throw new Error(result.error);
      return result.output;
    },
    eval: async (expression: string): Promise<unknown> => {
      const result = interpretMruby(expression);
      return result.output;
    }
  });

  useEffect(() => {
    // Runtime is immediately ready with JS interpreter
  }, []);

  return runtimeRef.current;
};

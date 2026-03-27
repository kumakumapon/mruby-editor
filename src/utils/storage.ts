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

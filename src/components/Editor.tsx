import React, { useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
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
      <MonacoEditor
        height="100%"
        language="ruby"
        value={code}
        onChange={handleEditorChange}
        theme={theme === 'vs-dark' ? 'vs-dark' : 'vs'}
        options={{
          minimap: { enabled: false },
          fontSize,
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
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

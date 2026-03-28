import React, { useCallback, useRef, useEffect } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import { useAppStore } from '@/store/useAppStore';
import * as monaco from 'monaco-editor';

export const CodeEditor: React.FC = () => {
  const { code, setCode, theme, fontSize, debuggerState, toggleBreakpoint } = useAppStore();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setCode(value);
      }
    },
    [setCode]
  );

  const handleEditorMount: OnMount = useCallback(
    (editor, monacoInstance) => {
      editorRef.current = editor;

      // Enable gutter margin for breakpoint markers
      editor.updateOptions({ glyphMargin: true });

      // Register gutter click handler for breakpoints
      editor.onMouseDown((e) => {
        if (
          e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
          e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
        ) {
          const line = e.target.position?.lineNumber;
          if (line !== undefined) {
            toggleBreakpoint(line);
          }
        }
      });
    },
    [toggleBreakpoint]
  );

  // Update decorations whenever breakpoints or current debug line changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    // Breakpoint decorations (red circles in gutter)
    for (const bp of debuggerState.breakpoints.values()) {
      if (bp.enabled) {
        newDecorations.push({
          range: new monaco.Range(bp.line, 1, bp.line, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: 'breakpoint-glyph',
            glyphMarginHoverMessage: { value: `Breakpoint at line ${bp.line}` }
          }
        });
      }
    }

    // Current debug line decoration (yellow highlight)
    if (debuggerState.currentLine > 0) {
      newDecorations.push({
        range: new monaco.Range(debuggerState.currentLine, 1, debuggerState.currentLine, 1),
        options: {
          isWholeLine: true,
          className: 'current-debug-line',
          glyphMarginClassName: 'current-debug-glyph',
          overviewRuler: {
            color: '#ffcc00',
            position: monaco.editor.OverviewRulerLane.Left
          }
        }
      });

      // Scroll to current line
      editor.revealLineInCenterIfOutsideViewport(debuggerState.currentLine);
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [debuggerState.breakpoints, debuggerState.currentLine]);

  return (
    <div className="editor-container h-full">
      <style>{`
        .breakpoint-glyph {
          background: #e51400;
          border-radius: 50%;
          width: 10px !important;
          height: 10px !important;
          margin-top: 4px;
          margin-left: 3px;
          cursor: pointer;
        }
        .current-debug-line {
          background: rgba(255, 204, 0, 0.2);
          border-left: 2px solid #ffcc00;
        }
        .current-debug-glyph {
          background: #ffcc00;
          width: 10px !important;
          height: 10px !important;
          margin-top: 4px;
          margin-left: 3px;
          clip-path: polygon(0 0, 100% 50%, 0 100%);
        }
      `}</style>
      <MonacoEditor
        height="100%"
        language="ruby"
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
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
          formatOnPaste: true,
          glyphMargin: true
        }}
      />
    </div>
  );
};

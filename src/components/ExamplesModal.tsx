import React, { useState } from 'react';
import { X, BookOpen, ChevronRight } from 'lucide-react';
import { getCodeSnippets, CodeSnippet } from '@/utils/codeFormatter';

interface ExamplesModalProps {
  onClose: () => void;
  onLoad: (code: string) => void;
}

export const ExamplesModal: React.FC<ExamplesModalProps> = ({ onClose, onLoad }) => {
  const snippets = getCodeSnippets();
  const categories = Array.from(new Set(snippets.map((s) => s.category)));
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = snippets.filter((s) => s.category === selectedCategory);

  const handleLoad = (snippet: CodeSnippet) => {
    onLoad(snippet.code);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">サンプルコード</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-96">
          {/* Category sidebar */}
          <div className="w-36 border-r border-slate-700 overflow-y-auto shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Snippet list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((snippet) => (
              <button
                key={snippet.name}
                onClick={() => handleLoad(snippet)}
                onMouseEnter={() => setHovered(snippet.name)}
                onMouseLeave={() => setHovered(null)}
                className="w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800 transition-colors group flex items-start justify-between gap-2"
              >
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {snippet.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{snippet.description}</div>
                  {hovered === snippet.name && (
                    <pre className="mt-2 text-xs text-slate-300 bg-slate-950 rounded p-2 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                      {snippet.code}
                    </pre>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-700 text-xs text-slate-500">
          クリックするとエディタに読み込まれます
        </div>
      </div>
    </div>
  );
};

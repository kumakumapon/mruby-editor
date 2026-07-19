# mruby WASM ビジュアルエディタ + デバッガ

## GitHub Pages デプロイプラン

-----

## 📋 プロジェクト概要

**目標**: mruby をブラウザで実行・デバッグできる WebAssembly ベースのエディタを GitHub Pages でホストする

**主な特徴**:

- ✅ サーバー不要（静的ホスティング）
- ✅ オフライン実行可能
- ✅ リアルタイムコード実行
- ✅ ビジュアルデバッガ付き

-----

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────┐
│        GitHub Pages (Static Hosting)    │
├─────────────────────────────────────────┤
│  HTML + CSS + JavaScript                │
│  ┌──────────────────────────────────┐   │
│  │  React / Vue.js フロントエンド    │   │
│  │  ┌────────────────────────────┐   │   │
│  │  │ Monaco/CodeMirror エディタ  │   │   │
│  │  ├────────────────────────────┤   │   │
│  │  │ デバッガUI                  │   │   │
│  │  │ (変数ウォッチ等)            │   │   │
│  │  └────────────────────────────┘   │   │
│  └──────────────────────────────────┘   │
│                 ↓↑                       │
│  ┌──────────────────────────────────┐   │
│  │  mruby WASM モジュール            │   │
│  │  (Emscripten コンパイル)          │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

-----

## 🛠️ 実装フェーズ

### **Phase 1: 準備 & mruby WASM ビルド** (1-2週間)

#### 1.1 開発環境構築

```bash
# 必要ツール
- Emscripten SDK
- Node.js + npm
- mruby ソースコード
- Git
```

**タスク**:

- [ ] Emscripten のインストール (`emsdk`)
- [ ] mruby リポジトリクローン
- [ ] ビルド設定ファイル作成 (`build_config.rb` for WASM)

#### 1.2 mruby → WASM コンパイル

**目標**: `mruby.wasm` + `mruby.js` を生成

```bash
# Emscripten 設定例
emconfigure ./configure --host asmjs-unknown-emscripten
emmake make
```

**成果物**:

- `mruby.wasm` (WebAssembly バイナリ)
- `mruby.js` (JavaScript グルー)
- `mruby.wasm.map` (デバッグマップ)

**参考資料**:

- https://github.com/mruby/mruby/wiki
- Emscripten 公式: https://emscripten.org/docs/

-----

### **Phase 2: フロントエンド基盤** (2-3週間)

#### 2.1 プロジェクト初期化

```bash
npm create vite@latest mruby-wasm-editor -- --template react-ts
cd mruby-wasm-editor
npm install
```

#### 2.2 主要パッケージ

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "@monaco-editor/react": "^4.x",
    "zustand": "^4.x",
    "tailwindcss": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "tailwindcss": "^3.x",
    "postcss": "^8.x"
  }
}
```

#### 2.3 フォルダ構成

```
mruby-wasm-editor/
├── public/
│   ├── mruby.wasm          # コンパイル済みバイナリ
│   ├── mruby.js
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Editor.tsx       # コードエディタ
│   │   ├── Debugger.tsx     # デバッガUI
│   │   ├── Console.tsx      # 出力パネル
│   │   └── Toolbar.tsx
│   ├── hooks/
│   │   ├── useMruby.ts      # WASM ランタイム
│   │   └── useDebugger.ts   # デバッガロジック
│   ├── store/
│   │   └── appStore.ts      # 状態管理 (Zustand)
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

#### 2.4 主要コンポーネント設計

**Editor.tsx**:

```typescript
export const Editor: React.FC = () => {
  const [code, setCode] = useCodeStore();
  
  return (
    <MonacoEditor
      language="ruby"
      value={code}
      onChange={setCode}
      theme="vs-dark"
      options={{ fontSize: 14, minimap: { enabled: false } }}
    />
  );
};
```

**Debugger.tsx**:

```typescript
interface DebuggerState {
  breakpoints: number[];
  currentLine: number;
  variables: Record<string, any>;
  callStack: StackFrame[];
}

export const Debugger: React.FC = () => {
  const { breakpoints, variables, callStack } = useDebuggerStore();
  
  return (
    <div className="debugger-panel">
      <BreakpointsPanel />
      <VariablesPanel variables={variables} />
      <CallStackPanel stack={callStack} />
    </div>
  );
};
```

-----

### **Phase 3: mruby WASM インテグレーション** (2-3週間)

#### 3.1 WASM ランタイムラッパー

**hooks/useMruby.ts**:

```typescript
import { useEffect, useRef } from 'react';

interface MrubyVM {
  run(code: string): string;
  eval(expr: string): any;
  cleanup(): void;
}

export const useMruby = (): MrubyVM => {
  const vmRef = useRef<MrubyVM | null>(null);

  useEffect(() => {
    const initMruby = async () => {
      // WASM モジュール読み込み
      const response = await fetch('/mruby.js');
      const script = await response.text();
      
      // グローバルで実行
      eval(script);
      
      // mruby VM インスタンス化
      vmRef.current = {
        run: (code: string) => {
          try {
            return window.mruby.mrb_exec(code);
          } catch (e) {
            return `Error: ${e.message}`;
          }
        },
        eval: (expr: string) => {
          return window.mruby.mrb_eval(expr);
        },
        cleanup: () => {
          window.mruby.mrb_close();
        }
      };
    };

    initMruby();
    return () => vmRef.current?.cleanup();
  }, []);

  return vmRef.current!;
};
```

#### 3.2 実行エンジン

**store/appStore.ts** (Zustand):

```typescript
import { create } from 'zustand';

interface AppStore {
  code: string;
  output: string;
  isRunning: boolean;
  setCode: (code: string) => void;
  executeCode: (code: string) => Promise<void>;
}

export const useAppStore = create<AppStore>((set) => ({
  code: '# mruby コード',
  output: '',
  isRunning: false,

  setCode: (code) => set({ code }),

  executeCode: async (code) => {
    set({ isRunning: true });
    try {
      const result = await mruby.run(code);
      set({ output: result });
    } catch (error) {
      set({ output: `Error: ${error.message}` });
    } finally {
      set({ isRunning: false });
    }
  }
}));
```

-----

### **Phase 4: デバッガ機能** (3-4週間)

#### 4.1 ブレークポイント管理

**hooks/useDebugger.ts**:

```typescript
interface Breakpoint {
  line: number;
  condition?: string;
  enabled: boolean;
}

interface DebuggerState {
  breakpoints: Map<number, Breakpoint>;
  isPaused: boolean;
  currentLine: number;
  callStack: StackFrame[];
  variables: Map<string, any>;
}

export const useDebugger = () => {
  const [state, setState] = useState<DebuggerState>({
    breakpoints: new Map(),
    isPaused: false,
    currentLine: -1,
    callStack: [],
    variables: new Map()
  });

  const toggleBreakpoint = (line: number) => {
    setState(prev => {
      const bp = prev.breakpoints.get(line);
      const newBp = new Map(prev.breakpoints);
      
      if (bp) {
        newBp.delete(line);
      } else {
        newBp.set(line, { line, enabled: true });
      }
      
      return { ...prev, breakpoints: newBp };
    });
  };

  const stepOver = () => {
    // WASM デバッグAPI呼び出し
    const nextLine = mruby.debug_step_over();
    setState(prev => ({ ...prev, currentLine: nextLine }));
  };

  const stepInto = () => {
    const nextLine = mruby.debug_step_into();
    setState(prev => ({ ...prev, currentLine: nextLine }));
  };

  return {
    ...state,
    toggleBreakpoint,
    stepOver,
    stepInto
  };
};
```

#### 4.2 デバッガUI

**components/Debugger.tsx**:

```typescript
export const Debugger: React.FC = () => {
  const {
    breakpoints,
    currentLine,
    variables,
    callStack,
    toggleBreakpoint,
    stepOver,
    stepInto
  } = useDebugger();

  return (
    <div className="debugger">
      {/* ツールバー */}
      <div className="toolbar">
        <button onClick={() => stepInto()}>Step Into (F10)</button>
        <button onClick={() => stepOver()}>Step Over (F11)</button>
        <button>Continue (F5)</button>
      </div>

      {/* ブレークポイントリスト */}
      <section className="breakpoints">
        <h3>ブレークポイント</h3>
        {Array.from(breakpoints.values()).map(bp => (
          <div key={bp.line} className="breakpoint-item">
            Line {bp.line}
            <button onClick={() => toggleBreakpoint(bp.line)}>×</button>
          </div>
        ))}
      </section>

      {/* 変数ウォッチ */}
      <section className="variables">
        <h3>変数</h3>
        {Array.from(variables.entries()).map(([name, value]) => (
          <div key={name} className="var-item">
            <span className="var-name">{name}</span>
            <span className="var-value">{JSON.stringify(value)}</span>
          </div>
        ))}
      </section>

      {/* コールスタック */}
      <section className="callstack">
        <h3>スタック</h3>
        {callStack.map((frame, i) => (
          <div key={i} className="frame">
            {frame.function} @ line {frame.line}
          </div>
        ))}
      </section>
    </div>
  );
};
```

-----

### **Phase 5: UI/UX & ビジュアル設計** (2週間)

#### 5.1 レイアウト設計

**App.tsx** (レイアウト):

```
┌─────────────────────────────────────────┐
│          Toolbar (Run, Debug)           │
├────────────────┬───────────────────────┤
│                │                       │
│  Code Editor   │    Output Console     │
│                │                       │
├────────────────┴───────────────────────┤
│  Debugger Panel (Variables, Stack)     │
└─────────────────────────────────────────┘
```

#### 5.2 スタイリング (Tailwind CSS)

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --editor-bg: #1e1e1e;
  --editor-fg: #e0e0e0;
  --accent: #0ea5e9;
  --error: #ef4444;
}

.debugger-button {
  @apply px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded;
}

.breakpoint-marker {
  @apply absolute left-0 w-6 h-6 bg-red-500 rounded-full cursor-pointer;
}
```

-----

### **Phase 6: GitHub Pages デプロイ** (1-2日)

#### 6.1 リポジトリ設定

```bash
# GitHub でリポジトリ作成: username/mruby-wasm-editor

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/mruby-wasm-editor.git
git push -u origin main
```

#### 6.2 GitHub Pages 設定

**Settings > Pages**:

- Source: Deploy from a branch
- Branch: `main` / root
- Save

#### 6.3 Vite デプロイ設定

**vite.config.ts**:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/mruby-wasm-editor/',  // ← リポジトリ名
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

#### 6.4 デプロイスクリプト

**package.json**:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && git add dist && git commit -m 'Deploy' && git push"
  }
}
```

#### 6.5 自動デプロイ (GitHub Actions)

**.github/workflows/deploy.yml**:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

-----

## 📊 実装スケジュール概要

|フェーズ   |内容               |期間         |成果物           |
|-------|-----------------|-----------|--------------|
|Phase 1|mruby WASM ビルド   |1-2週間      |`mruby.wasm`  |
|Phase 2|フロントエンド基盤        |2-3週間      |React コンポーネント群|
|Phase 3|WASM インテグレーション   |2-3週間      |実行エンジン        |
|Phase 4|デバッガ機能           |3-4週間      |デバッガUI + ロジック |
|Phase 5|UI/UX & ポーリッシュ   |2週間        |ビジュアル完成       |
|Phase 6|GitHub Pages デプロイ|1-2日       |本番公開          |
|**合計** |                 |**11-16週間**|**完全な Webアプリ**|

-----

## 🎯 MVP (最小実行可能製品) - 短期版

最初の 4-6週間で リリース可能な最小版:

1. **コード実行のみ** (デバッガなし)
1. **簡単な出力表示**
1. **エラー表示**
1. **GitHub Pages ホスティング**

```typescript
// MVP: 単純な実行エンジン
const runCode = async (code: string) => {
  const result = await mruby.run(code);
  setOutput(result);
};
```

-----

## 🚀 デプロイ後の展開

### **Phase 7: オプション機能** (以降)

- [ ] コード例・テンプレート
- [ ] 構文ハイライト改善
- [ ] ファイル保存/読み込み
- [ ] コラボレーション機能 (ShareDB等)
- [ ] パフォーマンスプロファイラ
- [ ] ホットリロード機能
- [ ] Playground シェア機能

-----

## 📚 参考リソース

### mruby/WASM

- https://github.com/mruby/mruby
- https://emscripten.org/docs/
- https://github.com/ruby-wasm/ruby.wasm (参考実装)

### フロントエンドツール

- React: https://react.dev
- Vite: https://vitejs.dev
- Monaco Editor: https://microsoft.github.io/monaco-editor/
- Tailwind CSS: https://tailwindcss.com

### デプロイ

- GitHub Pages: https://pages.github.com
- GitHub Actions: https://docs.github.com/actions

-----

## 💡 Tips & 注意点

### WASM コンパイル時

- **ファイルサイズ**: `mruby.wasm` は 3-8MB (圧縮で 1-2MB)
- **初期ロード**: 最初のロードで数秒必要な場合あり
- **メモリ**: 複雑な処理は 512MB WASM メモリ制限に注意

### デバッガ実装

- mruby にはビルトイン デバッグAPI が限定的
  → カスタム割り込み機構の実装が必要
- **代替案**: print デバッグ + 実行エラー表示で MVP版対応

### GitHub Pages 制限

- 静的ホスティングのみ (POST API 呼び出し不可)
- リポジトリサイズ上限 (mruby.wasm がある程度大きい場合は git-lfs 検討)

-----

## ✅ チェックリスト

- [ ] Emscripten インストール & WASM ビルド成功
- [ ] React + Vite プロジェクト初期化
- [ ] Monaco Editor 統合
- [ ] mruby WASM ランタイム統合
- [ ] コード実行機能実装
- [ ] デバッガUI スケルトン
- [ ] GitHub Pages リポジトリ設定
- [ ] GitHub Actions デプロイ自動化
- [ ] URL へアクセス可能か確認
- [ ] ブラウザテスト (Chrome, Firefox, Safari)
- [ ] パフォーマンス最適化
- [ ] ドキュメント作成

-----

**作成日**: 2026年3月27日
**version**: 1.0

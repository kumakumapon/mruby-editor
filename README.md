# mruby WASM Editor

A browser-based mruby code editor and debugger hosted on GitHub Pages.

🔗 **Live Demo**: [https://sj55576.github.io/mruby-editor/](https://sj55576.github.io/mruby-editor/)

## Features

- ✅ Monaco Editor with Ruby syntax highlighting
- ✅ JavaScript-based mruby interpreter
- ✅ Real-time code execution in browser
- ✅ Console output panel
- ✅ Visual debugger panel (breakpoints, variables, call stack)
- ✅ No server required (fully static)
- ✅ Offline capable

## Supported mruby Features

- `puts`, `print`, `p` output functions
- Variables and assignment
- Basic arithmetic: `+`, `-`, `*`, `/`, `%`, `**`
- String interpolation: `"Hello #{name}"`
- Arrays with methods: `each`, `map`, `select`, `sum`, etc.
- Hashes with symbol and string keys
- Conditionals: `if/elsif/else/end`, `unless`
- Loops: `while`, `times`, `upto`, `downto`, `each`
- Method definitions: `def/end`
- Basic error handling: `begin/rescue/end`, `raise`

## Usage

1. Write mruby code in the editor
2. Click **Run** to execute
3. View output in the Console panel
4. Use the Debugger panel to manage breakpoints

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm test         # Run tests
```

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Monaco Editor
- Zustand (state management)
- Tailwind CSS
- Vitest (testing)
- GitHub Actions (CI/CD)
- GitHub Pages (hosting)

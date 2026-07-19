# Ruby Subset Editor

> ⚠️ **非公式プロジェクト / Unofficial Project**
> このリポジトリは非公式のプロジェクトであり、mruby 公式プロジェクト・開発チームとは一切関係ありません。
> This repository is an unofficial project and is **not affiliated with, endorsed by, or associated with** the official mruby project or its development team.
> 公式 mruby リポジトリ / Official mruby repository: <https://github.com/mruby/mruby>

A browser-based Ruby subset editor and step debugger hosted on GitHub Pages.

This application uses an independent interpreter written in TypeScript. It does **not**
use WebAssembly, the official mruby runtime, or the official Ruby runtime, and it is
not intended to provide full Ruby or mruby compatibility.

🔗 **Live Demo**: [https://sj55576.github.io/mruby-editor/](https://sj55576.github.io/mruby-editor/)

## Features

- ✅ Monaco Editor with Ruby syntax highlighting and breakpoint gutter
- ✅ Independent TypeScript-based Ruby subset interpreter (runs entirely in-browser)
- ✅ Real-time code execution with execution time display
- ✅ Console output panel with stdin input support (`gets` / `readline`)
- ✅ Step debugger: breakpoints, step into, step over, continue
- ✅ Variable inspector with inline editing
- ✅ Call stack display
- ✅ Mobile-responsive layout
- ✅ No server required (fully static)
- ✅ Offline capable

## Supported Ruby Subset Features

### Output
- `puts`, `print`, `p`

### Variables & Assignment
- Local variables, instance variables (`@var`), constants (`MODULE::CONST`)
- Multi-value assignment: `a, b = 1, 2`
- Compound assignment: `+=`, `-=`, `*=`, `/=`, `%=`

### Types & Literals
- Integers, floats, strings, booleans (`true` / `false`), `nil`
- String interpolation: `"Hello, #{name}!"`
- Arrays: `[1, 2, 3]`
- Hashes: `{ key: "value" }` (symbol and string keys)
- Ranges: `1..10`, `1...10`

### Arithmetic & Operators
- `+`, `-`, `*`, `/`, `%`, `**`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`, `<=>`
- Logical: `&&`, `||`, `!`, `and`, `or`, `not`

### Conditionals
- `if / elsif / else / end`, `unless`
- Inline modifiers: `puts x if condition`, `puts x unless condition`
- `case / when / else / end`

### Loops & Iterators
- `while`, `loop do...end`, `for var in iterable`
- `N.times`, `N.upto(M)`, `N.downto(M)`
- `Array#each`, `Array#each_with_index`, `Array#each_with_object`
- `break`, `next`, `return`; `break if`, `break unless`, `next if`, `next unless`

### Methods
- `def / end` with positional and default parameters
- `return`; `super`

### Classes
- `class / end` with inheritance (`class B < A`)
- Instance variables, `initialize`
- `attr_accessor`, `attr_reader`, `attr_writer`
- Class methods (`def self.method`)
- `instance_variable_get`, `instance_variable_set`

### Error Handling
- `begin / rescue / ensure / end`
- `raise`

### String Methods
`length` / `size`, `upcase`, `downcase`, `capitalize`, `swapcase`,
`reverse`, `strip`, `lstrip`, `rstrip`, `chomp`, `chop`,
`include?`, `start_with?`, `end_with?`, `empty?`,
`split`, `gsub`, `sub`, `tr`, `delete`, `squeeze`, `scan`, `match`, `match?`,
`chars`, `bytes`, `lines`, `center`, `ljust`, `rjust`,
`to_i`, `to_f`, `to_s`, `ord`, `hex`, `oct`,
`succ` / `next`, `slice` / `[]`, `insert`, `replace`, `count`, `inspect`, `*`, `+`

### Array Methods
`length` / `size`, `empty?`, `first`, `last`, `push` / `append` / `<<`, `pop`, `shift`, `unshift`,
`reverse`, `sort`, `sort!`, `uniq`, `flatten`, `flatten!`, `compact`, `tally`,
`sum`, `min`, `max`, `minmax`, `include?`, `join`, `zip`, `take`, `drop`,
`count`, `index` / `find_index`,
`each`, `map` / `collect`, `select` / `filter`, `reject`, `find` / `detect`,
`any?`, `all?`, `none?`, `reduce` / `inject`, `each_with_index`

### Hash Methods
`keys`, `values`, `size` / `length`, `empty?`,
`has_key?` / `key?` / `include?`, `has_value?` / `value?`,
`merge`, `delete`, `select`, `reject`, `each`, `map`,
`any?`, `all?`, `none?`, `count`, `to_a`

### Numeric Methods
`abs`, `even?`, `odd?`, `zero?`, `positive?`, `negative?`,
`round`, `floor`, `ceil`, `truncate`, `divmod`, `div`, `modulo`, `pow`,
`gcd`, `lcm`, `digits`, `succ` / `next`, `pred`,
`between?`, `clamp`, `chr`, `sqrt`, `finite?`, `infinite?`, `nan?`,
`to_s(base)`, `to_i`, `to_f`

### Type Conversion
`Integer()`, `Float()`, `String()`, `Array()`

### Math Module
`Math.sqrt`, `Math.cbrt`, `Math.exp`, `Math.log`, `Math.log2`, `Math.log10`,
`Math.sin`, `Math.cos`, `Math.tan`, `Math.atan2`,
`Math.pow`, `Math.hypot`, `Math::PI`, `Math::E`

### Input
- `gets`, `readline` — pre-type lines in the Console stdin input before running

### Miscellaneous
- `rand`, `__method__`, `block_given?`
- `sprintf` / `format` / `%` string formatting

## Usage

1. Write supported Ruby subset code in the editor
2. Click **Run** to execute; output appears in the Console panel
3. (Optional) Pre-type stdin lines in the Console before running code that calls `gets`
4. Click **Debug** to start a step-debugging session:
   - Click line numbers in the gutter to toggle breakpoints
   - Use **Step In**, **Step Over**, and **Continue** in the Debugger panel
   - Inspect and edit variables in the Variables section
5. Click **Clear** to reset the console output

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
- lucide-react (icons)
- Vitest (testing)
- GitHub Actions (CI/CD)
- GitHub Pages (hosting)

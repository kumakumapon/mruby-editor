# Repository Review Improvements (2026-07-20)

Branch: claude/repository-review-improvements-4e71v4

## Plan
- [x] Add `until` loop support (block form + inline modifier)
- [x] Add ternary operator `cond ? a : b`
- [x] Add `yield` / `block_given?` support for top-level user-defined methods
- [x] Update README feature list
- [x] Full test suite green (286 passing; baseline was 266)

## Review
- `until`: `executeUntil` mirrors `executeWhile` (iteration guard, break/next); `until`
  added to every nested-block depth-tracking regex; postfix `stmt until cond` loop
  modifier added via `splitPostfixModifier`.
- Ternary: `splitTernary` scans at top level only (string/bracket aware), skips
  method-suffix `?` (`even?`) and `:symbol` literals; lazy branch evaluation;
  right-associative nesting.
- `yield`: interpreter keeps a `blockStack`; `executeMethod` accepts an optional block.
  Receiverless method calls with `do...end` or `{ ... }` blocks dispatch to user-defined
  methods. Blocks close over their definition environment, so `yield` inside a method
  sees the caller's variables. `block_given?` reads the block stack (was a stub always
  returning false). `yield` without a block raises LocalJumpError. `yield expr` binds
  looser than binary operators (`yield n * 2` == `yield(n * 2)`).
  Scope note: blocks are supported on top-level methods; class instance methods do not
  yet receive blocks.
- Tests: 20 new (12 until/ternary, 8 yield). 286/286 passing; `tsc --noEmit` clean.

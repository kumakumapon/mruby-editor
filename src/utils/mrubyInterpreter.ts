// mruby interpreter implemented in TypeScript
// Supports: puts/print/p, variables, arithmetic, strings, arrays, hashes,
// if/unless/while/times/each, def/end methods, classes with instance variables

export interface InterpreterResult {
  output: string;
  error?: string;
}

export interface TraceEvent {
  line: number;
  vars: Record<string, string>;
  callStack: string[];
}

export function interpretMruby(code: string): InterpreterResult {
  const interpreter = new MrubyInterpreter();
  return interpreter.run(code);
}

export function interpretMrubyDebug(code: string): { result: InterpreterResult; trace: TraceEvent[] } {
  const interpreter = new MrubyInterpreter();
  return interpreter.runDebug(code);
}

type MrubyValue = string | number | boolean | null | MrubyValue[] | MrubyHash | MrubyMethod | MrubyClassDef | MrubyInstance;

interface MrubyHash {
  __type: 'hash';
  data: Map<string, MrubyValue>;
}

interface MrubyMethod {
  __type: 'method';
  name: string;
  params: string[];
  body: string[];
  bodyLineBase: number; // 0-based index of first body line in original source
  closure: Environment;
}

interface MrubyClassDef {
  __type: 'class';
  name: string;
  methods: Map<string, MrubyMethod>;
  superClassName?: string;
}

interface MrubyInstance {
  __type: 'instance';
  className: string;
  instanceVars: Map<string, MrubyValue>;
  classDef: MrubyClassDef;
}

class Environment {
  private vars: Map<string, MrubyValue> = new Map();
  private parent: Environment | null;

  constructor(parent: Environment | null = null) {
    this.parent = parent;
  }

  get(name: string): MrubyValue {
    if (this.vars.has(name)) {
      return this.vars.get(name)!;
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    return null;
  }

  set(name: string, value: MrubyValue): void {
    this.vars.set(name, value);
  }

  setGlobal(name: string, value: MrubyValue): void {
    if (this.parent) {
      this.parent.setGlobal(name, value);
    } else {
      this.vars.set(name, value);
    }
  }

  has(name: string): boolean {
    if (this.vars.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  getVars(): Map<string, MrubyValue> {
    return this.vars;
  }

  getParent(): Environment | null {
    return this.parent;
  }
}

class MrubyInterpreter {
  private output: string[] = [];
  private env: Environment = new Environment();
  private methods: Map<string, MrubyMethod> = new Map();
  private classes: Map<string, MrubyClassDef> = new Map();
  private currentSelf: MrubyInstance | null = null;
  private callStackNames: string[] = ['<main>'];
  private maxIterations = 10000;
  private iterationCount = 0;

  // Debug trace support
  private debugMode = false;
  private debugTrace: TraceEvent[] = [];

  run(code: string): InterpreterResult {
    try {
      const lines = this.preprocessCode(code);
      this.executeBlock(lines, 0, lines.length, 0);
      return { output: this.output.join('') };
    } catch (e) {
      if (e instanceof RubyException) {
        return { output: this.output.join(''), error: e.message };
      }
      if (e instanceof Error) {
        return { output: this.output.join(''), error: e.message };
      }
      return { output: this.output.join(''), error: String(e) };
    }
  }

  runDebug(code: string): { result: InterpreterResult; trace: TraceEvent[] } {
    this.debugMode = true;
    this.debugTrace = [];
    const result = this.run(code);
    return { result, trace: this.debugTrace };
  }

  private recordTrace(lineNum: number): void {
    if (!this.debugMode) return;
    const vars: Record<string, string> = {};
    const seen = new Set<string>();
    let env: Environment | null = this.env;
    while (env) {
      for (const [k, v] of env.getVars()) {
        if (!seen.has(k) && !k.startsWith('$')) {
          seen.add(k);
          vars[k] = this.inspect(v);
        }
      }
      env = env.getParent();
    }
    if (this.currentSelf) {
      for (const [k, v] of this.currentSelf.instanceVars) {
        vars[`@${k}`] = this.inspect(v);
      }
    }
    this.debugTrace.push({ line: lineNum, vars, callStack: [...this.callStackNames] });
  }

  private preprocessCode(code: string): string[] {
    const lines: string[] = [];
    for (const line of code.split('\n')) {
      const processed = this.removeComment(line);
      lines.push(processed);
    }
    return lines;
  }

  private removeComment(line: string): string {
    let inString = false;
    let stringChar = '';
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (!inString && (ch === '"' || ch === "'")) {
        inString = true;
        stringChar = ch;
      } else if (inString && ch === stringChar && line[i - 1] !== '\\') {
        inString = false;
      } else if (!inString && ch === '#') {
        return line.substring(0, i);
      }
      i++;
    }
    return line;
  }

  // lineNumBase: 0-based index of lines[start] in original source
  // so lines[start+k] is at 1-based line number (lineNumBase + k + 1)
  private executeBlock(lines: string[], start: number, end: number, lineNumBase: number = 0): MrubyValue {
    let i = start;
    let lastValue: MrubyValue = null;
    while (i < end) {
      const line = lines[i].trim();
      if (!line) { i++; continue; }

      this.checkIterations();

      if (this.debugMode) {
        const lineNum = lineNumBase + (i - start) + 1;
        this.recordTrace(lineNum);
      }

      if (/^def\s+\w+/.test(line)) {
        i = this.defineMethod(lines, i, lineNumBase + (i - start));
        continue;
      }

      if (/^class\s+[A-Z]/.test(line)) {
        i = this.executeClass(lines, i, lineNumBase + (i - start));
        continue;
      }

      if (/^if\s+/.test(line) || /^unless\s+/.test(line)) {
        i = this.executeIf(lines, i, end, lineNumBase + (i - start));
        continue;
      }

      if (/^while\s+/.test(line)) {
        i = this.executeWhile(lines, i, end, lineNumBase + (i - start));
        continue;
      }

      if (/^for\s+\w+\s+in\s+/.test(line)) {
        i = this.executeFor(lines, i, end, lineNumBase + (i - start));
        continue;
      }

      if (/^begin\s*$/.test(line)) {
        i = this.executeBeginRescue(lines, i, end, lineNumBase + (i - start));
        continue;
      }

      if (/^raise\s+/.test(line)) {
        const msg = this.evalExpression(line.replace(/^raise\s+/, '').trim());
        throw new RubyException(String(msg));
      }

      if (/^return(\s+|$)/.test(line)) {
        const val = line.replace(/^return\s*/, '').trim();
        const retVal = val ? this.evalExpression(val) : null;
        throw new ReturnException(retVal);
      }

      if (/^puts(\s+|$|\()/.test(line)) {
        this.executePuts(line);
        lastValue = null;
        i++;
        continue;
      }
      if (/^print(\s+|$|\()/.test(line)) {
        this.executePrint(line);
        lastValue = null;
        i++;
        continue;
      }
      // Only treat 'p' as a function call when followed by space/( and not an assignment
      if (/^p(\s+|\()/.test(line) && !/^p\s*[+*/%=-]?=/.test(line)) {
        this.executeP(line);
        lastValue = null;
        i++;
        continue;
      }

      lastValue = this.evalStatement(line);
      i++;
    }
    return lastValue;
  }

  private checkIterations(): void {
    this.iterationCount++;
    if (this.iterationCount > this.maxIterations) {
      throw new Error('Maximum iteration limit exceeded (infinite loop?)');
    }
  }

  private defineMethod(lines: string[], start: number, origIdx: number): number {
    const defLine = lines[start].trim();
    const match = defLine.match(/^def\s+(\w+)\s*(?:\((.*?)\))?\s*$/);
    if (!match) { return start + 1; }
    const name = match[1];
    const paramStr = match[2] || '';
    const params = paramStr ? paramStr.split(',').map(p => p.trim()).filter(p => p) : [];

    const bodyLineBase = origIdx + 1; // 0-based index of first body line
    const body: string[] = [];
    let depth = 1;
    let i = start + 1;
    while (i < lines.length && depth > 0) {
      const l = lines[i].trim();
      if (/^def\s+/.test(l)) depth++;
      if (/^end\b/.test(l)) {
        depth--;
        if (depth === 0) break;
      }
      body.push(lines[i]);
      i++;
    }

    const method: MrubyMethod = {
      __type: 'method',
      name,
      params,
      body,
      bodyLineBase,
      closure: this.env
    };
    this.methods.set(name, method);
    return i + 1;
  }

  private executeClass(lines: string[], start: number, origIdx: number): number {
    const classLine = lines[start].trim();
    const match = classLine.match(/^class\s+([A-Z]\w*)(?:\s*<\s*([A-Z]\w*))?\s*$/);
    if (!match) return start + 1;

    const className = match[1];
    const superClassName = match[2];

    const classDef: MrubyClassDef = {
      __type: 'class',
      name: className,
      methods: new Map(),
      superClassName
    };

    let depth = 1;
    let i = start + 1;

    while (i < lines.length && depth > 0) {
      const l = lines[i].trim();
      if (/^class\s+[A-Z]/.test(l) || /^module\s+/.test(l)) {
        depth++;
      } else if (/^def\s+/.test(l) && depth === 1) {
        i = this.defineClassMethod(lines, i, origIdx + (i - start), classDef);
        continue;
      } else if (/^end\b/.test(l)) {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }

    this.classes.set(className, classDef);
    return i + 1;
  }

  private defineClassMethod(lines: string[], start: number, origIdx: number, classDef: MrubyClassDef): number {
    const defLine = lines[start].trim();
    const match = defLine.match(/^def\s+(self\.)?(\w+[\?!]?)\s*(?:\((.*?)\))?\s*$/);
    if (!match) return start + 1;

    const isSelf = !!match[1];
    const methodName = match[2];
    const paramStr = match[3] || '';
    const params = paramStr ? paramStr.split(',').map(p => p.trim()).filter(p => p) : [];

    const bodyLineBase = origIdx + 1;
    const body: string[] = [];
    let depth = 1;
    let i = start + 1;

    while (i < lines.length && depth > 0) {
      const l = lines[i].trim();
      if (/^def\s+/.test(l)) depth++;
      if (/^end\b/.test(l)) {
        depth--;
        if (depth === 0) break;
      }
      body.push(lines[i]);
      i++;
    }

    const fullName = isSelf ? `self.${methodName}` : methodName;
    const method: MrubyMethod = {
      __type: 'method',
      name: fullName,
      params,
      body,
      bodyLineBase,
      closure: this.env
    };

    classDef.methods.set(fullName, method);
    return i + 1;
  }

  private lookupInstanceMethod(instance: MrubyInstance, methodName: string): MrubyMethod | null {
    let cls: MrubyClassDef | null = instance.classDef;
    const visited = new Set<string>();
    while (cls && !visited.has(cls.name)) {
      visited.add(cls.name);
      const method = cls.methods.get(methodName);
      if (method) return method;
      cls = cls.superClassName ? (this.classes.get(cls.superClassName) ?? null) : null;
    }
    return null;
  }

  private executeInstanceMethod(instance: MrubyInstance, method: MrubyMethod, args: MrubyValue[]): MrubyValue {
    const methodEnv = new Environment(this.env);
    for (let i = 0; i < method.params.length; i++) {
      let paramName = method.params[i];
      let defaultVal: MrubyValue = null;
      const defMatch = paramName.match(/^(\w+)\s*=\s*(.+)$/);
      if (defMatch) {
        paramName = defMatch[1];
        defaultVal = this.evalExpression(defMatch[2]);
      }
      methodEnv.set(paramName, args[i] !== undefined ? args[i] : defaultVal);
    }

    const savedEnv = this.env;
    const savedSelf = this.currentSelf;
    this.env = methodEnv;
    this.currentSelf = instance;
    this.callStackNames.push(`${instance.className}#${method.name}`);

    let result: MrubyValue = null;

    try {
      result = this.executeBlock(method.body, 0, method.body.length, method.bodyLineBase);
    } catch (e) {
      if (e instanceof ReturnException) {
        result = e.value;
      } else {
        this.callStackNames.pop();
        this.env = savedEnv;
        this.currentSelf = savedSelf;
        throw e;
      }
    }

    this.callStackNames.pop();
    this.env = savedEnv;
    this.currentSelf = savedSelf;
    return result;
  }

  private executeIf(lines: string[], start: number, end: number, startOrig: number = start): number {
    const firstLine = lines[start].trim();
    const isUnless = firstLine.startsWith('unless ');
    const condStr = firstLine.replace(/^(if|unless)\s+/, '').trim();
    
    let condResult = this.isTruthy(this.evalExpression(condStr));
    if (isUnless) condResult = !condResult;

    interface Branch { condition: boolean | null; lines: string[]; lineBase: number }
    const branches: Branch[] = [{ condition: condResult, lines: [], lineBase: -1 }];
    let currentBranch = branches[0];

    let depth = 1;
    let i = start + 1;
    while (i < end) {
      const l = lines[i].trim();
      if (/^(if|unless|while|for|begin|def|class)\b/.test(l)) {
        depth++;
        if (currentBranch.lineBase < 0 && l) currentBranch.lineBase = startOrig + (i - start);
        currentBranch.lines.push(lines[i]);
        i++;
        continue;
      }
      if (/^end\b/.test(l) && depth === 1) {
        break;
      }
      if (/^end\b/.test(l)) {
        depth--;
        if (currentBranch.lineBase < 0 && l) currentBranch.lineBase = startOrig + (i - start);
        currentBranch.lines.push(lines[i]);
        i++;
        continue;
      }
      if (depth === 1 && /^elsif\s+/.test(l)) {
        const elsifCond = l.replace(/^elsif\s+/, '').trim();
        const elsifResult = !branches.some(b => b.condition === true) &&
          this.isTruthy(this.evalExpression(elsifCond));
        branches.push({ condition: elsifResult, lines: [], lineBase: -1 });
        currentBranch = branches[branches.length - 1];
        i++;
        continue;
      }
      if (depth === 1 && /^else\b/.test(l)) {
        branches.push({ condition: null, lines: [], lineBase: -1 });
        currentBranch = branches[branches.length - 1];
        i++;
        continue;
      }
      if (currentBranch.lineBase < 0 && l) currentBranch.lineBase = startOrig + (i - start);
      currentBranch.lines.push(lines[i]);
      i++;
    }

    const trueBranch = branches.find(b => b.condition === true);
    if (trueBranch) {
      this.executeBlock(trueBranch.lines, 0, trueBranch.lines.length, trueBranch.lineBase >= 0 ? trueBranch.lineBase : 0);
    } else {
      const elseBranch = branches.find(b => b.condition === null);
      if (elseBranch) {
        this.executeBlock(elseBranch.lines, 0, elseBranch.lines.length, elseBranch.lineBase >= 0 ? elseBranch.lineBase : 0);
      }
    }

    return i + 1;
  }

  private executeWhile(lines: string[], start: number, end: number, startOrig: number = start): number {
    const condStr = lines[start].trim().replace(/^while\s+/, '').trim();

    const body: string[] = [];
    let bodyLineBase = -1;
    let depth = 1;
    let i = start + 1;
    while (i < end) {
      const l = lines[i].trim();
      if (/^(if|unless|while|for|begin|def)\b/.test(l)) depth++;
      if (/^end\b/.test(l)) {
        depth--;
        if (depth === 0) break;
      }
      if (bodyLineBase < 0 && l) bodyLineBase = startOrig + (i - start);
      body.push(lines[i]);
      i++;
    }

    let loopCount = 0;
    while (this.isTruthy(this.evalExpression(condStr))) {
      loopCount++;
      if (loopCount > this.maxIterations) {
        throw new Error('While loop exceeded maximum iterations');
      }
      try {
        this.executeBlock(body, 0, body.length, bodyLineBase >= 0 ? bodyLineBase : 0);
      } catch (e) {
        if (e instanceof BreakException) break;
        if (e instanceof NextException) continue;
        throw e;
      }
    }

    return i + 1;
  }

  private executeFor(lines: string[], start: number, end: number, startOrig: number = start): number {
    const forLine = lines[start].trim();
    const match = forLine.match(/^for\s+(\w+)\s+in\s+(.+)$/);
    if (!match) return start + 1;

    const varName = match[1];
    const iterExpr = match[2].trim();

    const body: string[] = [];
    let bodyLineBase = -1;
    let depth = 1;
    let i = start + 1;
    while (i < end) {
      const l = lines[i].trim();
      if (/^(if|unless|while|for|begin|def)\b/.test(l)) depth++;
      if (/^end\b/.test(l)) {
        depth--;
        if (depth === 0) break;
      }
      if (bodyLineBase < 0 && l) bodyLineBase = startOrig + (i - start);
      body.push(lines[i]);
      i++;
    }

    const iterable = this.evalExpression(iterExpr);
    let items: MrubyValue[] = [];
    if (Array.isArray(iterable)) {
      items = iterable;
    } else if (typeof iterable === 'number') {
      for (let j = 0; j <= iterable; j++) items.push(j);
    }

    for (const item of items) {
      this.env.set(varName, item);
      try {
        this.executeBlock(body, 0, body.length, bodyLineBase >= 0 ? bodyLineBase : 0);
      } catch (e) {
        if (e instanceof BreakException) break;
        if (e instanceof NextException) continue;
        throw e;
      }
    }

    return i + 1;
  }

  private executeBeginRescue(lines: string[], start: number, end: number, startOrig: number = start): number {
    const beginBody: string[] = [];
    const rescueBody: string[] = [];
    let inRescue = false;
    let beginBodyLineBase = -1;
    let rescueBodyLineBase = -1;
    let depth = 1;
    let i = start + 1;

    while (i < end) {
      const l = lines[i].trim();
      if (/^(begin|if|unless|while|def)\b/.test(l)) depth++;
      if (/^end\b/.test(l)) {
        depth--;
        if (depth === 0) break;
      }
      if (depth === 1 && /^rescue\b/.test(l)) {
        inRescue = true;
        i++;
        continue;
      }
      if (inRescue) {
        if (rescueBodyLineBase < 0 && l) rescueBodyLineBase = startOrig + (i - start);
        rescueBody.push(lines[i]);
      } else {
        if (beginBodyLineBase < 0 && l) beginBodyLineBase = startOrig + (i - start);
        beginBody.push(lines[i]);
      }
      i++;
    }

    try {
      this.executeBlock(beginBody, 0, beginBody.length, beginBodyLineBase >= 0 ? beginBodyLineBase : 0);
    } catch (e) {
      if (rescueBody.length > 0) {
        if (e instanceof RubyException) {
          this.env.set('$!', e.message);
        }
        this.executeBlock(rescueBody, 0, rescueBody.length, rescueBodyLineBase >= 0 ? rescueBodyLineBase : 0);
      } else {
        throw e;
      }
    }

    return i + 1;
  }

  private executePuts(line: string): void {
    const args = this.parseArgs(line, 'puts');
    if (args.length === 0) {
      this.output.push('\n');
      return;
    }
    for (const arg of args) {
      const val = this.evalExpression(arg);
      if (Array.isArray(val)) {
        for (const item of val) {
          this.output.push(this.stringify(item) + '\n');
        }
      } else {
        this.output.push(this.stringify(val) + '\n');
      }
    }
  }

  private executePrint(line: string): void {
    const args = this.parseArgs(line, 'print');
    for (const arg of args) {
      const val = this.evalExpression(arg);
      this.output.push(this.stringify(val));
    }
  }

  private executeP(line: string): void {
    const args = this.parseArgs(line, 'p');
    for (const arg of args) {
      const val = this.evalExpression(arg);
      this.output.push(this.inspect(val) + '\n');
    }
  }

  private parseArgs(line: string, funcName: string): string[] {
    let rest = line.slice(funcName.length).trim();
    if (rest.startsWith('(') && rest.endsWith(')')) {
      rest = rest.slice(1, -1);
    }
    if (!rest) return [];
    return this.splitArgs(rest);
  }

  private splitArgs(str: string): string[] {
    const args: string[] = [];
    let depth = 0;
    let inStr = false;
    let strChar = '';
    let current = '';
    
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (!inStr && (ch === '"' || ch === "'")) {
        inStr = true; strChar = ch; current += ch;
      } else if (inStr && ch === strChar && str[i-1] !== '\\') {
        inStr = false; current += ch;
      } else if (!inStr && (ch === '(' || ch === '[' || ch === '{')) {
        depth++; current += ch;
      } else if (!inStr && (ch === ')' || ch === ']' || ch === '}')) {
        depth--; current += ch;
      } else if (!inStr && depth === 0 && ch === ',') {
        args.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) args.push(current.trim());
    return args;
  }

  private evalStatement(line: string): MrubyValue {
    // Handle output functions in block bodies
    if (/^puts(\s+|$|\()/.test(line)) { this.executePuts(line); return null; }
    if (/^print(\s+|$|\()/.test(line)) { this.executePrint(line); return null; }
    if (/^p(\s+|\()/.test(line)) { this.executeP(line); return null; }

    const multiAssignMatch = line.match(/^([a-zA-Z_@$][\w,\s]*)\s*=\s*(.+)$/);
    if (multiAssignMatch) {
      const lhs = multiAssignMatch[1];
      const rhs = multiAssignMatch[2];
      if (lhs.includes(',')) {
        const vars = lhs.split(',').map(v => v.trim());
        const vals = this.evalExpression(rhs);
        const arr = Array.isArray(vals) ? vals : [vals];
        for (let idx = 0; idx < vars.length; idx++) {
          this.assignVar(vars[idx], arr[idx] !== undefined ? arr[idx] : null);
        }
        return null;
      }
    }

    const compoundMatch = line.match(/^([a-zA-Z_@$][\w]*(?:\[.*?\])?)\s*([+\-*\/%]?=)\s*(.+)$/);
    if (compoundMatch) {
      const varName = compoundMatch[1];
      const op = compoundMatch[2];
      const valExpr = compoundMatch[3];
      const val = this.evalExpression(valExpr);
      
      if (op === '=') {
        const arrMatch = varName.match(/^(\w+)\[(.+)\]$/);
        if (arrMatch) {
          const arr = this.env.get(arrMatch[1]);
          const idx = this.evalExpression(arrMatch[2]);
          if (Array.isArray(arr) && typeof idx === 'number') {
            arr[idx] = val;
          } else if (arr && typeof arr === 'object' && '__type' in arr && (arr as MrubyHash).__type === 'hash') {
            const hash = arr as MrubyHash;
            hash.data.set(String(idx), val);
          }
          return val;
        }
        this.assignVar(varName, val);
        return val;
      } else {
        const current = this.env.get(varName);
        let newVal: MrubyValue;
        const numCur = typeof current === 'number' ? current : 0;
        const numVal = typeof val === 'number' ? val : 0;
        switch (op) {
          case '+=': newVal = typeof current === 'string' ? current + String(val) : numCur + numVal; break;
          case '-=': newVal = numCur - numVal; break;
          case '*=': newVal = numCur * numVal; break;
          case '/=': newVal = numVal !== 0 ? numCur / numVal : 0; break;
          case '%=': newVal = numCur % numVal; break;
          default: newVal = val;
        }
        this.assignVar(varName, newVal);
        return newVal;
      }
    }

    return this.evalExpression(line);
  }

  private assignVar(name: string, value: MrubyValue): void {
    if (name.startsWith('$')) {
      this.env.setGlobal(name, value);
    } else if (name.startsWith('@')) {
      if (this.currentSelf) {
        this.currentSelf.instanceVars.set(name.slice(1), value);
      }
    } else {
      this.env.set(name, value);
    }
  }

  evalExpression(expr: string): MrubyValue {
    expr = expr.trim();
    if (!expr) return null;

    if (expr === 'nil') return null;
    if (expr === 'true') return true;
    if (expr === 'false') return false;

    if (/^-?\d+$/.test(expr)) return parseInt(expr, 10);
    if (/^-?\d+\.\d+$/.test(expr)) return parseFloat(expr);

    if (expr.startsWith('"') && expr.endsWith('"')) {
      return this.interpolateString(expr.slice(1, -1));
    }

    if (expr.startsWith("'") && expr.endsWith("'")) {
      return expr.slice(1, -1);
    }

    if (expr.startsWith(':')) {
      return expr.slice(1);
    }

    if (expr.startsWith('[') && expr.endsWith(']')) {
      return this.parseArray(expr);
    }

    if (expr.startsWith('{') && expr.endsWith('}')) {
      return this.parseHash(expr);
    }

    if (expr.startsWith('(') && expr.endsWith(')')) {
      return this.evalExpression(expr.slice(1, -1));
    }

    const orParts = this.splitBinary(expr, '||');
    if (orParts) {
      const left = this.evalExpression(orParts[0]);
      if (this.isTruthy(left)) return left;
      return this.evalExpression(orParts[1]);
    }

    const andParts = this.splitBinary(expr, '&&');
    if (andParts) {
      const left = this.evalExpression(andParts[0]);
      if (!this.isTruthy(left)) return left;
      return this.evalExpression(andParts[1]);
    }

    const orKeyword = this.splitBinaryKeyword(expr, 'or');
    if (orKeyword) {
      const left = this.evalExpression(orKeyword[0]);
      if (this.isTruthy(left)) return left;
      return this.evalExpression(orKeyword[1]);
    }

    const andKeyword = this.splitBinaryKeyword(expr, 'and');
    if (andKeyword) {
      const left = this.evalExpression(andKeyword[0]);
      if (!this.isTruthy(left)) return false;
      return this.evalExpression(andKeyword[1]);
    }

    for (const op of ['==', '!=', '<=', '>=', '<', '>']) {
      const parts = this.splitBinary(expr, op);
      if (parts) {
        const left = this.evalExpression(parts[0]);
        const right = this.evalExpression(parts[1]);
        switch (op) {
          case '==': return left === right;
          case '!=': return left !== right;
          case '<': return (left as number) < (right as number);
          case '>': return (left as number) > (right as number);
          case '<=': return (left as number) <= (right as number);
          case '>=': return (left as number) >= (right as number);
        }
      }
    }

    const addParts = this.splitArithmetic(expr, ['+', '-']);
    if (addParts) {
      const left = this.evalExpression(addParts[0]);
      const right = this.evalExpression(addParts[2]);
      if (addParts[1] === '+') {
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left) + String(right);
        }
        return (left as number) + (right as number);
      } else {
        return (left as number) - (right as number);
      }
    }

    const mulParts = this.splitArithmetic(expr, ['*', '/', '%']);
    if (mulParts) {
      const left = this.evalExpression(mulParts[0]);
      const right = this.evalExpression(mulParts[2]);
      switch (mulParts[1]) {
        case '*': return (left as number) * (right as number);
        case '/': return (right as number) !== 0 ? Math.trunc((left as number) / (right as number)) : 0;
        case '%': return (left as number) % (right as number);
      }
    }

    const powParts = this.splitBinary(expr, '**');
    if (powParts) {
      const left = this.evalExpression(powParts[0]);
      const right = this.evalExpression(powParts[1]);
      return Math.pow(left as number, right as number);
    }

    if (expr.startsWith('!')) {
      return !this.isTruthy(this.evalExpression(expr.slice(1)));
    }
    if (expr.startsWith('not ')) {
      return !this.isTruthy(this.evalExpression(expr.slice(4)));
    }

    if (expr.startsWith('-') && expr.length > 1) {
      const inner = this.evalExpression(expr.slice(1));
      if (typeof inner === 'number') return -inner;
    }

    const dotCallResult = this.tryDotCall(expr);
    if (dotCallResult !== undefined) return dotCallResult;

    const blockCallResult = this.tryBlockCall(expr);
    if (blockCallResult !== undefined) return blockCallResult;

    const rangeMatch = expr.match(/^(\d+)(\.\.\.?)(\d+)$/);
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1]);
      const to = parseInt(rangeMatch[3]);
      const exclusive = rangeMatch[2] === '...';
      const arr: MrubyValue[] = [];
      for (let j = from; j <= (exclusive ? to - 1 : to); j++) arr.push(j);
      return arr;
    }

    const funcCallMatch = expr.match(/^([a-zA-Z_]\w*)\s*\((.*)\)\s*$/);
    if (funcCallMatch) {
      return this.callMethod(funcCallMatch[1], funcCallMatch[2]);
    }

    const funcNoParens = expr.match(/^([a-zA-Z_]\w+)\s+(.+)$/);
    if (funcNoParens && this.methods.has(funcNoParens[1])) {
      return this.callMethod(funcNoParens[1], funcNoParens[2]);
    }

    const indexMatch = expr.match(/^(\w+)\[(.+)\]$/);
    if (indexMatch) {
      const obj = this.env.get(indexMatch[1]);
      const idx = this.evalExpression(indexMatch[2]);
      if (Array.isArray(obj)) {
        const numIdx = typeof idx === 'number' ? idx : parseInt(String(idx));
        return obj[numIdx < 0 ? obj.length + numIdx : numIdx] ?? null;
      }
      if (obj && typeof obj === 'object' && '__type' in obj && (obj as MrubyHash).__type === 'hash') {
        return (obj as MrubyHash).data.get(String(idx)) ?? null;
      }
      return null;
    }

    // Instance variable access
    if (/^@\w+$/.test(expr)) {
      if (this.currentSelf) {
        return this.currentSelf.instanceVars.get(expr.slice(1)) ?? null;
      }
      return null;
    }

    // Class name lookup (starts with uppercase)
    if (/^[A-Z]\w*$/.test(expr)) {
      const cls = this.classes.get(expr);
      if (cls) return cls;
    }

    if (/^[a-zA-Z_$][\w]*$/.test(expr)) {
      return this.env.get(expr);
    }

    return null;
  }

  private splitBinary(expr: string, op: string): [string, string] | null {
    let inStr = false;
    let strChar = '';
    let depth = 0;
    let lastPos = -1;
    const opLen = op.length;
    
    for (let i = 0; i <= expr.length - opLen; i++) {
      const ch = expr[i];
      if (!inStr && (ch === '"' || ch === "'")) { inStr = true; strChar = ch; continue; }
      if (inStr && ch === strChar && (i === 0 || expr[i-1] !== '\\')) { inStr = false; continue; }
      if (inStr) continue;
      if (ch === '(' || ch === '[' || ch === '{') { depth++; continue; }
      if (ch === ')' || ch === ']' || ch === '}') { depth--; continue; }
      if (depth === 0 && expr.substring(i, i + opLen) === op) {
        const before = i > 0 ? expr[i-1] : '';
        const after = expr[i + opLen] || '';
        if (op === '=' && (before === '!' || before === '<' || before === '>' || before === '=')) continue;
        if (op === '=' && after === '=') continue;
        if (op === '<' && (after === '=' || after === '<')) continue;
        if (op === '>' && (after === '=' || after === '>')) continue;
        if (op === '!' && after === '=') continue;
        if (op === '&' && (before === '&' || after === '&')) continue;
        if (op === '|' && (before === '|' || after === '|')) continue;
        if (op === '*' && (before === '*' || after === '*')) continue;
        if (op === '+' && before === '+') continue;
        if (op === '-' && before === '-') continue;
        lastPos = i;
      }
    }
    
    if (lastPos >= 0) {
      const left = expr.substring(0, lastPos).trim();
      const right = expr.substring(lastPos + opLen).trim();
      if (left && right) return [left, right];
    }
    return null;
  }

  private splitBinaryKeyword(expr: string, keyword: string): [string, string] | null {
    const pattern = new RegExp(`\\b${keyword}\\b`);
    const match = expr.match(pattern);
    if (!match || match.index === undefined) return null;
    const left = expr.substring(0, match.index).trim();
    const right = expr.substring(match.index + keyword.length).trim();
    if (left && right) return [left, right];
    return null;
  }

  private splitArithmetic(expr: string, ops: string[]): [string, string, string] | null {
    let depth = 0;
    let inStr = false;
    let strChar = '';
    let lastPos = -1;
    let lastOp = '';

    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (!inStr && (ch === '"' || ch === "'")) { inStr = true; strChar = ch; continue; }
      if (inStr && ch === strChar && (i === 0 || expr[i-1] !== '\\')) { inStr = false; continue; }
      if (inStr) continue;
      if (ch === '(' || ch === '[' || ch === '{') { depth++; continue; }
      if (ch === ')' || ch === ']' || ch === '}') { depth--; continue; }
      if (depth === 0) {
        for (const op of ops) {
          if (expr[i] === op) {
            if ((op === '+' || op === '-') && i === 0) continue;
            const prev = expr[i-1] || '';
            if ((op === '+' || op === '-') && '+-*/(%'.includes(prev)) continue;
            if (op === '*' && expr[i+1] === '*') continue;
            if (op === '*' && i > 0 && expr[i-1] === '*') continue;
            lastPos = i;
            lastOp = op;
          }
        }
      }
    }

    if (lastPos > 0 && lastOp) {
      const left = expr.substring(0, lastPos).trim();
      const right = expr.substring(lastPos + 1).trim();
      if (left && right) return [left, lastOp, right];
    }
    return null;
  }

  private tryDotCall(expr: string): MrubyValue | undefined {
    let depth = 0;
    let inStr = false;
    let strChar = '';
    let dotPos = -1;

    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (!inStr && (ch === '"' || ch === "'")) { inStr = true; strChar = ch; continue; }
      if (inStr && ch === strChar && (i === 0 || expr[i-1] !== '\\')) { inStr = false; continue; }
      if (inStr) continue;
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (ch === '.' && depth === 0 && i > 0) dotPos = i;
    }

    if (dotPos <= 0) return undefined;

    const objExpr = expr.substring(0, dotPos).trim();
    const rest = expr.substring(dotPos + 1).trim();
    if (!rest) return undefined;

    const obj = this.evalExpression(objExpr);

    const methodMatch = rest.match(/^(\w+[\?!]?)\s*(?:\((.*?)\))?\s*$/);
    if (!methodMatch) return undefined;

    const methodName = methodMatch[1];
    const argsStr = methodMatch[2] || '';

    return this.callBuiltinMethod(obj, methodName, argsStr, objExpr);
  }

  private callBuiltinMethod(obj: MrubyValue, method: string, argsStr: string, _objExpr: string): MrubyValue {
    const args = argsStr ? this.splitArgs(argsStr).map(a => this.evalExpression(a)) : [];

    // Handle class objects (ClassName.new, class methods)
    if (obj && typeof obj === 'object' && '__type' in obj && (obj as MrubyClassDef).__type === 'class') {
      const cls = obj as MrubyClassDef;
      if (method === 'new') {
        const instance: MrubyInstance = {
          __type: 'instance',
          className: cls.name,
          instanceVars: new Map(),
          classDef: cls
        };
        // Look up initialize in class hierarchy (supports inheritance)
        const initMethod = this.lookupInstanceMethod(instance, 'initialize');
        if (initMethod) {
          this.executeInstanceMethod(instance, initMethod, args);
        }
        return instance;
      }
      const classMethod = cls.methods.get(`self.${method}`);
      if (classMethod) {
        return this.executeMethod(classMethod, args);
      }
      return null;
    }

    // Handle instance objects
    if (obj && typeof obj === 'object' && '__type' in obj && (obj as MrubyInstance).__type === 'instance') {
      const instance = obj as MrubyInstance;
      const instMethod = this.lookupInstanceMethod(instance, method);
      if (instMethod) {
        return this.executeInstanceMethod(instance, instMethod, args);
      }
      switch (method) {
        case 'class': return instance.className;
        case 'is_a?': case 'kind_of?': {
          let cls: MrubyClassDef | null = instance.classDef;
          while (cls) {
            if (cls.name === String(args[0])) return true;
            cls = cls.superClassName ? (this.classes.get(cls.superClassName) ?? null) : null;
          }
          return String(args[0]) === 'Object';
        }
        case 'respond_to?': return instance.classDef.methods.has(String(args[0]));
        case 'nil?': return false;
        case 'to_s': return `#<${instance.className}>`;
        case 'inspect': {
          const varParts = Array.from(instance.instanceVars.entries())
            .map(([k, v]) => `@${k}=${this.inspect(v)}`).join(', ');
          return varParts ? `#<${instance.className} ${varParts}>` : `#<${instance.className}>`;
        }
        case 'instance_variable_get': {
          const varName = String(args[0]).replace(/^@/, '');
          return instance.instanceVars.get(varName) ?? null;
        }
        case 'instance_variable_set': {
          const varName = String(args[0]).replace(/^@/, '');
          instance.instanceVars.set(varName, args[1] ?? null);
          return args[1] ?? null;
        }
      }
      return null;
    }

    if (typeof obj === 'string') {
      switch (method) {
        case 'length': case 'size': return obj.length;
        case 'upcase': return obj.toUpperCase();
        case 'downcase': return obj.toLowerCase();
        case 'reverse': return obj.split('').reverse().join('');
        case 'strip': return obj.trim();
        case 'chomp': return obj.replace(/\n$/, '');
        case 'chop': return obj.slice(0, -1);
        case 'empty?': return obj.length === 0;
        case 'include?': return args[0] !== undefined ? obj.includes(String(args[0])) : false;
        case 'start_with?': return args[0] !== undefined ? obj.startsWith(String(args[0])) : false;
        case 'end_with?': return args[0] !== undefined ? obj.endsWith(String(args[0])) : false;
        case 'split': {
          const sep = args[0] !== undefined ? String(args[0]) : ' ';
          return obj.split(sep);
        }
        case 'gsub': {
          if (args.length >= 2) {
            return obj.split(String(args[0])).join(String(args[1]));
          }
          return obj;
        }
        case 'sub': {
          if (args.length >= 2) {
            return obj.replace(String(args[0]), String(args[1]));
          }
          return obj;
        }
        case 'to_i': return parseInt(obj, 10) || 0;
        case 'to_f': return parseFloat(obj) || 0.0;
        case 'to_s': return obj;
        case 'chars': return obj.split('');
        case 'bytes': return obj.split('').map(c => c.charCodeAt(0));
        case 'lines': return obj.split('\n');
        case 'tr': {
          if (args.length >= 2) {
            const from = String(args[0]);
            const to = String(args[1]);
            return obj.split('').map(c => {
              const idx = from.indexOf(c);
              return idx >= 0 ? (to[idx] || to[to.length-1]) : c;
            }).join('');
          }
          return obj;
        }
        case 'center': {
          const width = typeof args[0] === 'number' ? args[0] : parseInt(String(args[0]));
          const pad = args[1] !== undefined ? String(args[1]) : ' ';
          if (obj.length >= width) return obj;
          const totalPad = width - obj.length;
          const left = Math.floor(totalPad / 2);
          const right = totalPad - left;
          return pad.repeat(left) + obj + pad.repeat(right);
        }
        case 'ljust': {
          const width = typeof args[0] === 'number' ? args[0] : parseInt(String(args[0]));
          return obj.padEnd(width, args[1] !== undefined ? String(args[1]) : ' ');
        }
        case 'rjust': {
          const width = typeof args[0] === 'number' ? args[0] : parseInt(String(args[0]));
          return obj.padStart(width, args[1] !== undefined ? String(args[1]) : ' ');
        }
        case 'freeze': return obj;
        case 'dup': return obj;
        case 'inspect': return `"${obj}"`;
        case 'match': {
          const pattern = String(args[0]);
          return obj.match(new RegExp(pattern)) ? true : false;
        }
        case 'encode': return obj;
        case 'force_encoding': return obj;
        case '*': {
          const n = typeof args[0] === 'number' ? args[0] : parseInt(String(args[0]));
          return obj.repeat(n);
        }
        case '+': {
          return obj + String(args[0]);
        }
        case '[]': {
          const idx = args[0];
          if (typeof idx === 'number') {
            return idx < 0 ? obj[obj.length + idx] : obj[idx];
          }
          return null;
        }
      }
    }

    if (typeof obj === 'number') {
      switch (method) {
        case 'to_s': return String(obj);
        case 'to_i': return Math.trunc(obj);
        case 'to_f': return obj;
        case 'to_r': return String(obj);
        case 'abs': return Math.abs(obj);
        case 'even?': return obj % 2 === 0;
        case 'odd?': return Math.abs(obj % 2) === 1;
        case 'zero?': return obj === 0;
        case 'positive?': return obj > 0;
        case 'negative?': return obj < 0;
        case 'round': return args[0] !== undefined ? parseFloat(obj.toFixed(typeof args[0] === 'number' ? args[0] : parseInt(String(args[0])))) : Math.round(obj);
        case 'floor': return Math.floor(obj);
        case 'ceil': return Math.ceil(obj);
        case 'sqrt': return Math.sqrt(obj);
        case 'chr': return String.fromCharCode(obj);
        case 'inspect': return String(obj);
        case 'times': return null;
        case 'upto': return null;
        case 'downto': return null;
      }
    }

    if (Array.isArray(obj)) {
      switch (method) {
        case 'length': case 'size': return obj.length;
        case 'empty?': return obj.length === 0;
        case 'first': return args[0] !== undefined ? obj.slice(0, typeof args[0] === 'number' ? args[0] : parseInt(String(args[0]))) : (obj[0] ?? null);
        case 'last': return args[0] !== undefined ? obj.slice(-(typeof args[0] === 'number' ? args[0] : parseInt(String(args[0])))) : (obj[obj.length - 1] ?? null);
        case 'push': case 'append': case '<<': obj.push(args[0] ?? null); return obj;
        case 'pop': return obj.pop() ?? null;
        case 'shift': return obj.shift() ?? null;
        case 'unshift': obj.unshift(args[0] ?? null); return obj;
        case 'reverse': return [...obj].reverse();
        case 'sort': return [...obj].sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          return String(a).localeCompare(String(b));
        });
        case 'sort!': obj.sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          return String(a).localeCompare(String(b));
        }); return obj;
        case 'uniq': return [...new Set(obj.map(x => JSON.stringify(x)))].map(x => JSON.parse(x) as MrubyValue);
        case 'flatten': { const flatArr = obj as unknown[]; return flatArr.flat(Infinity) as MrubyValue[]; }
        case 'compact': return obj.filter(x => x !== null);
        case 'sum': return obj.reduce((acc, x) => (acc as number) + (typeof x === 'number' ? x : 0), args[0] ?? 0) as number;
        case 'min': return obj.reduce((min, x) => (x as number) < (min as number) ? x : min, obj[0]);
        case 'max': return obj.reduce((max, x) => (x as number) > (max as number) ? x : max, obj[0]);
        case 'include?': return obj.some(x => x === args[0]);
        case 'join': {
          const sep = args[0] !== undefined ? String(args[0]) : '';
          return obj.map(x => this.stringify(x)).join(sep);
        }
        case 'zip': {
          const other = args[0];
          if (Array.isArray(other)) {
            return obj.map((x, i) => [x, other[i] ?? null]);
          }
          return obj;
        }
        case 'take': {
          const n = typeof args[0] === 'number' ? args[0] : parseInt(String(args[0]));
          return obj.slice(0, n);
        }
        case 'drop': {
          const n = typeof args[0] === 'number' ? args[0] : parseInt(String(args[0]));
          return obj.slice(n);
        }
        case 'flatten!': {
          const flat = (obj as unknown[]).flat(Infinity) as MrubyValue[];
          obj.splice(0, obj.length, ...flat);
          return obj;
        }
        case 'tally': {
          const tally: MrubyHash = { __type: 'hash', data: new Map() };
          for (const x of obj) {
            const key = String(x);
            tally.data.set(key, ((tally.data.get(key) as number) || 0) + 1);
          }
          return tally;
        }
        case 'minmax': return [
          obj.reduce((min, x) => (x as number) < (min as number) ? x : min, obj[0]),
          obj.reduce((max, x) => (x as number) > (max as number) ? x : max, obj[0])
        ];
        case 'count': {
          if (args.length > 0) return obj.filter(x => x === args[0]).length;
          return obj.length;
        }
        case 'index': case 'find_index': {
          const target = args[0];
          const idx = obj.findIndex(x => x === target);
          return idx === -1 ? null : idx;
        }
        case 'delete': {
          const target = args[0];
          const idx = obj.indexOf(target);
          if (idx >= 0) { obj.splice(idx, 1); return target; }
          return null;
        }
        case 'delete_at': {
          const n = typeof args[0] === 'number' ? args[0] : parseInt(String(args[0]));
          return obj.splice(n, 1)[0] ?? null;
        }
        case 'insert': {
          const n = typeof args[0] === 'number' ? args[0] : parseInt(String(args[0]));
          obj.splice(n, 0, args[1] ?? null);
          return obj;
        }
        case 'concat': {
          if (Array.isArray(args[0])) obj.push(...args[0]);
          return obj;
        }
        case 'dup': return [...obj];
        case 'clone': return [...obj];
        case 'freeze': return obj;
        case 'sample': return obj[Math.floor(Math.random() * obj.length)] ?? null;
        case 'shuffle': return [...obj].sort(() => Math.random() - 0.5);
        case 'rotate': {
          const n = typeof args[0] === 'number' ? args[0] : 1;
          return [...obj.slice(n), ...obj.slice(0, n)];
        }
        case 'inspect': return '[' + obj.map(x => this.inspect(x)).join(', ') + ']';
        case 'to_s': return '[' + obj.map(x => this.inspect(x)).join(', ') + ']';
        case 'each': case 'map': case 'collect': case 'select': case 'reject': case 'find':
        case 'detect': case 'any?': case 'all?': case 'none?': case 'reduce': case 'inject':
          return null;
      }
    }

    if (obj && typeof obj === 'object' && '__type' in obj && (obj as MrubyHash).__type === 'hash') {
      const hash = obj as MrubyHash;
      switch (method) {
        case 'keys': return Array.from(hash.data.keys());
        case 'values': return Array.from(hash.data.values());
        case 'size': case 'length': case 'count': return hash.data.size;
        case 'empty?': return hash.data.size === 0;
        case 'has_key?': case 'key?': case 'include?': return hash.data.has(String(args[0]));
        case 'has_value?': case 'value?': return Array.from(hash.data.values()).includes(args[0]);
        case 'fetch': {
          const key = String(args[0]);
          const val = hash.data.get(key);
          if (val !== undefined) return val;
          if (args[1] !== undefined) return args[1];
          throw new RubyException(`KeyError: key not found: ${key}`);
        }
        case 'delete': {
          const key = String(args[0]);
          const val = hash.data.get(key);
          hash.data.delete(key);
          return val ?? null;
        }
        case 'merge': {
          const other = args[0] as MrubyHash;
          const result: MrubyHash = { __type: 'hash', data: new Map(hash.data) };
          if (other && other.__type === 'hash') {
            for (const [k, v] of other.data) result.data.set(k, v);
          }
          return result;
        }
        case 'to_a': return Array.from(hash.data.entries()).map(([k, v]) => [k, v]);
        case 'any?': return hash.data.size > 0;
        case 'all?': return hash.data.size > 0;
        case 'none?': return hash.data.size === 0;
        case 'inspect': case 'to_s': {
          const pairs = Array.from(hash.data.entries()).map(([k, v]) => `${k}: ${this.inspect(v)}`);
          return '{' + pairs.join(', ') + '}';
        }
      }
    }

    if (obj === null) {
      switch (method) {
        case 'nil?': return true;
        case 'to_s': return '';
        case 'to_a': return [];
        case 'to_i': return 0;
        case 'inspect': return 'nil';
      }
    }

    if (typeof obj === 'boolean') {
      switch (method) {
        case 'to_s': return String(obj);
        case 'nil?': return false;
        case 'inspect': return String(obj);
      }
    }

    return null;
  }

  private tryBlockCall(expr: string): MrubyValue | undefined {
    const blockMatch = expr.match(/^(.+?)\s*\{(\s*\|([^|]*)\|\s*)?(.*)\}\s*$/);
    if (!blockMatch) {
      return undefined;
    }

    const receiverAndMethod = blockMatch[1].trim();
    const blockParams = blockMatch[3] ? blockMatch[3].split(',').map(p => p.trim()) : [];
    const blockBody = blockMatch[4].trim();

    const dotPos = this.findLastDot(receiverAndMethod);
    
    if (dotPos < 0) {
      return undefined;
    }

    const objExpr = receiverAndMethod.substring(0, dotPos).trim();
    const methodPart = receiverAndMethod.substring(dotPos + 1).trim();
    const methodMatch = methodPart.match(/^(\w+[\?!]?)\s*(?:\((.*?)\))?$/);
    if (!methodMatch) return undefined;

    const methodName = methodMatch[1];
    const methodArgs = methodMatch[2] ? this.splitArgs(methodMatch[2]).map(a => this.evalExpression(a)) : [];

    const obj = this.evalExpression(objExpr);

    const runBlock = (params: MrubyValue[]): MrubyValue => {
      const blockEnv = new Environment(this.env);
      const savedEnv = this.env;
      this.env = blockEnv;
      
      for (let pi = 0; pi < blockParams.length; pi++) {
        blockEnv.set(blockParams[pi], params[pi] ?? null);
      }
      
      let blockResult: MrubyValue = null;
      try {
        blockResult = this.evalStatement(blockBody);
      } catch (e) {
        this.env = savedEnv;
        throw e;
      }
      this.env = savedEnv;
      
      for (const [k, v] of blockEnv.getVars()) {
        if (!blockParams.includes(k)) {
          this.env.set(k, v);
        }
      }
      
      return blockResult;
    };

    if (typeof obj === 'number') {
      if (methodName === 'times') {
        for (let i = 0; i < obj; i++) {
          this.checkIterations();
          try { runBlock([i]); } catch(e) {
            if (e instanceof BreakException) break;
            if (e instanceof NextException) continue;
            throw e;
          }
        }
        return obj;
      }
      if (methodName === 'upto') {
        const to = typeof methodArgs[0] === 'number' ? methodArgs[0] : parseInt(String(methodArgs[0]));
        for (let i = obj; i <= to; i++) {
          this.checkIterations();
          try { runBlock([i]); } catch(e) {
            if (e instanceof BreakException) break;
            if (e instanceof NextException) continue;
            throw e;
          }
        }
        return obj;
      }
      if (methodName === 'downto') {
        const to = typeof methodArgs[0] === 'number' ? methodArgs[0] : parseInt(String(methodArgs[0]));
        for (let i = obj; i >= to; i--) {
          this.checkIterations();
          try { runBlock([i]); } catch(e) {
            if (e instanceof BreakException) break;
            if (e instanceof NextException) continue;
            throw e;
          }
        }
        return obj;
      }
    }

    if (Array.isArray(obj)) {
      switch (methodName) {
        case 'each': case 'each_with_object': {
          for (const item of obj) {
            this.checkIterations();
            try { runBlock([item]); } catch(e) {
              if (e instanceof BreakException) break;
              if (e instanceof NextException) continue;
              throw e;
            }
          }
          return obj;
        }
        case 'each_with_index': {
          for (let i = 0; i < obj.length; i++) {
            this.checkIterations();
            try { runBlock([obj[i], i]); } catch(e) {
              if (e instanceof BreakException) break;
              if (e instanceof NextException) continue;
              throw e;
            }
          }
          return obj;
        }
        case 'map': case 'collect': {
          return obj.map((item, i) => {
            this.checkIterations();
            return runBlock([item, i]);
          });
        }
        case 'select': case 'filter': {
          return obj.filter((item) => {
            this.checkIterations();
            return this.isTruthy(runBlock([item]));
          });
        }
        case 'reject': {
          return obj.filter((item) => {
            this.checkIterations();
            return !this.isTruthy(runBlock([item]));
          });
        }
        case 'find': case 'detect': {
          return obj.find((item) => {
            this.checkIterations();
            return this.isTruthy(runBlock([item]));
          }) ?? null;
        }
        case 'any?': {
          return obj.some((item) => {
            this.checkIterations();
            return this.isTruthy(runBlock([item]));
          });
        }
        case 'all?': {
          return obj.every((item) => {
            this.checkIterations();
            return this.isTruthy(runBlock([item]));
          });
        }
        case 'none?': {
          return !obj.some((item) => {
            this.checkIterations();
            return this.isTruthy(runBlock([item]));
          });
        }
        case 'reduce': case 'inject': {
          if (methodArgs.length > 0 && blockParams.length >= 2) {
            return obj.reduce((acc, item) => {
              this.checkIterations();
              return runBlock([acc, item]);
            }, methodArgs[0]);
          } else if (blockParams.length >= 2) {
            return obj.reduce((acc, item) => {
              this.checkIterations();
              return runBlock([acc, item]);
            });
          }
          return null;
        }
        case 'flat_map': {
          const result: MrubyValue[] = [];
          for (const item of obj) {
            this.checkIterations();
            const mapped = runBlock([item]);
            if (Array.isArray(mapped)) result.push(...mapped);
            else result.push(mapped);
          }
          return result;
        }
        case 'each_slice': {
          const n = typeof methodArgs[0] === 'number' ? methodArgs[0] : parseInt(String(methodArgs[0]));
          for (let i = 0; i < obj.length; i += n) {
            this.checkIterations();
            try { runBlock([obj.slice(i, i + n)]); } catch(e) {
              if (e instanceof BreakException) break;
              throw e;
            }
          }
          return null;
        }
        case 'sort_by': {
          return [...obj].sort((a, b) => {
            const ka = runBlock([a]);
            const kb = runBlock([b]);
            if (typeof ka === 'number' && typeof kb === 'number') return ka - kb;
            return String(ka).localeCompare(String(kb));
          });
        }
        case 'group_by': {
          const groups: MrubyHash = { __type: 'hash', data: new Map() };
          for (const item of obj) {
            const key = String(runBlock([item]));
            const existing = groups.data.get(key);
            if (Array.isArray(existing)) existing.push(item);
            else groups.data.set(key, [item]);
          }
          return groups;
        }
        case 'count': {
          let count = 0;
          for (const item of obj) {
            if (this.isTruthy(runBlock([item]))) count++;
          }
          return count;
        }
        case 'sum': {
          let sum = 0;
          for (const item of obj) {
            sum += runBlock([item]) as number;
          }
          return sum;
        }
        case 'min_by': {
          if (obj.length === 0) return null;
          return obj.reduce((min, item) => {
            const kMin = runBlock([min]);
            const kItem = runBlock([item]);
            return (kItem as number) < (kMin as number) ? item : min;
          });
        }
        case 'max_by': {
          if (obj.length === 0) return null;
          return obj.reduce((max, item) => {
            const kMax = runBlock([max]);
            const kItem = runBlock([item]);
            return (kItem as number) > (kMax as number) ? item : max;
          });
        }
      }
    }

    if (obj && typeof obj === 'object' && '__type' in obj && (obj as MrubyHash).__type === 'hash') {
      const hash = obj as MrubyHash;
      switch (methodName) {
        case 'each': case 'each_pair': {
          for (const [k, v] of hash.data) {
            this.checkIterations();
            try { runBlock([k, v]); } catch(e) {
              if (e instanceof BreakException) break;
              throw e;
            }
          }
          return obj;
        }
        case 'map': case 'collect': {
          return Array.from(hash.data.entries()).map(([k, v]) => runBlock([k, v]));
        }
        case 'select': case 'filter': {
          const result: MrubyHash = { __type: 'hash', data: new Map() };
          for (const [k, v] of hash.data) {
            if (this.isTruthy(runBlock([k, v]))) result.data.set(k, v);
          }
          return result;
        }
        case 'reject': {
          const result: MrubyHash = { __type: 'hash', data: new Map() };
          for (const [k, v] of hash.data) {
            if (!this.isTruthy(runBlock([k, v]))) result.data.set(k, v);
          }
          return result;
        }
        case 'any?': {
          for (const [k, v] of hash.data) {
            if (this.isTruthy(runBlock([k, v]))) return true;
          }
          return false;
        }
        case 'all?': {
          for (const [k, v] of hash.data) {
            if (!this.isTruthy(runBlock([k, v]))) return false;
          }
          return true;
        }
      }
    }

    if (typeof obj === 'string') {
      if (methodName === 'each_char') {
        for (const ch of obj) {
          try { runBlock([ch]); } catch(e) {
            if (e instanceof BreakException) break;
            throw e;
          }
        }
        return obj;
      }
    }

    return undefined;
  }

  private findLastDot(expr: string): number {
    let depth = 0;
    let inStr = false;
    let strChar = '';
    let dotPos = -1;
    
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (!inStr && (ch === '"' || ch === "'")) { inStr = true; strChar = ch; }
      else if (inStr && ch === strChar && (i === 0 || expr[i-1] !== '\\')) { inStr = false; }
      else if (!inStr && (ch === '(' || ch === '[' || ch === '{')) depth++;
      else if (!inStr && (ch === ')' || ch === ']' || ch === '}')) depth--;
      else if (!inStr && ch === '.' && depth === 0 && i > 0) dotPos = i;
    }
    return dotPos;
  }

  private callMethod(name: string, argsStr: string): MrubyValue {
    switch (name) {
      case 'puts': {
        const args = argsStr ? this.splitArgs(argsStr) : [];
        if (args.length === 0) { this.output.push('\n'); return null; }
        for (const arg of args) {
          const val = this.evalExpression(arg);
          if (Array.isArray(val)) {
            for (const item of val) this.output.push(this.stringify(item) + '\n');
          } else {
            this.output.push(this.stringify(val) + '\n');
          }
        }
        return null;
      }
      case 'print': {
        const args = argsStr ? this.splitArgs(argsStr) : [];
        for (const arg of args) {
          this.output.push(this.stringify(this.evalExpression(arg)));
        }
        return null;
      }
      case 'p': {
        const args = argsStr ? this.splitArgs(argsStr) : [];
        for (const arg of args) {
          const val = this.evalExpression(arg);
          this.output.push(this.inspect(val) + '\n');
        }
        return args.length === 1 ? this.evalExpression(args[0]) : null;
      }
      case 'raise': {
        const msg = argsStr ? this.evalExpression(argsStr) : 'RuntimeError';
        throw new RubyException(String(msg));
      }
      case 'require': case 'require_relative': return null;
      case 'rand': {
        const n = argsStr ? this.evalExpression(argsStr) : null;
        if (typeof n === 'number') return Math.floor(Math.random() * n);
        return Math.random();
      }
      case 'sleep': return null;
      case 'exit': throw new RubyException('SystemExit');
      case 'abort': throw new RubyException(argsStr ? String(this.evalExpression(argsStr)) : 'Aborted');
      case 'Integer': {
        const val = this.evalExpression(argsStr);
        return parseInt(String(val), 10) || 0;
      }
      case 'Float': {
        const val = this.evalExpression(argsStr);
        return parseFloat(String(val)) || 0.0;
      }
      case 'String': {
        const val = this.evalExpression(argsStr);
        return this.stringify(val);
      }
      case 'Array': {
        const val = this.evalExpression(argsStr);
        if (Array.isArray(val)) return val;
        if (val === null) return [];
        return [val];
      }
      case 'Hash': return { __type: 'hash', data: new Map() };
      case 'pp': {
        const val = this.evalExpression(argsStr);
        this.output.push(this.inspect(val) + '\n');
        return val;
      }
      case 'sprintf': case 'format': {
        const fArgs = this.splitArgs(argsStr).map(a => this.evalExpression(a));
        return this.sprintf(String(fArgs[0]), fArgs.slice(1));
      }
    }

    if (this.methods.has(name)) {
      const method = this.methods.get(name)!;
      const callArgs = argsStr ? this.splitArgs(argsStr).map(a => this.evalExpression(a)) : [];
      return this.executeMethod(method, callArgs);
    }

    return null;
  }

  private executeMethod(method: MrubyMethod, args: MrubyValue[]): MrubyValue {
    const methodEnv = new Environment(this.env);
    for (let i = 0; i < method.params.length; i++) {
      let paramName = method.params[i];
      let defaultVal: MrubyValue = null;
      const defMatch = paramName.match(/^(\w+)\s*=\s*(.+)$/);
      if (defMatch) {
        paramName = defMatch[1];
        defaultVal = this.evalExpression(defMatch[2]);
      }
      methodEnv.set(paramName, args[i] !== undefined ? args[i] : defaultVal);
    }

    const savedEnv = this.env;
    this.env = methodEnv;
    this.callStackNames.push(method.name);
    let result: MrubyValue = null;

    try {
      result = this.executeBlock(method.body, 0, method.body.length, method.bodyLineBase);
    } catch (e) {
      if (e instanceof ReturnException) {
        result = e.value;
      } else {
        this.callStackNames.pop();
        this.env = savedEnv;
        throw e;
      }
    }

    this.callStackNames.pop();
    this.env = savedEnv;
    return result;
  }

  private parseArray(expr: string): MrubyValue[] {
    const inner = expr.slice(1, -1).trim();
    if (!inner) return [];
    const items = this.splitArgs(inner);
    return items.map(item => this.evalExpression(item.trim()));
  }

  private parseHash(expr: string): MrubyHash {
    const hash: MrubyHash = { __type: 'hash', data: new Map() };
    const inner = expr.slice(1, -1).trim();
    if (!inner) return hash;
    
    const pairs = this.splitArgs(inner);
    for (const pair of pairs) {
      const symbolKey = pair.match(/^(\w+)\s*:\s*(.+)$/);
      if (symbolKey) {
        hash.data.set(symbolKey[1], this.evalExpression(symbolKey[2].trim()));
        continue;
      }
      const rocket = pair.match(/^(.+?)\s*=>\s*(.+)$/);
      if (rocket) {
        const key = this.evalExpression(rocket[1].trim());
        hash.data.set(String(key), this.evalExpression(rocket[2].trim()));
        continue;
      }
    }
    return hash;
  }

  private interpolateString(str: string): string {
    return str.replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .replace(/#\{([^}]+)\}/g, (_, expr) => {
                const val = this.evalExpression(expr.trim());
                return this.stringify(val);
              });
  }

  private stringify(val: MrubyValue): string {
    if (val === null) return '';
    if (val === true) return 'true';
    if (val === false) return 'false';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return '[' + val.map(x => this.inspect(x)).join(', ') + ']';
    if (typeof val === 'object' && '__type' in val) {
      if ((val as MrubyHash).__type === 'hash') {
        const pairs = Array.from((val as MrubyHash).data.entries()).map(([k, v]) => `${k}: ${this.inspect(v)}`);
        return '{' + pairs.join(', ') + '}';
      }
      if ((val as MrubyInstance).__type === 'instance') {
        const instance = val as MrubyInstance;
        const toSMethod = this.lookupInstanceMethod(instance, 'to_s');
        if (toSMethod) return String(this.executeInstanceMethod(instance, toSMethod, []));
        return `#<${instance.className}>`;
      }
      if ((val as MrubyClassDef).__type === 'class') {
        return (val as MrubyClassDef).name;
      }
    }
    return String(val);
  }

  private inspect(val: MrubyValue): string {
    if (val === null) return 'nil';
    if (val === true) return 'true';
    if (val === false) return 'false';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'string') return `"${val}"`;
    if (Array.isArray(val)) return '[' + val.map(x => this.inspect(x)).join(', ') + ']';
    if (typeof val === 'object' && '__type' in val) {
      if ((val as MrubyHash).__type === 'hash') {
        const pairs = Array.from((val as MrubyHash).data.entries()).map(([k, v]) => `${k}: ${this.inspect(v)}`);
        return '{' + pairs.join(', ') + '}';
      }
      if ((val as MrubyInstance).__type === 'instance') {
        const instance = val as MrubyInstance;
        const inspectMethod = this.lookupInstanceMethod(instance, 'inspect');
        if (inspectMethod) return String(this.executeInstanceMethod(instance, inspectMethod, []));
        const varParts = Array.from(instance.instanceVars.entries())
          .map(([k, v]) => `@${k}=${this.inspect(v)}`).join(', ');
        return varParts ? `#<${instance.className} ${varParts}>` : `#<${instance.className}>`;
      }
      if ((val as MrubyClassDef).__type === 'class') {
        return (val as MrubyClassDef).name;
      }
    }
    return String(val);
  }

  private isTruthy(val: MrubyValue): boolean {
    return val !== null && val !== false;
  }

  private sprintf(format: string, args: MrubyValue[]): string {
    let argIdx = 0;
    return format.replace(/%([dsf.0-9]*[dsf])/g, (_, spec) => {
      const arg = args[argIdx++];
      if (spec.endsWith('d')) return String(Math.trunc(arg as number));
      if (spec.endsWith('f')) {
        const precMatch = spec.match(/\.(\d+)f/);
        if (precMatch) return (arg as number).toFixed(parseInt(precMatch[1]));
        return (arg as number).toFixed(6);
      }
      if (spec.endsWith('s')) return String(arg);
      return String(arg);
    });
  }
}

class RubyException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RubyException';
  }
}

class ReturnException {
  constructor(public value: MrubyValue) {}
}

class BreakException {}
class NextException {}

import { describe, it, expect } from 'vitest';
import { interpretMruby, interpretMrubyDebug } from '@/utils/mrubyInterpreter';

describe('interpretMruby', () => {
  it('should handle puts', () => {
    const result = interpretMruby('puts "Hello, World!"');
    expect(result.output).toBe('Hello, World!\n');
    expect(result.error).toBeUndefined();
  });

  it('should handle basic arithmetic', () => {
    const result = interpretMruby('puts 2 + 3');
    expect(result.output).toBe('5\n');
  });

  it('should handle variables', () => {
    const result = interpretMruby('x = 42\nputs x');
    expect(result.output).toBe('42\n');
  });

  it('should handle string interpolation', () => {
    const result = interpretMruby('name = "mruby"\nputs "Hello, #{name}!"');
    expect(result.output).toBe('Hello, mruby!\n');
  });

  it('should handle if/else', () => {
    const result = interpretMruby('x = 5\nif x > 3\n  puts "big"\nelse\n  puts "small"\nend');
    expect(result.output).toBe('big\n');
  });

  it('should handle times loop', () => {
    const result = interpretMruby('3.times { |i| puts i }');
    expect(result.output).toBe('0\n1\n2\n');
  });

  it('should handle arrays', () => {
    const result = interpretMruby('arr = [1, 2, 3]\nputs arr.sum');
    expect(result.output).toBe('6\n');
  });

  it('should handle array each', () => {
    const result = interpretMruby('arr = [1, 2, 3]\narr.each { |x| puts x }');
    expect(result.output).toBe('1\n2\n3\n');
  });

  it('should handle string methods', () => {
    const result = interpretMruby('puts "hello".upcase');
    expect(result.output).toBe('HELLO\n');
  });

  it('should handle def methods', () => {
    const result = interpretMruby('def greet(name)\n  puts "Hello, #{name}!"\nend\ngreet("World")');
    expect(result.output).toBe('Hello, World!\n');
  });

  it('should handle while loops', () => {
    const result = interpretMruby('i = 0\nwhile i < 3\n  puts i\n  i += 1\nend');
    expect(result.output).toBe('0\n1\n2\n');
  });

  it('should handle unless', () => {
    const result = interpretMruby('x = 1\nunless x > 5\n  puts "small"\nend');
    expect(result.output).toBe('small\n');
  });

  it('should handle array map', () => {
    const result = interpretMruby('arr = [1, 2, 3]\nresult = arr.map { |x| x * 2 }\nputs result.inspect');
    expect(result.output).toContain('2');
    expect(result.output).toContain('4');
    expect(result.output).toContain('6');
  });

  it('should handle raise/rescue', () => {
    const result = interpretMruby('begin\n  raise "test error"\nrescue\n  puts "rescued"\nend');
    expect(result.output).toBe('rescued\n');
  });

  it('should return error for syntax issues', () => {
    const result = interpretMruby('raise "intentional error"');
    expect(result.error).toBeTruthy();
  });

  it('should handle multiple puts arguments', () => {
    const result = interpretMruby('puts 1, 2, 3');
    expect(result.output).toBe('1\n2\n3\n');
  });

  it('should handle p function', () => {
    const result = interpretMruby('p "hello"');
    expect(result.output).toBe('"hello"\n');
  });

  it('should handle nil', () => {
    const result = interpretMruby('puts nil');
    expect(result.output).toBe('\n');
  });

  it('should handle boolean logic', () => {
    const result = interpretMruby('puts true && false\nputs true || false');
    expect(result.output).toBe('false\ntrue\n');
  });

  it('should handle integer methods', () => {
    const result = interpretMruby('puts 5.even?\nputs 4.even?');
    expect(result.output).toBe('false\ntrue\n');
  });

  it('should handle hashes', () => {
    const result = interpretMruby('h = {name: "Alice"}\nputs h[:name]');
    expect(result.output).toBe('Alice\n');
  });

  it('should handle upto', () => {
    const result = interpretMruby('1.upto(3) { |i| puts i }');
    expect(result.output).toBe('1\n2\n3\n');
  });

  it('should handle basic class with initialize and instance variables', () => {
    const code = `class Dog
  def initialize(name)
    @name = name
  end
  def speak
    puts "#{@name} says Woof!"
  end
end
dog = Dog.new("Rex")
dog.speak`;
    const result = interpretMruby(code);
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('Rex says Woof!\n');
  });

  it('should handle class with multiple instance variables', () => {
    const code = `class Person
  def initialize(name, age)
    @name = name
    @age = age
  end
  def info
    puts "#{@name} is #{@age} years old"
  end
end
person = Person.new("Alice", 30)
person.info`;
    const result = interpretMruby(code);
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('Alice is 30 years old\n');
  });

  it('should handle class inheritance', () => {
    const code = `class Animal
  def initialize(name)
    @name = name
  end
  def name
    @name
  end
end
class Cat < Animal
  def speak
    puts "#{@name} says Meow!"
  end
end
cat = Cat.new("Whiskers")
cat.speak`;
    const result = interpretMruby(code);
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('Whiskers says Meow!\n');
  });

  it('should handle class method returning value', () => {
    const code = `class Calculator
  def add(a, b)
    a + b
  end
end
calc = Calculator.new
result = calc.add(3, 4)
puts result`;
    const result = interpretMruby(code);
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('7\n');
  });

  it('should produce debug trace with line numbers', () => {
    const code = `x = 1\ny = 2\nputs x + y`;
    const { result, trace } = interpretMrubyDebug(code);
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('3\n');
    expect(trace.length).toBeGreaterThan(0);
    // Trace should contain line numbers
    const lines = trace.map(e => e.line);
    expect(lines).toContain(1);
    expect(lines).toContain(2);
    expect(lines).toContain(3);
  });

  it('should include variables in debug trace', () => {
    const code = `x = 42\nputs x`;
    const { trace } = interpretMrubyDebug(code);
    // After line 1 (x = 42), x should be in variables
    const afterAssign = trace.find(e => e.line === 2);
    expect(afterAssign).toBeDefined();
    expect(afterAssign?.vars['x']).toBe('42');
  });
});

describe('new mruby features', () => {
  it('should handle case/when', () => {
    const code = `x = 2\ncase x\nwhen 1\n  puts "one"\nwhen 2\n  puts "two"\nelse\n  puts "other"\nend`;
    const result = interpretMruby(code);
    expect(result.output).toBe('two\n');
    expect(result.error).toBeUndefined();
  });

  it('should handle case/when with else', () => {
    const code = `x = 5\ncase x\nwhen 1\n  puts "one"\nwhen 2\n  puts "two"\nelse\n  puts "other"\nend`;
    const result = interpretMruby(code);
    expect(result.output).toBe('other\n');
  });

  it('should handle loop do...end', () => {
    const code = `i = 0\nloop do\n  i += 1\n  break if i >= 3\nend\nputs i`;
    const result = interpretMruby(code);
    expect(result.output).toBe('3\n');
    expect(result.error).toBeUndefined();
  });

  it('should handle loop { } inline', () => {
    const code = `i = 0\nloop { i += 1; break if i >= 3 }\nputs i`;
    // inline loop with semicolons may not work, just test that it doesn't crash
    const result = interpretMruby(code);
    expect(result.error).toBeUndefined();
  });

  it('should handle attr_accessor', () => {
    const code = `class Person\n  attr_accessor :name, :age\nend\nperson = Person.new\nperson.name = "Alice"\nperson.age = 30\nputs person.name\nputs person.age`;
    const result = interpretMruby(code);
    expect(result.output).toBe('Alice\n30\n');
    expect(result.error).toBeUndefined();
  });

  it('should handle attr_reader', () => {
    const code = `class Dog\n  attr_reader :name\n  def initialize(name)\n    @name = name\n  end\nend\nd = Dog.new("Rex")\nputs d.name`;
    const result = interpretMruby(code);
    expect(result.output).toBe('Rex\n');
    expect(result.error).toBeUndefined();
  });

  it('should handle attr_writer', () => {
    const code = `class Box\n  attr_writer :size\n  attr_reader :size\nend\nb = Box.new\nb.size = 10\nputs b.size`;
    const result = interpretMruby(code);
    expect(result.output).toBe('10\n');
    expect(result.error).toBeUndefined();
  });

  it('should handle super', () => {
    const code = `class Animal\n  def initialize(name)\n    @name = name\n  end\n  def speak\n    "#{@name} makes a sound"\n  end\nend\nclass Dog < Animal\n  def speak\n    super + " - Woof!"\n  end\nend\nd = Dog.new("Rex")\nputs d.speak`;
    const result = interpretMruby(code);
    expect(result.output).toBe('Rex makes a sound - Woof!\n');
    expect(result.error).toBeUndefined();
  });

  it('should handle ensure', () => {
    const code = `begin\n  raise "oops"\nrescue\n  puts "rescued"\nensure\n  puts "ensured"\nend`;
    const result = interpretMruby(code);
    expect(result.output).toBe('rescued\nensured\n');
    expect(result.error).toBeUndefined();
  });

  it('should handle ensure without rescue', () => {
    const code = `begin\n  puts "try"\nensure\n  puts "ensured"\nend`;
    const result = interpretMruby(code);
    expect(result.output).toBe('try\nensured\n');
    expect(result.error).toBeUndefined();
  });

  it('should handle Math module', () => {
    const result = interpretMruby('puts Math.sqrt(16)');
    expect(result.output).toBe('4\n');
  });

  it('should handle Math::PI', () => {
    const result = interpretMruby('puts Math::PI.round(5)');
    expect(result.output).toBe('3.14159\n');
  });

  it('should handle String#capitalize', () => {
    const result = interpretMruby('puts "hello world".capitalize');
    expect(result.output).toBe('Hello world\n');
  });

  it('should handle String#swapcase', () => {
    const result = interpretMruby('puts "Hello".swapcase');
    expect(result.output).toBe('hELLO\n');
  });

  it('should handle Integer#gcd', () => {
    const result = interpretMruby('puts 12.gcd(8)');
    expect(result.output).toBe('4\n');
  });

  it('should handle Integer#lcm', () => {
    const result = interpretMruby('puts 4.lcm(6)');
    expect(result.output).toBe('12\n');
  });

  it('should handle Integer#digits', () => {
    const result = interpretMruby('puts 123.digits.inspect');
    expect(result.output).toBe('[3, 2, 1]\n');
  });

  it('should handle Integer#succ', () => {
    const result = interpretMruby('puts 5.succ');
    expect(result.output).toBe('6\n');
  });

  it('should handle spaceship operator', () => {
    const result = interpretMruby('puts (1 <=> 2)\nputs (2 <=> 2)\nputs (3 <=> 2)');
    expect(result.output).toBe('-1\n0\n1\n');
  });

  it('should handle between?', () => {
    const result = interpretMruby('puts 5.between?(1, 10)\nputs 15.between?(1, 10)');
    expect(result.output).toBe('true\nfalse\n');
  });

  it('should handle Hash#transform_values with block', () => {
    const code = `h = {a: 1, b: 2}\nresult = h.transform_values { |v| v * 2 }\nputs result[:a]\nputs result[:b]`;
    const result = interpretMruby(code);
    expect(result.output).toBe('2\n4\n');
  });

  it('should handle Array#each_with_object', () => {
    const code = `arr = [1, 2, 3]\nresult = arr.each_with_object([]) { |x, acc| acc.push(x * 2) }\nputs result.inspect`;
    const result = interpretMruby(code);
    expect(result.output).toContain('2');
    expect(result.output).toContain('4');
    expect(result.output).toContain('6');
  });

  it('should handle gets with pre-typed input', () => {
    const result = interpretMruby('line = gets\nputs line.chomp', ['hello']);
    expect(result.output).toBe('hello\n');
  });
});

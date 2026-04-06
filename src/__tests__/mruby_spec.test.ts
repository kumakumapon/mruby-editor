/**
 * mruby spec tests based on https://github.com/mruby/mruby/tree/master/test/t
 *
 * These tests verify that the interpreter behaves consistently with the official
 * mruby implementation specification.
 */
import { describe, it, expect } from 'vitest';
import { interpretMruby } from '@/utils/mrubyInterpreter';

// Helper: run code and return output (trimmed)
function run(code: string, input: string[] = []): string {
  const result = interpretMruby(code, input);
  return result.output;
}

// Helper: run code and expect no error
function runOk(code: string): string {
  const result = interpretMruby(code);
  expect(result.error).toBeUndefined();
  return result.output;
}

// ─── Integer (ISO 15.2.8) ────────────────────────────────────────────────────

describe('Integer#+ (15.2.8.3.1)', () => {
  it('adds two positive integers', () => {
    expect(run('puts 1 + 1')).toBe('2\n');
  });

  it('adds a positive and negative integer', () => {
    expect(run('puts 5 + (-3)')).toBe('2\n');
  });
});

describe('Integer#- (15.2.8.3.2)', () => {
  it('subtracts integers', () => {
    expect(run('puts 2 - 1')).toBe('1\n');
  });
});

describe('Integer#* (15.2.8.3.3)', () => {
  it('multiplies integers', () => {
    expect(run('puts 3 * 4')).toBe('12\n');
  });
});

describe('Integer#/ (15.2.8.3.4)', () => {
  it('divides integers with positive result', () => {
    expect(run('puts 2 / 1')).toBe('2\n');
    expect(run('puts 5 / 2')).toBe('2\n');
  });

  it('divides with floored result for negative operands', () => {
    // Ruby uses floored (not truncated) integer division
    expect(run('puts(-1 / 2)')).toBe('-1\n');
    expect(run('puts(1 / -2)')).toBe('-1\n');
    expect(run('puts(-7 / 2)')).toBe('-4\n');
    expect(run('puts(7 / -2)')).toBe('-4\n');
  });
});

describe('Integer#% (15.2.8.3.5)', () => {
  it('handles basic modulo', () => {
    expect(run('puts 1 % 1')).toBe('0\n');
    expect(run('puts 2 % 4')).toBe('2\n');
    expect(run('puts 2 % 5')).toBe('2\n');
  });

  it('handles modulo with negative operands (Ruby floored modulo)', () => {
    // Ruby modulo result has same sign as divisor
    expect(run('puts(2 % -5)')).toBe('-3\n');
    expect(run('puts(-2 % 5)')).toBe('3\n');
    expect(run('puts(-2 % -5)')).toBe('-2\n');
    expect(run('puts(2 % -2)')).toBe('0\n');
    expect(run('puts(-2 % 2)')).toBe('0\n');
    expect(run('puts(-2 % -2)')).toBe('0\n');
  });
});

describe('Integer#<=> (15.2.9.3.6)', () => {
  it('compares integers', () => {
    expect(run('puts(1 <=> 0)')).toBe('1\n');
    expect(run('puts(1 <=> 1)')).toBe('0\n');
    expect(run('puts(1 <=> 2)')).toBe('-1\n');
  });
});

describe('Integer#== (15.2.8.3.7)', () => {
  it('compares for equality', () => {
    expect(run('puts(1 == 0)')).toBe('false\n');
    expect(run('puts(1 == 1)')).toBe('true\n');
  });
});

describe('Integer#~ (15.2.8.3.8)', () => {
  it('computes bitwise complement', () => {
    expect(run('puts(~0)')).toBe('-1\n');
    expect(run('puts(~2)')).toBe('-3\n');
  });
});

describe('Integer#& (15.2.8.3.9)', () => {
  it('computes bitwise AND', () => {
    // 0101 (5) & 0011 (3) = 0001 (1)
    expect(run('puts(5 & 3)')).toBe('1\n');
    expect(run('puts(0 & 255)')).toBe('0\n');
    expect(run('puts(255 & 255)')).toBe('255\n');
  });
});

describe('Integer#| (15.2.8.3.10)', () => {
  it('computes bitwise OR', () => {
    // 0101 (5) | 0011 (3) = 0111 (7)
    expect(run('puts(5 | 3)')).toBe('7\n');
    expect(run('puts(0 | 0)')).toBe('0\n');
  });
});

describe('Integer#^ (15.2.8.3.11)', () => {
  it('computes bitwise XOR', () => {
    // 0101 (5) ^ 0011 (3) = 0110 (6)
    expect(run('puts(5 ^ 3)')).toBe('6\n');
    expect(run('puts(5 ^ 5)')).toBe('0\n');
  });
});

describe('Integer#<< (15.2.8.3.12)', () => {
  it('left shifts', () => {
    // 23 << 1 = 46
    expect(run('puts(23 << 1)')).toBe('46\n');
  });

  it('left shift by negative is right shift', () => {
    expect(run('puts(46 << -1)')).toBe('23\n');
  });
});

describe('Integer#>> (15.2.8.3.13)', () => {
  it('right shifts', () => {
    // 46 >> 1 = 23
    expect(run('puts(46 >> 1)')).toBe('23\n');
  });

  it('right shift by negative is left shift', () => {
    expect(run('puts(23 >> -1)')).toBe('46\n');
  });

  it('large right shift returns 0 for positive numbers', () => {
    expect(run('puts(23 >> 32)')).toBe('0\n');
  });
});

describe('Integer#ceil (15.2.8.3.14)', () => {
  it('returns self for integers', () => {
    expect(run('puts 10.ceil')).toBe('10\n');
  });
});

describe('Integer#downto (15.2.8.3.15)', () => {
  it('iterates from n down to target', () => {
    expect(run('a = 0\n3.downto(1) { |i| a += i }\nputs a')).toBe('6\n');
  });
});

describe('Integer#eql? (15.2.8.3.16)', () => {
  it('returns true for equal integers', () => {
    expect(run('puts 1.eql?(1)')).toBe('true\n');
  });

  it('returns false for different integers', () => {
    expect(run('puts 1.eql?(2)')).toBe('false\n');
  });

  it('returns false when comparing integer to nil', () => {
    expect(run('puts 1.eql?(nil)')).toBe('false\n');
  });
});

describe('Integer#floor (15.2.8.3.17)', () => {
  it('returns self for integers', () => {
    expect(run('puts 1.floor')).toBe('1\n');
  });
});

describe('Integer#next / Integer#succ (15.2.8.3.19/21)', () => {
  it('returns next integer', () => {
    expect(run('puts 1.next')).toBe('2\n');
    expect(run('puts 1.succ')).toBe('2\n');
  });
});

describe('Integer#round (15.2.8.3.20)', () => {
  it('returns self for integers', () => {
    expect(run('puts 1.round')).toBe('1\n');
  });
});

describe('Integer#times (15.2.8.3.22)', () => {
  it('iterates n times', () => {
    expect(run('a = 0\n3.times { a += 1 }\nputs a')).toBe('3\n');
  });
});

describe('Integer#to_i (15.2.8.3.24)', () => {
  it('returns self', () => {
    expect(run('puts 1.to_i')).toBe('1\n');
  });
});

describe('Integer#to_s (15.2.8.3.25)', () => {
  it('converts to decimal string by default', () => {
    expect(run('puts 1.to_s')).toBe('1\n');
    expect(run('puts((-1).to_s)')).toBe('-1\n');
  });

  it('converts to binary string', () => {
    expect(run('puts 10.to_s(2)')).toBe('1010\n');
  });

  it('converts to base-36 string', () => {
    expect(run('puts 10.to_s(36)')).toBe('a\n');
    expect(run('puts((-10).to_s(36))')).toBe('-a\n');
  });

  it('converts to octal string', () => {
    expect(run('puts 12345.to_s(8)')).toBe('30071\n');
  });
});

describe('Integer#truncate (15.2.8.3.26)', () => {
  it('returns self for integers', () => {
    expect(run('puts 1.truncate')).toBe('1\n');
  });
});

describe('Integer#upto (15.2.8.3.27)', () => {
  it('iterates from n up to target', () => {
    expect(run('a = 0\n1.upto(3) { |i| a += i }\nputs a')).toBe('6\n');
  });
});

describe('Integer#divmod (15.2.8.3.30)', () => {
  it('returns [quotient, remainder] with floored division', () => {
    expect(run('puts 0.divmod(1).inspect')).toBe('[0, 0]\n');
    expect(run('puts 1.divmod(3).inspect')).toBe('[0, 1]\n');
    expect(run('puts 3.divmod(1).inspect')).toBe('[3, 0]\n');
    expect(run('puts 20.divmod(7).inspect')).toBe('[2, 6]\n');
    expect(run('puts((-3).divmod(5).inspect)')).toBe('[-1, 2]\n');
    expect(run('puts 25.divmod(-13).inspect')).toBe('[-2, -1]\n');
    expect(run('puts((-13).divmod(-7).inspect)')).toBe('[1, -6]\n');
  });
});

describe('Integer other methods', () => {
  it('Integer#abs', () => {
    expect(run('puts(-5).abs')).toBe('5\n');
    expect(run('puts 5.abs')).toBe('5\n');
  });

  it('Integer#even?', () => {
    expect(run('puts 4.even?')).toBe('true\n');
    expect(run('puts 5.even?')).toBe('false\n');
  });

  it('Integer#odd?', () => {
    expect(run('puts 3.odd?')).toBe('true\n');
    expect(run('puts 4.odd?')).toBe('false\n');
  });

  it('Integer#zero?', () => {
    expect(run('puts 0.zero?')).toBe('true\n');
    expect(run('puts 1.zero?')).toBe('false\n');
  });

  it('Integer#positive?', () => {
    expect(run('puts 1.positive?')).toBe('true\n');
    expect(run('puts(-1).positive?')).toBe('false\n');
  });

  it('Integer#negative?', () => {
    expect(run('puts(-1).negative?')).toBe('true\n');
    expect(run('puts 1.negative?')).toBe('false\n');
  });

  it('Integer#gcd', () => {
    expect(run('puts 12.gcd(8)')).toBe('4\n');
    expect(run('puts 6.gcd(4)')).toBe('2\n');
  });

  it('Integer#lcm', () => {
    expect(run('puts 4.lcm(6)')).toBe('12\n');
  });

  it('Integer#digits', () => {
    expect(run('puts 123.digits.inspect')).toBe('[3, 2, 1]\n');
    expect(run('puts 0.digits.inspect')).toBe('[0]\n');
  });

  it('Integer#between?', () => {
    expect(run('puts 5.between?(1, 10)')).toBe('true\n');
    expect(run('puts 15.between?(1, 10)')).toBe('false\n');
  });

  it('Integer#pred', () => {
    expect(run('puts 5.pred')).toBe('4\n');
  });

  it('Integer#pow', () => {
    expect(run('puts 2.pow(10)')).toBe('1024\n');
  });
});

// ─── String (ISO 15.2.10) ────────────────────────────────────────────────────

describe('String#<=> (15.2.10.5.1)', () => {
  it('compares strings', () => {
    expect(run('puts("" <=> "")')).toBe('0\n');
    expect(run('puts("" <=> "not empty")')).toBe('-1\n');
    expect(run('puts("not empty" <=> "")')).toBe('1\n');
    expect(run('puts("abc" <=> "cba")')).toBe('-1\n');
    expect(run('puts("cba" <=> "abc")')).toBe('1\n');
  });
});

describe('String#== (15.2.10.5.2)', () => {
  it('compares strings for equality', () => {
    expect(run('puts("abc" == "abc")')).toBe('true\n');
    expect(run('puts("abc" == "cba")')).toBe('false\n');
  });
});

describe('String#+ (15.2.10.5.4)', () => {
  it('concatenates strings', () => {
    expect(run('puts "a" + "b"')).toBe('ab\n');
    expect(run('puts "hello" + " " + "world"')).toBe('hello world\n');
  });
});

describe('String#* (15.2.10.5.5)', () => {
  it('repeats a string', () => {
    expect(run('puts "a" * 5')).toBe('aaaaa\n');
    expect(run('puts "a" * 0')).toBe('\n');
    expect(run('puts "ab" * 3')).toBe('ababab\n');
  });
});

describe('String#capitalize (15.2.10.5.7)', () => {
  it('capitalizes first character and lowercases rest', () => {
    expect(run("puts 'abc'.capitalize")).toBe('Abc\n');
    expect(run("puts 'HELLO'.capitalize")).toBe('Hello\n');
    expect(run("puts ''.capitalize")).toBe('\n');
  });
});

describe('String#chomp (15.2.10.5.9)', () => {
  it('removes trailing newline', () => {
    expect(run('puts "abc".chomp')).toBe('abc\n');
    expect(run('puts "".chomp')).toBe('\n');
    expect(run('puts "abc\\n".chomp')).toBe('abc\n');
  });

  it('only removes one trailing newline', () => {
    expect(run('puts "abc\\n\\n".chomp')).toBe("abc\n\n");
  });
});

describe('String#downcase (15.2.10.5.13)', () => {
  it('converts to lowercase', () => {
    expect(run("puts 'ABC'.downcase")).toBe('abc\n');
    expect(run("puts 'Hello World'.downcase")).toBe('hello world\n');
  });
});

describe('String#empty? (15.2.10.5.16)', () => {
  it('returns true for empty string', () => {
    expect(run("puts ''.empty?")).toBe('true\n');
  });

  it('returns false for non-empty string', () => {
    expect(run("puts 'a'.empty?")).toBe('false\n');
  });
});

describe('String#include? (15.2.10.5.21)', () => {
  it('returns true when substring found', () => {
    expect(run("puts 'hello world'.include?('world')")).toBe('true\n');
  });

  it('returns false when substring not found', () => {
    expect(run("puts 'hello world'.include?('xyz')")).toBe('false\n');
  });
});

describe('String#length / String#size (15.2.10.5.26)', () => {
  it('returns the length of the string', () => {
    expect(run("puts 'abc'.length")).toBe('3\n');
    expect(run("puts ''.length")).toBe('0\n');
    expect(run("puts 'hello'.size")).toBe('5\n');
  });
});

describe('String#reverse (15.2.10.5.29)', () => {
  it('reverses a string', () => {
    expect(run("puts 'abc'.reverse")).toBe('cba\n');
    expect(run("puts ''.reverse")).toBe('\n');
  });
});

describe('String#split (15.2.10.5.31)', () => {
  it('splits on a separator', () => {
    expect(run("puts 'a,b,c'.split(',').inspect")).toBe('["a", "b", "c"]\n');
  });

  it('splits on empty string into chars', () => {
    expect(run("puts 'abc'.split('').inspect")).toBe('["a", "b", "c"]\n');
  });
});

describe('String#strip (15.2.10.5.37)', () => {
  it('removes leading and trailing whitespace', () => {
    expect(run('puts "  hello  ".strip')).toBe('hello\n');
    expect(run('puts "  hello".strip')).toBe('hello\n');
    expect(run('puts "hello  ".strip')).toBe('hello\n');
  });
});

describe('String#to_i (15.2.10.5.38)', () => {
  it('converts string to integer', () => {
    expect(run("puts '42'.to_i")).toBe('42\n');
    expect(run("puts '0'.to_i")).toBe('0\n');
    expect(run("puts 'abc'.to_i")).toBe('0\n');
  });
});

describe('String#to_s (15.2.10.5.39)', () => {
  it('returns self', () => {
    expect(run("puts 'hello'.to_s")).toBe('hello\n');
  });
});

describe('String#upcase (15.2.10.5.40)', () => {
  it('converts to uppercase', () => {
    expect(run("puts 'abc'.upcase")).toBe('ABC\n');
    expect(run("puts 'Hello World'.upcase")).toBe('HELLO WORLD\n');
  });
});

describe('String other methods', () => {
  it('String#swapcase', () => {
    expect(run("puts 'Hello'.swapcase")).toBe('hELLO\n');
    expect(run("puts 'hELLO'.swapcase")).toBe('Hello\n');
  });

  it('String#start_with?', () => {
    expect(run("puts 'hello'.start_with?('hel')")).toBe('true\n');
    expect(run("puts 'hello'.start_with?('world')")).toBe('false\n');
  });

  it('String#end_with?', () => {
    expect(run("puts 'hello'.end_with?('llo')")).toBe('true\n');
    expect(run("puts 'hello'.end_with?('world')")).toBe('false\n');
  });

  it('String#gsub', () => {
    expect(run("puts 'hello'.gsub('l', 'r')")).toBe('herro\n');
  });

  it('String#sub', () => {
    expect(run("puts 'hello'.sub('l', 'r')")).toBe('herlo\n');
  });

  it('String#chars returns array of chars', () => {
    expect(run("puts 'abc'.chars.inspect")).toBe('["a", "b", "c"]\n');
  });

  it('String#eql?', () => {
    expect(run("puts 'hello'.eql?('hello')")).toBe('true\n');
    expect(run("puts 'hello'.eql?('world')")).toBe('false\n');
  });

  it('String#lstrip', () => {
    expect(run("puts '  hello'.lstrip")).toBe('hello\n');
  });

  it('String#rstrip', () => {
    expect(run("puts 'hello  '.rstrip")).toBe('hello\n');
  });

  it('String#chop', () => {
    expect(run("puts 'hello'.chop")).toBe('hell\n');
    expect(run("puts ''.chop")).toBe('\n');
  });

  it('String#ord', () => {
    expect(run("puts 'A'.ord")).toBe('65\n');
    expect(run("puts 'a'.ord")).toBe('97\n');
  });

  it('String multiplication', () => {
    expect(run('puts "-" * 10')).toBe('----------\n');
  });
});

// ─── Array (ISO 15.2.12) ─────────────────────────────────────────────────────

describe('Array#+ (15.2.12.5.1)', () => {
  it('concatenates arrays', () => {
    expect(run('a = [1] + [1]\nputs a.inspect')).toBe('[1, 1]\n');
    expect(run('a = [1, 2] + [3, 4]\nputs a.inspect')).toBe('[1, 2, 3, 4]\n');
  });
});

describe('Array#<< (15.2.12.5.3)', () => {
  it('appends an element', () => {
    expect(run('a = [1]\na << 2\nputs a.inspect')).toBe('[1, 2]\n');
    expect(run('a = []\na << 1\na << 2\nputs a.inspect')).toBe('[1, 2]\n');
  });
});

describe('Array#[] (15.2.12.5.4)', () => {
  it('accesses elements by index', () => {
    expect(run('a = [1,2,3]\nputs a[0]')).toBe('1\n');
    expect(run('a = [1,2,3]\nputs a[1]')).toBe('2\n');
    expect(run('a = [1,2,3]\nputs a[-1]')).toBe('3\n');
    expect(run('a = [1,2,3]\nputs a[10].inspect')).toBe('nil\n');
  });
});

describe('Array#clear (15.2.12.5.6)', () => {
  it('empties the array', () => {
    expect(run('a = [1,2,3]\nb = a.clear\nputs b.inspect')).toBe('[]\n');
  });
});

describe('Array#collect! / map! (15.2.12.5.7)', () => {
  it('modifies elements in place', () => {
    expect(run('a = [1,2,3]\na.collect! { |i| i + i }\nputs a.inspect')).toBe('[2, 4, 6]\n');
    expect(run('a = [1,2,3]\na.map! { |i| i * 2 }\nputs a.inspect')).toBe('[2, 4, 6]\n');
  });
});

describe('Array#concat (15.2.12.5.8)', () => {
  it('appends elements from another array', () => {
    expect(run('puts [1,2].concat([3,4]).inspect')).toBe('[1, 2, 3, 4]\n');
  });
});

describe('Array#delete_at (15.2.12.5.9)', () => {
  it('deletes element at index', () => {
    const code = `a = [1,2,3]
b = a.delete_at(1)
puts b
puts a.inspect`;
    expect(run(code)).toBe('2\n[1, 3]\n');
  });

  it('returns nil for out-of-range index', () => {
    expect(run('a = [1,2,3]\nputs a.delete_at(5).inspect')).toBe('nil\n');
  });
});

describe('Array#each (15.2.12.5.10)', () => {
  it('iterates over elements', () => {
    const code = `a = [1,2,3]
b = 0
a.each { |i| b += i }
puts b`;
    expect(run(code)).toBe('6\n');
  });
});

describe('Array#each_index (15.2.12.5.11)', () => {
  it('iterates with indices', () => {
    const code = `a = [10,20,30]
result = []
a.each_index { |i| result << i }
puts result.inspect`;
    expect(run(code)).toBe('[0, 1, 2]\n');
  });
});

describe('Array#empty? (15.2.12.5.12)', () => {
  it('returns true for empty array', () => {
    expect(run('puts [].empty?')).toBe('true\n');
  });

  it('returns false for non-empty array', () => {
    expect(run('puts [1].empty?')).toBe('false\n');
  });
});

describe('Array#first (15.2.12.5.13)', () => {
  it('returns first element', () => {
    expect(run('puts [1,2,3].first')).toBe('1\n');
    expect(run('puts [].first.inspect')).toBe('nil\n');
  });

  it('returns first n elements as array', () => {
    expect(run('puts [1,2,3].first(2).inspect')).toBe('[1, 2]\n');
    expect(run('puts [1,2,3].first(0).inspect')).toBe('[]\n');
  });
});

describe('Array#index (15.2.12.5.14)', () => {
  it('returns index of element', () => {
    expect(run('puts [1,2,3].index(2)')).toBe('1\n');
    expect(run('puts [1,2,3].index(0).inspect')).toBe('nil\n');
  });
});

describe('Array#join (15.2.12.5.17)', () => {
  it('joins elements into string', () => {
    expect(run("puts [1,2,3].join")).toBe('123\n');
    expect(run("puts [1,2,3].join(',')")).toBe('1,2,3\n');
    expect(run("puts ['a','b','c'].join('-')")).toBe('a-b-c\n');
  });
});

describe('Array#last (15.2.12.5.18)', () => {
  it('returns last element', () => {
    expect(run('puts [1,2,3].last')).toBe('3\n');
    expect(run('puts [].last.inspect')).toBe('nil\n');
  });
});

describe('Array#length / Array#size (15.2.12.5.19/28)', () => {
  it('returns the number of elements', () => {
    expect(run('puts [1,2,3].length')).toBe('3\n');
    expect(run('puts [].size')).toBe('0\n');
  });
});

describe('Array#pop (15.2.12.5.21)', () => {
  it('removes and returns last element', () => {
    const code = `a = [1,2,3]
b = a.pop
puts b
puts a.inspect`;
    expect(run(code)).toBe('3\n[1, 2]\n');
  });

  it('returns nil for empty array', () => {
    expect(run('puts [].pop.inspect')).toBe('nil\n');
  });
});

describe('Array#push (15.2.12.5.22)', () => {
  it('appends element', () => {
    const code = `a = [1,2,3]
b = a.push(4)
puts a.inspect
puts b.inspect`;
    expect(run(code)).toBe('[1, 2, 3, 4]\n[1, 2, 3, 4]\n');
  });
});

describe('Array#replace (15.2.12.5.23)', () => {
  it('replaces contents with another array', () => {
    expect(run('puts [].replace([1,2,3]).inspect')).toBe('[1, 2, 3]\n');
  });
});

describe('Array#reverse (15.2.12.5.24)', () => {
  it('returns a reversed copy', () => {
    const code = `a = [1,2,3]
b = a.reverse
puts a.inspect
puts b.inspect`;
    expect(run(code)).toBe('[1, 2, 3]\n[3, 2, 1]\n');
  });
});

describe('Array#reverse! (15.2.12.5.25)', () => {
  it('reverses in place', () => {
    const code = `a = [1,2,3]
b = a.reverse!
puts a.inspect
puts b.inspect`;
    expect(run(code)).toBe('[3, 2, 1]\n[3, 2, 1]\n');
  });
});

describe('Array#rindex (15.2.12.5.26)', () => {
  it('returns last index of element', () => {
    expect(run('puts [1,2,3,2].rindex(2)')).toBe('3\n');
    expect(run('puts [1,2,3].rindex(0).inspect')).toBe('nil\n');
  });
});

describe('Array#shift (15.2.12.5.27)', () => {
  it('removes and returns first element', () => {
    const code = `a = [1,2,3]
b = a.shift
puts b
puts a.inspect`;
    expect(run(code)).toBe('1\n[2, 3]\n');
  });

  it('returns nil for empty array', () => {
    expect(run('puts [].shift.inspect')).toBe('nil\n');
  });
});

describe('Array#sort! (non-ISO)', () => {
  it('sorts the array in place', () => {
    const code = `a = [3, 1, 2]
a.sort!
puts a.inspect`;
    expect(run(code)).toBe('[1, 2, 3]\n');
  });
});

describe('Array#sort (non-ISO)', () => {
  it('returns a sorted copy', () => {
    const code = `a = [3, 1, 2]
b = a.sort
puts a.inspect
puts b.inspect`;
    expect(run(code)).toBe('[3, 1, 2]\n[1, 2, 3]\n');
  });
});

describe('Array#unshift (15.2.12.5.30)', () => {
  it('prepends elements', () => {
    expect(run('a = [2,3]\na.unshift(1)\nputs a.inspect')).toBe('[1, 2, 3]\n');
    expect(run('a = [2,3]\na.unshift(0, 1)\nputs a.inspect')).toBe('[0, 1, 2, 3]\n');
  });
});

describe('Array#== (15.2.12.5.33)', () => {
  it('compares arrays for equality', () => {
    expect(run('puts([1,2,3] == [1,2,3])')).toBe('true\n');
    expect(run('puts([1,2] == [1,2,3])')).toBe('false\n');
    expect(run('puts([1,2,3] == [1,2,4])')).toBe('false\n');
  });
});

describe('Array other methods', () => {
  it('Array#include?', () => {
    expect(run('puts [1,2,3].include?(2)')).toBe('true\n');
    expect(run('puts [1,2,3].include?(5)')).toBe('false\n');
  });

  it('Array#min and Array#max', () => {
    expect(run('puts [3,1,2].min')).toBe('1\n');
    expect(run('puts [3,1,2].max')).toBe('3\n');
  });

  it('Array#sum', () => {
    expect(run('puts [1,2,3,4,5].sum')).toBe('15\n');
  });

  it('Array#flatten', () => {
    expect(run('puts [1,[2,[3,4]],5].flatten.inspect')).toBe('[1, 2, 3, 4, 5]\n');
  });

  it('Array#compact', () => {
    expect(run('puts [1, nil, 2, nil, 3].compact.inspect')).toBe('[1, 2, 3]\n');
  });

  it('Array#uniq', () => {
    expect(run('puts [1,2,2,3,3,3].uniq.inspect')).toBe('[1, 2, 3]\n');
  });

  it('Array#take', () => {
    expect(run('puts [1,2,3,4,5].take(3).inspect')).toBe('[1, 2, 3]\n');
  });

  it('Array#drop', () => {
    expect(run('puts [1,2,3,4,5].drop(3).inspect')).toBe('[4, 5]\n');
  });

  it('Array#zip', () => {
    expect(run('puts [1,2,3].zip([4,5,6]).inspect')).toBe('[[1, 4], [2, 5], [3, 6]]\n');
  });

  it('Array#map with block', () => {
    expect(run('puts [1,2,3].map { |x| x * 2 }.inspect')).toBe('[2, 4, 6]\n');
  });

  it('Array#select with block', () => {
    expect(run('puts [1,2,3,4,5].select { |x| x.even? }.inspect')).toBe('[2, 4]\n');
  });

  it('Array#reject with block', () => {
    expect(run('puts [1,2,3,4,5].reject { |x| x.even? }.inspect')).toBe('[1, 3, 5]\n');
  });

  it('Array#reduce with block', () => {
    expect(run('puts [1,2,3,4,5].reduce { |acc, x| acc + x }')).toBe('15\n');
    expect(run('puts [1,2,3].reduce(10) { |acc, x| acc + x }')).toBe('16\n');
  });

  it('Array#any?', () => {
    expect(run('puts [1,2,3].any? { |x| x > 2 }')).toBe('true\n');
    expect(run('puts [1,2,3].any? { |x| x > 5 }')).toBe('false\n');
  });

  it('Array#all?', () => {
    expect(run('puts [2,4,6].all? { |x| x.even? }')).toBe('true\n');
    expect(run('puts [1,2,3].all? { |x| x.even? }')).toBe('false\n');
  });

  it('Array#none?', () => {
    expect(run('puts [1,3,5].none? { |x| x.even? }')).toBe('true\n');
    expect(run('puts [1,2,3].none? { |x| x.even? }')).toBe('false\n');
  });

  it('Array#find / detect', () => {
    expect(run('puts [1,2,3,4].find { |x| x > 2 }')).toBe('3\n');
    expect(run('puts [1,2,3].detect { |x| x > 10 }.inspect')).toBe('nil\n');
  });

  it('Array#flat_map', () => {
    expect(run('puts [1,2,3].flat_map { |x| [x, x * 2] }.inspect')).toBe('[1, 2, 2, 4, 3, 6]\n');
  });

  it('Array#count', () => {
    expect(run('puts [1,2,3].count')).toBe('3\n');
    expect(run('puts [1,2,3,2,1].count { |x| x == 2 }')).toBe('2\n');
  });
});

// ─── Hash ─────────────────────────────────────────────────────────────────────

describe('Hash basics', () => {
  it('creates hash with symbol keys', () => {
    const code = `h = {name: "Alice", age: 30}
puts h[:name]
puts h[:age]`;
    expect(run(code)).toBe('Alice\n30\n');
  });

  it('Hash#keys', () => {
    expect(run('h = {a: 1, b: 2}\nputs h.keys.inspect')).toBe('["a", "b"]\n');
  });

  it('Hash#values', () => {
    expect(run('h = {a: 1, b: 2}\nputs h.values.inspect')).toBe('[1, 2]\n');
  });

  it('Hash#size / Hash#length', () => {
    expect(run('h = {a: 1, b: 2, c: 3}\nputs h.size')).toBe('3\n');
    expect(run('h = {a: 1}\nputs h.length')).toBe('1\n');
  });

  it('Hash#empty?', () => {
    expect(run('puts({}.empty?)')).toBe('true\n');
    expect(run('puts({a: 1}.empty?)')).toBe('false\n');
  });

  it('Hash#has_key? / key? / include?', () => {
    expect(run('h = {a: 1}\nputs h.has_key?(:a)')).toBe('true\n');
    expect(run('h = {a: 1}\nputs h.key?(:b)')).toBe('false\n');
  });

  it('Hash#each', () => {
    const code = `h = {a: 1, b: 2}
keys = []
h.each { |k, v| keys << k }
puts keys.inspect`;
    expect(run(code)).toBe('["a", "b"]\n');
  });

  it('Hash#merge', () => {
    const code = `h1 = {a: 1, b: 2}
h2 = {b: 3, c: 4}
h3 = h1.merge(h2)
puts h3[:a]
puts h3[:b]
puts h3[:c]`;
    expect(run(code)).toBe('1\n3\n4\n');
  });

  it('Hash#delete', () => {
    const code = `h = {a: 1, b: 2}
v = h.delete(:a)
puts v
puts h.size`;
    expect(run(code)).toBe('1\n1\n');
  });

  it('Hash#fetch', () => {
    expect(run('h = {a: 1}\nputs h.fetch(:a)')).toBe('1\n');
  });

  it('Hash#store', () => {
    const code = `h = {}
h.store(:key, "value")
puts h[:key]`;
    expect(run(code)).toBe('value\n');
  });
});

// ─── Exception handling ───────────────────────────────────────────────────────

describe('begin/rescue/ensure', () => {
  it('rescues exceptions', () => {
    const code = `begin
  raise "test error"
rescue
  puts "rescued"
end`;
    expect(run(code)).toBe('rescued\n');
  });

  it('captures exception message with =>', () => {
    const code = `begin
  raise "oops"
rescue => e
  puts e
end`;
    expect(run(code)).toBe('oops\n');
  });

  it('runs ensure block after rescue', () => {
    const code = `begin
  raise "oops"
rescue
  puts "rescued"
ensure
  puts "ensured"
end`;
    expect(run(code)).toBe('rescued\nensured\n');
  });

  it('runs ensure block without rescue (no exception)', () => {
    const code = `begin
  puts "try"
ensure
  puts "ensured"
end`;
    expect(run(code)).toBe('try\nensured\n');
  });

  it('custom exception class check', () => {
    const code = `def divide(a, b)
  raise "zero division" if b == 0
  a / b
end

begin
  puts divide(10, 2)
  puts divide(10, 0)
rescue => e
  puts "Error: #{e}"
end
puts "done"`;
    expect(run(code)).toBe('5\nError: zero division\ndone\n');
  });
});

// ─── Control flow ─────────────────────────────────────────────────────────────

describe('if/elsif/else', () => {
  it('evaluates if branch', () => {
    expect(run('if true\n  puts "yes"\nend')).toBe('yes\n');
  });

  it('evaluates else branch', () => {
    expect(run('if false\n  puts "yes"\nelse\n  puts "no"\nend')).toBe('no\n');
  });

  it('evaluates elsif branch', () => {
    const code = `score = 75
if score >= 90
  puts "優"
elsif score >= 70
  puts "良"
else
  puts "不可"
end`;
    expect(run(code)).toBe('良\n');
  });
});

describe('unless', () => {
  it('runs body when condition is false', () => {
    expect(run('unless false\n  puts "yes"\nend')).toBe('yes\n');
  });

  it('does not run body when condition is true', () => {
    expect(run('unless true\n  puts "yes"\nend')).toBe('');
  });
});

describe('case/when', () => {
  it('matches when clause', () => {
    const code = `x = 2
case x
when 1
  puts "one"
when 2
  puts "two"
else
  puts "other"
end`;
    expect(run(code)).toBe('two\n');
  });

  it('matches else clause', () => {
    const code = `x = 5
case x
when 1
  puts "one"
when 2
  puts "two"
else
  puts "other"
end`;
    expect(run(code)).toBe('other\n');
  });
});

describe('while', () => {
  it('iterates while condition is true', () => {
    const code = `i = 0
while i < 3
  puts i
  i += 1
end`;
    expect(run(code)).toBe('0\n1\n2\n');
  });
});

describe('for loop', () => {
  it('iterates over array', () => {
    const code = `result = []
for x in [1, 2, 3]
  result << x * 2
end
puts result.inspect`;
    expect(run(code)).toBe('[2, 4, 6]\n');
  });
});

describe('loop with break', () => {
  it('breaks when condition met', () => {
    const code = `i = 0
loop do
  i += 1
  break if i >= 3
end
puts i`;
    expect(run(code)).toBe('3\n');
  });
});

// ─── Methods ──────────────────────────────────────────────────────────────────

describe('def / methods', () => {
  it('defines and calls a simple method', () => {
    const code = `def greet(name)
  puts "Hello, #{name}!"
end
greet("World")`;
    expect(run(code)).toBe('Hello, World!\n');
  });

  it('supports default parameters', () => {
    const code = `def greet(name = "World")
  puts "Hello, #{name}!"
end
greet
greet("Ruby")`;
    expect(run(code)).toBe('Hello, World!\nHello, Ruby!\n');
  });

  it('supports recursive methods', () => {
    const code = `def factorial(n)
  return 1 if n <= 1
  n * factorial(n - 1)
end
puts factorial(5)`;
    expect(run(code)).toBe('120\n');
  });

  it('supports early return', () => {
    const code = `def check(n)
  return "negative" if n < 0
  return "zero" if n == 0
  "positive"
end
puts check(-1)
puts check(0)
puts check(1)`;
    expect(run(code)).toBe('negative\nzero\npositive\n');
  });
});

// ─── Classes ──────────────────────────────────────────────────────────────────

describe('Class basics', () => {
  it('creates instances with initialize', () => {
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
    expect(run(code)).toBe('Rex says Woof!\n');
  });

  it('supports attr_accessor', () => {
    const code = `class Person
  attr_accessor :name, :age
end
p = Person.new
p.name = "Alice"
p.age = 30
puts p.name
puts p.age`;
    expect(run(code)).toBe('Alice\n30\n');
  });

  it('supports attr_reader', () => {
    const code = `class Dog
  attr_reader :name
  def initialize(name)
    @name = name
  end
end
d = Dog.new("Rex")
puts d.name`;
    expect(run(code)).toBe('Rex\n');
  });

  it('supports class inheritance', () => {
    const code = `class Animal
  def initialize(name)
    @name = name
  end
  def speak
    "#{@name} makes a sound"
  end
end
class Dog < Animal
  def speak
    super + " - Woof!"
  end
end
d = Dog.new("Rex")
puts d.speak`;
    expect(run(code)).toBe('Rex makes a sound - Woof!\n');
  });

  it('supports super in initialize', () => {
    const code = `class Animal
  def initialize(name)
    @name = name
  end
  def name
    @name
  end
end
class Dog < Animal
  def initialize(name, breed)
    super(name)
    @breed = breed
  end
  def info
    "#{@name} (#{@breed})"
  end
end
d = Dog.new("Rex", "Labrador")
puts d.info`;
    expect(run(code)).toBe('Rex (Labrador)\n');
  });
});

// ─── Modules ──────────────────────────────────────────────────────────────────

describe('Math module', () => {
  it('Math.sqrt', () => {
    expect(run('puts Math.sqrt(16)')).toBe('4\n');
    expect(run('puts Math.sqrt(9)')).toBe('3\n');
  });

  it('Math::PI', () => {
    expect(run('puts Math::PI.round(5)')).toBe('3.14159\n');
  });
});

// ─── Kernel methods ───────────────────────────────────────────────────────────

describe('puts / print / p', () => {
  it('puts with no args outputs blank line', () => {
    expect(run('puts')).toBe('\n');
  });

  it('puts with nil outputs blank line', () => {
    expect(run('puts nil')).toBe('\n');
  });

  it('puts with array outputs each element', () => {
    expect(run('puts [1,2,3]')).toBe('1\n2\n3\n');
  });

  it('print does not add newline', () => {
    expect(run('print "hello"\nprint " world"')).toBe('hello world');
  });

  it('p outputs inspect form', () => {
    expect(run('p "hello"')).toBe('"hello"\n');
    expect(run('p 42')).toBe('42\n');
    expect(run('p nil')).toBe('nil\n');
    expect(run('p [1,2,3]')).toBe('[1, 2, 3]\n');
  });
});

// ─── nil / true / false ───────────────────────────────────────────────────────

describe('nil methods', () => {
  it('nil.nil? returns true', () => {
    expect(run('puts nil.nil?')).toBe('true\n');
  });

  it('nil.to_s returns empty string', () => {
    expect(run('puts nil.to_s.inspect')).toBe('""\n');
  });

  it('nil.to_a returns empty array', () => {
    expect(run('puts nil.to_a.inspect')).toBe('[]\n');
  });

  it('nil.to_i returns 0', () => {
    expect(run('puts nil.to_i')).toBe('0\n');
  });

  it('nil.inspect returns "nil"', () => {
    expect(run('puts nil.inspect')).toBe('nil\n');
  });
});

describe('true/false methods', () => {
  it('true.to_s returns "true"', () => {
    expect(run('puts true.to_s')).toBe('true\n');
  });

  it('false.to_s returns "false"', () => {
    expect(run('puts false.to_s')).toBe('false\n');
  });

  it('true.nil? returns false', () => {
    expect(run('puts true.nil?')).toBe('false\n');
  });

  it('false.nil? returns false', () => {
    expect(run('puts false.nil?')).toBe('false\n');
  });
});

// ─── Practical programs ───────────────────────────────────────────────────────

describe('Practical mruby programs', () => {
  it('FizzBuzz (1-15)', () => {
    const code = `1.upto(15) do |i|
  if i % 15 == 0
    puts "FizzBuzz"
  elsif i % 3 == 0
    puts "Fizz"
  elsif i % 5 == 0
    puts "Buzz"
  else
    puts i
  end
end`;
    expect(run(code)).toBe(
      '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n'
    );
  });

  it('Fibonacci sequence', () => {
    const code = `def fib(n)
  return n if n <= 1
  fib(n - 1) + fib(n - 2)
end
0.upto(7) { |i| puts fib(i) }`;
    expect(run(code)).toBe('0\n1\n1\n2\n3\n5\n8\n13\n');
  });

  it('Bubble sort', () => {
    const code = `arr = [64, 34, 25, 12, 22, 11, 90]
n = arr.length
(n - 1).times do |i|
  (n - i - 1).times do |j|
    if arr[j] > arr[j + 1]
      arr[j], arr[j + 1] = arr[j + 1], arr[j]
    end
  end
end
puts arr.inspect`;
    expect(run(code)).toBe('[11, 12, 22, 25, 34, 64, 90]\n');
  });

  it('Word count using hash', () => {
    const code = `text = "apple banana apple cherry banana apple"
counts = {}
text.split(" ").each do |word|
  counts[word] = (counts[word] || 0) + 1
end
counts.each { |word, count| puts "#{word}: #{count}" }`;
    expect(run(code)).toBe('apple: 3\nbanana: 2\ncherry: 1\n');
  });

  it('Stack class', () => {
    const code = `class Stack
  def initialize
    @data = []
  end
  def push(val)
    @data.push(val)
  end
  def pop
    @data.pop
  end
  def peek
    @data[@data.length - 1]
  end
  def empty?
    @data.length == 0
  end
  def size
    @data.length
  end
end

s = Stack.new
s.push(1)
s.push(2)
s.push(3)
puts s.peek
puts s.pop
puts s.size`;
    expect(run(code)).toBe('3\n3\n2\n');
  });

  it('binary search', () => {
    const code = `def binary_search(arr, target)
  low = 0
  high = arr.length - 1
  while low <= high
    mid = (low + high) / 2
    if arr[mid] == target
      return mid
    elsif arr[mid] < target
      low = mid + 1
    else
      high = mid - 1
    end
  end
  -1
end

arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
puts binary_search(arr, 23)
puts binary_search(arr, 100)`;
    expect(run(code)).toBe('5\n-1\n');
  });
});

import { describe, it, expect } from 'vitest';
import { interpretMruby } from '@/utils/mrubyInterpreter';

const samples = [
  { name: 'Hello World', code: 'puts "Hello, mruby!"', expected: 'Hello, mruby!\n' },
  { name: '変数と文字列補間', code: 'name = "mruby"\nversion = 3\nputs "#{name} version #{version}"', expected: 'mruby version 3\n' },
  { name: '四則演算', code: 'a = 10\nb = 3\nputs "#{a} + #{b} = #{a + b}"\nputs "#{a} - #{b} = #{a - b}"\nputs "#{a} * #{b} = #{a * b}"\nputs "#{a} / #{b} = #{a / b}"\nputs "#{a} % #{b} = #{a % b}"\nputs "#{a} ** #{b} = #{a ** b}"', expected: '10 + 3 = 13\n10 - 3 = 7\n10 * 3 = 30\n10 / 3 = 3\n10 % 3 = 1\n10 ** 3 = 1000\n' },
  { name: '条件分岐', code: 'score = 75\n\nif score >= 90\n  puts "優"\nelsif score >= 70\n  puts "良"\nelsif score >= 60\n  puts "可"\nelse\n  puts "不可"\nend', expected: '良\n' },
  { name: 'timesループ', code: '5.times do |i|\n  puts "Step #{i + 1}"\nend', expected: 'Step 1\nStep 2\nStep 3\nStep 4\nStep 5\n' },
  { name: 'whileループ', code: 'n = 1\nwhile n <= 5\n  puts n\n  n += 1\nend', expected: '1\n2\n3\n4\n5\n' },
  { name: 'upto/downto', code: '1.upto(5) { |i| puts "up: #{i}" }\n5.downto(1) { |i| puts "down: #{i}" }', expected: 'up: 1\nup: 2\nup: 3\nup: 4\nup: 5\ndown: 5\ndown: 4\ndown: 3\ndown: 2\ndown: 1\n' },
  { name: 'FizzBuzz', code: '1.upto(20) do |i|\n  if i % 15 == 0\n    puts "FizzBuzz"\n  elsif i % 3 == 0\n    puts "Fizz"\n  elsif i % 5 == 0\n    puts "Buzz"\n  else\n    puts i\n  end\nend', expected: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\n' },
  { name: '配列の基本', code: 'fruits = ["apple", "banana", "cherry"]\nputs fruits[0]\nputs fruits.length\nfruits.each { |f| puts f }\nputs fruits.map { |f| f.upcase }.inspect', expected: 'apple\n3\napple\nbanana\ncherry\n["APPLE", "BANANA", "CHERRY"]\n' },
  { name: '配列フィルタ', code: 'nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\nevens = nums.select { |n| n % 2 == 0 }\nsquares = nums.map { |n| n * n }\nputs "偶数: #{evens.inspect}"\nputs "二乗: #{squares.inspect}"\nputs "合計: #{nums.sum}"', expected: '偶数: [2, 4, 6, 8, 10]\n二乗: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]\n合計: 55\n' },
  { name: 'バブルソート', code: 'arr = [64, 34, 25, 12, 22, 11, 90]\nn = arr.length\n\n(n - 1).times do |i|\n  (n - i - 1).times do |j|\n    if arr[j] > arr[j + 1]\n      arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    end\n  end\nend\n\nputs arr.inspect', expected: '[11, 12, 22, 25, 34, 64, 90]\n' },
  { name: 'ハッシュの基本', code: 'person = { name: "Alice", age: 30, city: "Tokyo" }\nputs person[:name]\nputs person[:age]\nperson.each do |key, value|\n  puts "#{key}: #{value}"\nend', expected: 'Alice\n30\nname: Alice\nage: 30\ncity: Tokyo\n' },
  { name: '単語カウント', code: 'text = "apple banana apple cherry banana apple"\ncounts = {}\ntext.split(" ").each do |word|\n  counts[word] = (counts[word] || 0) + 1\nend\ncounts.each { |word, count| puts "#{word}: #{count}" }', expected: 'apple: 3\nbanana: 2\ncherry: 1\n' },
  { name: 'メソッド定義', code: 'def factorial(n)\n  return 1 if n <= 1\n  n * factorial(n - 1)\nend\n\n1.upto(10) { |i| puts "#{i}! = #{factorial(i)}" }', expected: '1! = 1\n2! = 2\n3! = 6\n4! = 24\n5! = 120\n6! = 720\n7! = 5040\n8! = 40320\n9! = 362880\n10! = 3628800\n' },
  { name: 'フィボナッチ数列', code: 'def fib(n)\n  return n if n <= 1\n  fib(n - 1) + fib(n - 2)\nend\n\n0.upto(10) { |i| puts "fib(#{i}) = #{fib(i)}" }', expected: 'fib(0) = 0\nfib(1) = 1\nfib(2) = 1\nfib(3) = 2\nfib(4) = 3\nfib(5) = 5\nfib(6) = 8\nfib(7) = 13\nfib(8) = 21\nfib(9) = 34\nfib(10) = 55\n' },
  { name: 'クラスの基本', code: 'class Animal\n  def initialize(name, sound)\n    @name = name\n    @sound = sound\n  end\n\n  def speak\n    puts "#{@name} says #{@sound}!"\n  end\nend\n\ndog = Animal.new("Dog", "Woof")\ncat = Animal.new("Cat", "Meow")\ndog.speak\ncat.speak', expected: 'Dog says Woof!\nCat says Meow!\n' },
  { name: 'スタッククラス', code: 'class Stack\n  def initialize\n    @data = []\n  end\n\n  def push(val)\n    @data.push(val)\n  end\n\n  def pop\n    @data.pop\n  end\n\n  def peek\n    @data[@data.length - 1]\n  end\n\n  def empty?\n    @data.length == 0\n  end\n\n  def size\n    @data.length\n  end\nend\n\ns = Stack.new\ns.push(1)\ns.push(2)\ns.push(3)\nputs s.peek\nputs s.pop\nputs s.size', expected: '3\n3\n2\n' },
  { name: 'エラー処理', code: 'def divide(a, b)\n  raise "ゼロ除算エラー" if b == 0\n  a / b\nend\n\nbegin\n  puts divide(10, 2)\n  puts divide(10, 0)\nrescue => e\n  puts "エラー: #{e}"\nend\nputs "プログラム継続"', expected: '5\nエラー: ゼロ除算エラー\nプログラム継続\n' },
  { name: '素数判定', code: 'def prime?(n)\n  return false if n < 2\n  2.upto(n - 1) do |i|\n    return false if n % i == 0\n  end\n  true\nend\n\nprimes = []\n2.upto(100) do |n|\n  primes.push(n) if prime?(n)\nend\nputs primes.inspect\nputs "100以下の素数: #{primes.length}個"', expected: null },
  { name: '二分探索', code: 'def binary_search(arr, target)\n  low = 0\n  high = arr.length - 1\n\n  while low <= high\n    mid = (low + high) / 2\n    if arr[mid] == target\n      return mid\n    elsif arr[mid] < target\n      low = mid + 1\n    else\n      high = mid - 1\n    end\n  end\n  -1\nend\n\narr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\nputs binary_search(arr, 23)\nputs binary_search(arr, 100)', expected: '5\n-1\n' },
];

describe('Sample code snippets', () => {
  for (const sample of samples) {
    it(sample.name, () => {
      const result = interpretMruby(sample.code);
      expect(result.error).toBeUndefined();
      if (sample.expected) {
        expect(result.output).toBe(sample.expected);
      }
    });
  }
});

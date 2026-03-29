export const formatCode = (code: string): string => {
  return code
    .split('\n')
    .map((line) => {
      return line.trim() ? line : '';
    })
    .join('\n');
};

export interface CodeSnippet {
  name: string;
  description: string;
  code: string;
  category: string;
}

export const getCodeSnippets = (): CodeSnippet[] => [
  // 基本
  {
    name: 'Hello World',
    description: '最初の一歩',
    category: '基本',
    code: 'puts "Hello, mruby!"'
  },
  {
    name: '変数と文字列補間',
    description: '変数と #{} を使った文字列',
    category: '基本',
    code: 'name = "mruby"\nversion = 3\nputs "#{name} version #{version}"'
  },
  {
    name: '四則演算',
    description: '基本的な算術演算',
    category: '基本',
    code: 'a = 10\nb = 3\nputs "#{a} + #{b} = #{a + b}"\nputs "#{a} - #{b} = #{a - b}"\nputs "#{a} * #{b} = #{a * b}"\nputs "#{a} / #{b} = #{a / b}"\nputs "#{a} % #{b} = #{a % b}"\nputs "#{a} ** #{b} = #{a ** b}"'
  },
  {
    name: '条件分岐',
    description: 'if/elsif/else の使い方',
    category: '基本',
    code: 'score = 75\n\nif score >= 90\n  puts "優"\nelsif score >= 70\n  puts "良"\nelsif score >= 60\n  puts "可"\nelse\n  puts "不可"\nend'
  },
  // ループ
  {
    name: 'timesループ',
    description: 'N回繰り返す',
    category: 'ループ',
    code: '5.times do |i|\n  puts "Step #{i + 1}"\nend'
  },
  {
    name: 'whileループ',
    description: 'while 条件 do...end',
    category: 'ループ',
    code: 'n = 1\nwhile n <= 5\n  puts n\n  n += 1\nend'
  },
  {
    name: 'upto / downto',
    description: '範囲ループ',
    category: 'ループ',
    code: '1.upto(5) { |i| puts "up: #{i}" }\n5.downto(1) { |i| puts "down: #{i}" }'
  },
  {
    name: 'FizzBuzz',
    description: '定番アルゴリズム問題',
    category: 'ループ',
    code: '1.upto(20) do |i|\n  if i % 15 == 0\n    puts "FizzBuzz"\n  elsif i % 3 == 0\n    puts "Fizz"\n  elsif i % 5 == 0\n    puts "Buzz"\n  else\n    puts i\n  end\nend'
  },
  // 配列
  {
    name: '配列の基本',
    description: '配列の作成・アクセス・メソッド',
    category: '配列',
    code: 'fruits = ["apple", "banana", "cherry"]\nputs fruits[0]\nputs fruits.length\nfruits.each { |f| puts f }\nputs fruits.map { |f| f.upcase }.inspect'
  },
  {
    name: '配列フィルタ',
    description: 'select / map / sum',
    category: '配列',
    code: 'nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\nevens = nums.select { |n| n % 2 == 0 }\nsquares = nums.map { |n| n * n }\nputs "偶数: #{evens.inspect}"\nputs "二乗: #{squares.inspect}"\nputs "合計: #{nums.sum}"'
  },
  {
    name: 'バブルソート',
    description: '配列を手動でソート',
    category: '配列',
    code: 'arr = [64, 34, 25, 12, 22, 11, 90]\nn = arr.length\n\n(n - 1).times do |i|\n  (n - i - 1).times do |j|\n    if arr[j] > arr[j + 1]\n      arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    end\n  end\nend\n\nputs arr.inspect'
  },
  // ハッシュ
  {
    name: 'ハッシュの基本',
    description: 'ハッシュの作成・アクセス',
    category: 'ハッシュ',
    code: 'person = { name: "Alice", age: 30, city: "Tokyo" }\nputs person[:name]\nputs person[:age]\nperson.each do |key, value|\n  puts "#{key}: #{value}"\nend'
  },
  {
    name: '単語カウント',
    description: '文字列の単語を集計',
    category: 'ハッシュ',
    code: 'text = "apple banana apple cherry banana apple"\ncounts = {}\ntext.split(" ").each do |word|\n  counts[word] = (counts[word] || 0) + 1\nend\ncounts.each { |word, count| puts "#{word}: #{count}" }'
  },
  // メソッド
  {
    name: 'メソッド定義',
    description: 'def/end でメソッドを定義',
    category: 'メソッド',
    code: 'def factorial(n)\n  return 1 if n <= 1\n  n * factorial(n - 1)\nend\n\n1.upto(10) { |i| puts "#{i}! = #{factorial(i)}" }'
  },
  {
    name: 'フィボナッチ数列',
    description: '再帰的なフィボナッチ',
    category: 'メソッド',
    code: 'def fib(n)\n  return n if n <= 1\n  fib(n - 1) + fib(n - 2)\nend\n\n0.upto(10) { |i| puts "fib(#{i}) = #{fib(i)}" }'
  },
  // クラス
  {
    name: 'クラスの基本',
    description: 'クラス・インスタンス変数・メソッド',
    category: 'クラス',
    code: 'class Animal\n  def initialize(name, sound)\n    @name = name\n    @sound = sound\n  end\n\n  def speak\n    puts "#{@name} says #{@sound}!"\n  end\nend\n\ndog = Animal.new("Dog", "Woof")\ncat = Animal.new("Cat", "Meow")\ndog.speak\ncat.speak'
  },
  {
    name: 'スタッククラス',
    description: 'スタックデータ構造の実装',
    category: 'クラス',
    code: 'class Stack\n  def initialize\n    @data = []\n  end\n\n  def push(val)\n    @data.push(val)\n  end\n\n  def pop\n    @data.pop\n  end\n\n  def peek\n    @data[@data.length - 1]\n  end\n\n  def empty?\n    @data.length == 0\n  end\n\n  def size\n    @data.length\n  end\nend\n\ns = Stack.new\ns.push(1)\ns.push(2)\ns.push(3)\nputs s.peek\nputs s.pop\nputs s.size'
  },
  // エラー処理
  {
    name: 'エラー処理',
    description: 'begin/rescue/end でエラーをキャッチ',
    category: 'エラー処理',
    code: 'def divide(a, b)\n  raise "ゼロ除算エラー" if b == 0\n  a / b\nend\n\nbegin\n  puts divide(10, 2)\n  puts divide(10, 0)\nrescue => e\n  puts "エラー: #{e}"\nend\nputs "プログラム継続"'
  },
  // アルゴリズム
  {
    name: '素数判定',
    description: '100以下の素数を列挙',
    category: 'アルゴリズム',
    code: 'def prime?(n)\n  return false if n < 2\n  2.upto(n - 1) do |i|\n    return false if n % i == 0\n  end\n  true\nend\n\nprimes = []\n2.upto(100) do |n|\n  primes.push(n) if prime?(n)\nend\nputs primes.inspect\nputs "100以下の素数: #{primes.length}個"'
  },
  {
    name: '二分探索',
    description: 'ソート済み配列から値を検索',
    category: 'アルゴリズム',
    code: 'def binary_search(arr, target)\n  low = 0\n  high = arr.length - 1\n\n  while low <= high\n    mid = (low + high) / 2\n    if arr[mid] == target\n      return mid\n    elsif arr[mid] < target\n      low = mid + 1\n    else\n      high = mid - 1\n    end\n  end\n  -1\nend\n\narr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\nputs binary_search(arr, 23)\nputs binary_search(arr, 100)'
  }
];

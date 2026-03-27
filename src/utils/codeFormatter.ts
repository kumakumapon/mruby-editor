export const formatCode = (code: string): string => {
  return code
    .split('\n')
    .map((line) => {
      return line.trim() ? line : '';
    })
    .join('\n');
};

export const getCodeSnippets = () => [
  {
    name: 'Hello World',
    code: 'puts "Hello, mruby!"'
  },
  {
    name: 'Loop',
    code: '5.times { |i| puts i }'
  },
  {
    name: 'Array',
    code: 'arr = [1, 2, 3]\nputs arr.sum'
  },
  {
    name: 'Hash',
    code: 'h = {name: "mruby", version: 3}\nputs h[:name]'
  },
  {
    name: 'Method',
    code: 'def greet(name)\n  puts "Hello, #{name}!"\nend\ngreet("World")'
  }
];

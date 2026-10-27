import { childrenNamed, parseNginx, tokenize } from '../../nginx.parse';

describe('tokenize', () => {
  it('splits words and structure, dropping comments', () => {
    expect(tokenize('server { listen 80; # a comment\n server_name a.com; }')).toEqual(['server', '{', 'listen', '80', ';', 'server_name', 'a.com', ';', '}']);
  });

  it('keeps quoted words whole, braces inside quotes included, and a hash inside a word', () => {
    expect(tokenize('add_header X "a { b"; set $x \'y;z\'; location /a#b {')).toEqual([
      'add_header', 'X', '"a { b"', ';', 'set', '$x', "'y;z'", ';', 'location', '/a#b', '{',
    ]);
  });
});

describe('parseNginx', () => {
  it('builds directives with their words and nested blocks', () => {
    const tree = parseNginx(`
      upstream api { server 127.0.0.1:4000; }
      server {
        listen 443 ssl;
        server_name "a.example.com" b.example.com;
        location / { proxy_pass http://api; }
      }
    `);
    expect(tree).toEqual([
      { name: 'upstream', args: ['api'], block: [{ name: 'server', args: ['127.0.0.1:4000'], block: null }] },
      {
        name: 'server', args: [],
        block: [
          { name: 'listen', args: ['443', 'ssl'], block: null },
          { name: 'server_name', args: ['a.example.com', 'b.example.com'], block: null },
          { name: 'location', args: ['/'], block: [{ name: 'proxy_pass', args: ['http://api'], block: null }] },
        ],
      },
    ]);
  });

  it('keeps an empty directive out of the tree', () => {
    expect(parseNginx(';; { }')).toEqual([]);
    expect(parseNginx('')).toEqual([]);
  });

  it('ignores an unbalanced closing brace, so a half-written file still maps', () => {
    expect(parseNginx('} } a b; }')).toEqual([{ name: 'a', args: ['b'], block: null }]);
  });

  it('keeps what it has when a block is never closed', () => {
    expect(parseNginx('server { listen 80;')).toEqual([{ name: 'server', args: [], block: [{ name: 'listen', args: ['80'], block: null }] }]);
  });

  it('unquotes single and double quoted words, and leaves a lone quote character as it is', () => {
    expect(parseNginx(`x 'a b' "c d";`)[0].args).toEqual(['a b', 'c d']);
  });
});

describe('childrenNamed', () => {
  const tree = parseNginx('a 1; b 2; a 3;');

  it('returns the direct children of that name in order', () => {
    expect(childrenNamed(tree, 'a').map((d) => d.args[0])).toEqual(['1', '3']);
    expect(childrenNamed(tree, 'zzz')).toEqual([]);
  });

  it('treats a missing block as empty', () => {
    expect(childrenNamed(null, 'a')).toEqual([]);
  });
});

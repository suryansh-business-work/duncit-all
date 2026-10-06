const parseAstro = jest.fn();
jest.mock('@astrojs/compiler-rs', () => ({ parse: (source: string) => parseAstro(source) }));

const parseJs = jest.fn();
jest.mock('acorn', () => {
  const actual = jest.requireActual('acorn');
  parseJs.mockImplementation(actual.parse);
  return { ...actual, parse: (...args: unknown[]) => parseJs(...args) };
});

const compileString = jest.fn();
jest.mock('sass', () => {
  const actual = jest.requireActual('sass');
  compileString.mockImplementation(actual.compileString);
  return { ...actual, compileString: (...args: unknown[]) => compileString(...args) };
});

import {
  assertValid,
  compileScss,
  compileScssOrRaw,
  componentScope,
  scopedScript,
  validateCode,
} from '../../cmsCode.service';

const astro = (ast: unknown, diagnostics: unknown[] = []) => parseAstro.mockReturnValueOnce({ ast, diagnostics });

beforeEach(() => {
  parseAstro.mockReset();
  parseJs.mockImplementation(jest.requireActual('acorn').parse);
  compileString.mockImplementation(jest.requireActual('sass').compileString);
});

afterEach(() => jest.restoreAllMocks());

describe('compileScss', () => {
  it('compiles SCSS — variables, nesting — to compressed CSS', () => {
    expect(compileScss('$c: red;\n.card { .title { color: $c; } }')).toBe('.card .title{color:red}');
  });

  it('returns nothing for an empty stylesheet', () => {
    expect(compileScss('   \n')).toBe('');
  });

  it('scopes every rule of a component, media queries included', () => {
    const css = compileScss('.card { width: 1px; @media (max-width: 600px) { width: 2px; } }', componentScope('hero'));
    expect(css).toBe('[data-cms-fragment=hero] .card{width:1px}@media(max-width: 600px){[data-cms-fragment=hero] .card{width:2px}}');
  });

  it('lifts @keyframes and @font-face out of the scope, where CSS needs them', () => {
    const css = compileScss('@keyframes spin { to { opacity: 0 } }\n@font-face { font-family: X; src: url(x.woff2) }', componentScope('k'));
    expect(css).toContain('@keyframes spin{to{opacity:0}}');
    expect(css).toContain('@font-face{font-family:X;src:url(x.woff2)}');
    expect(css).not.toContain('[data-cms-fragment=k] @keyframes');
  });

  it('keeps @use at the top of a scoped stylesheet', () => {
    const css = compileScss('@use "sass:math";\n.a { width: math.div(10px, 2) }', componentScope('k'));
    expect(css).toBe('[data-cms-fragment=k] .a{width:5px}');
  });

  it('names the author’s own line when a scoped stylesheet is invalid', () => {
    expect(() => compileScss('.a {\n  color: ;\n}', componentScope('k'))).toThrow('SCSS line 2, column 10: Expected expression.');
  });

  it('names the line in an unscoped stylesheet with a module rule above the error', () => {
    expect(() => compileScss('@use "sass:math";\n.a { color: ; }', componentScope('k'))).toThrow('SCSS line 2');
  });

  it('reports an error on a hoisted @use line as line 1, never above the first line', () => {
    expect(() => compileScss('@use "sass:nope";\n.a { color: red }', componentScope('k'))).toThrow(/^SCSS line 1,/);
  });

  it('caches by source and scope: the same input compiles once', () => {
    const first = compileScss('.cached { color: blue }', componentScope('one'));
    expect(compileScss('.cached { color: blue }', componentScope('one'))).toBe(first);
    expect(compileScss('.cached { color: blue }', componentScope('two'))).not.toBe(first);
  });

  it('keeps the cache bounded: the oldest entries make room', () => {
    for (let i = 0; i < 410; i += 1) compileScss(`.c${i} { order: ${i} }`);
    expect(compileScss('.c409 { order: 409 }')).toBe('.c409{order:409}');
  });
});

describe('failures that are not code problems', () => {
  it('rethrows a compiler crash as itself, never as \"bad SCSS\"', () => {
    compileString.mockImplementationOnce(() => {
      throw new TypeError('compiler crashed');
    });
    expect(() => compileScss('.crash { color: red }')).toThrow(TypeError);
  });

  it('rethrows a parser crash as itself, never as \"bad JavaScript\"', async () => {
    parseJs.mockImplementationOnce(() => {
      throw new RangeError('parser crashed');
    });
    await expect(validateCode('JS', 'const a = 1;')).rejects.toThrow(RangeError);
  });
});

describe('compileScssOrRaw', () => {
  it('compiles valid SCSS', () => {
    expect(compileScssOrRaw('.a { .b { color: red } }')).toBe('.a .b{color:red}');
  });

  it('serves a stylesheet that stopped compiling as written, never as an error', () => {
    expect(compileScssOrRaw('.a { color: ; }')).toBe('.a { color: ; }');
  });
});

describe('validateCode', () => {
  it('passes valid SCSS and empty code', async () => {
    expect(await validateCode('SCSS', '.a { b { color: red } }')).toEqual([]);
    expect(await validateCode('SCSS', '')).toEqual([]);
    expect(await validateCode('JS', '  ')).toEqual([]);
    expect(await validateCode('ASTRO', '')).toEqual([]);
  });

  it('reports a SCSS error with its line and column', async () => {
    expect(await validateCode('SCSS', '.a {\n  color: ;\n}')).toEqual([{ line: 2, column: 10, message: 'Expected expression.', severity: 'ERROR' }]);
  });

  it('parses JavaScript without running it', async () => {
    expect(await validateCode('JS', 'throw new Error("never runs");')).toEqual([]);
  });

  it('reports a JavaScript syntax error with its line', async () => {
    const [problem] = await validateCode('JS', 'const a = 1;\nfunction go( {\n  return 1\n}');
    expect(problem).toMatchObject({ line: 3, severity: 'ERROR' });
    expect(problem.message).toMatch(/Unexpected/);
  });

  it('has nothing to say about plain HTML', async () => {
    expect(await validateCode('HTML', '<div>unclosed')).toEqual([]);
  });

  it('passes plain Astro markup (the parser’s empty frontmatter node is not frontmatter)', async () => {
    astro({ type: 'AstroRoot', body: [{ type: 'AstroFrontmatter', start: 0, end: 0, program: { body: [] } }, { type: 'JSXElement', start: 0 }] });
    expect(await validateCode('ASTRO', '<section>Hi</section>')).toEqual([]);
  });

  it('reports Astro parse diagnostics, errors and warnings', async () => {
    astro({ type: 'AstroRoot' }, [
      { severity: 'error', text: 'Expected corresponding JSX closing tag', labels: [{ line: 3, column: 7 }] },
      { severity: 'warning', text: 'Odd attribute', labels: [] },
    ]);
    expect(await validateCode('ASTRO', '<a>')).toEqual([
      { line: 3, column: 7, message: 'Expected corresponding JSX closing tag', severity: 'ERROR' },
      { line: 1, column: 1, message: 'Odd attribute', severity: 'WARNING' },
    ]);
  });

  it('refuses frontmatter code, pointing at the fence', async () => {
    astro({ type: 'AstroRoot', body: [{ type: 'AstroFrontmatter', start: 0, end: 20, program: { body: [{ type: 'VariableDeclaration' }] } }] });
    const [problem] = await validateCode('ASTRO', '---\nconst a = 1;\n---\n<h1>x</h1>');
    expect(problem).toMatchObject({ line: 1, column: 1, severity: 'ERROR' });
    expect(problem.message).toMatch(/frontmatter code needs a build/);
  });

  it('asks for empty frontmatter fences to go: they would show on the page', async () => {
    astro({ type: 'AstroRoot', body: [{ type: 'AstroFrontmatter', start: 0, end: 7, program: { body: [] } }] });
    expect((await validateCode('ASTRO', '---\n---\n<h1>x</h1>'))[0].message).toMatch(/Remove the empty --- fences/);
  });

  it('ignores a frontmatter node with no extent at all', async () => {
    astro({ type: 'AstroRoot', body: [{ type: 'AstroFrontmatter' }] });
    expect(await validateCode('ASTRO', '<p>x</p>')).toEqual([]);
  });

  it('treats a frontmatter with an extent but no program as empty fences', async () => {
    astro({ type: 'AstroRoot', body: [{ type: 'AstroFrontmatter', start: 0, end: 7 }] });
    expect((await validateCode('ASTRO', '---\n---\n<p>x</p>'))[0].message).toMatch(/Remove the empty --- fences/);
  });

  it('points at the start when a node carries no position', async () => {
    astro({ type: 'AstroRoot', body: [{ type: 'JSXExpressionContainer' }] });
    expect((await validateCode('ASTRO', '<p>{x}</p>'))[0]).toMatchObject({ line: 1, column: 1 });
  });

  it('refuses {expressions}, at their position', async () => {
    const source = '<h1>Hi</h1>\n<p>{name}</p>';
    astro({ type: 'AstroRoot', body: [{ type: 'JSXExpressionContainer', start: source.indexOf('{') }] });
    const [problem] = await validateCode('ASTRO', source);
    expect(problem).toMatchObject({ line: 2, column: 4, severity: 'ERROR' });
    expect(problem.message).toMatch(/\{expressions\} need a build/);
  });
});

describe('assertValid', () => {
  it('lets valid code through', async () => {
    await expect(assertValid('SCSS', '.a { color: red }', 'Site CSS')).resolves.toBeUndefined();
  });

  it('refuses invalid code as bad input, naming what and where', async () => {
    try {
      await assertValid('SCSS', '.a {\n  color: ;\n}', 'Site CSS');
      throw new Error('expected a refusal');
    } catch (error) {
      expect((error as Error).message).toBe('Site CSS — line 2, column 10: Expected expression.');
      expect((error as { extensions?: { code?: string } }).extensions?.code).toBe('BAD_USER_INPUT');
    }
  });

  it('ignores warnings: only errors block a save', async () => {
    astro({ type: 'AstroRoot' }, [{ severity: 'warning', text: 'Odd attribute', labels: [{ line: 1, column: 1 }] }]);
    await expect(assertValid('ASTRO', '<a>', 'Component')).resolves.toBeUndefined();
  });
});

describe('scopedScript', () => {
  it('runs once per placement with root bound to it, errors kept inside the component', () => {
    const script = scopedScript('hero', 'root.dataset.ready = "1";');
    const placements = [{ dataset: {} as Record<string, string> }, { dataset: {} as Record<string, string> }];
    const document = { querySelectorAll: jest.fn(() => placements) };
    new Function('document', 'console', script)(document, console);
    expect(document.querySelectorAll).toHaveBeenCalledWith('[data-cms-fragment="hero"]');
    expect(placements.map((p) => p.dataset.ready)).toEqual(['1', '1']);
  });

  it('logs a failing component instead of breaking the page', () => {
    const error = jest.fn();
    const script = scopedScript('broken', 'throw new Error("boom");');
    new Function('document', 'console', script)({ querySelectorAll: () => [{}] }, { error });
    expect(error).toHaveBeenCalledWith('cms component failed', 'broken', expect.any(Error));
  });

  it('adds nothing for a component without a script', () => {
    expect(scopedScript('k', '  ')).toBe('');
  });
});

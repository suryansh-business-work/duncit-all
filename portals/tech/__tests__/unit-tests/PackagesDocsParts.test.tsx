import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { Components } from 'react-markdown';

const m = vi.hoisted(() => ({
  components: null as null | Record<string, (p: Record<string, unknown>) => ReactNode>,
  loadDemos: vi.fn(),
  loadSource: vi.fn(),
  monaco: [] as Array<{ code: string; language: string; badge?: string }>,
  editorProps: null as null | { theme: string; language: string; value: string },
}));

vi.mock('react-markdown', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-markdown')>();
  const Real = actual.default;
  return {
    ...actual,
    default: (p: { components: Components; children: string; remarkPlugins: unknown[] }) => {
      m.components = p.components as unknown as typeof m.components;
      return <Real {...p} />;
    },
  };
});
vi.mock('../../src/pages/packages-docs/editor/MonacoBlock', () => ({
  default: (p: { code: string; language: string; badge?: string }) => {
    m.monaco.push(p);
    return (
      <pre data-testid="monaco" data-language={p.language} data-badge={p.badge}>
        {p.code}
      </pre>
    );
  },
}));
vi.mock('@duncit/docs-demos', () => ({
  loadPackageDemos: m.loadDemos,
  loadPackageDemoSource: m.loadSource,
}));
vi.mock('../../src/pages/packages-docs/demos/DemoCard', () => ({
  default: (p: { demo: { id: string; title: string } }) => <div data-testid="demo-card">{p.demo.title}</div>,
}));
vi.mock('@monaco-editor/react', () => ({
  default: (p: { theme: string; language: string; value: string; onChange: (v?: string) => void }) => {
    m.editorProps = p;
    return (
      <textarea
        aria-label="mock-editor"
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
      />
    );
  },
}));

import PackageDocBody from '../../src/pages/packages-docs/PackageDocBody';
import PackageDocHeader from '../../src/pages/packages-docs/PackageDocHeader';
import DemoBoundary from '../../src/pages/packages-docs/demos/DemoBoundary';
import MockDataEditor from '../../src/pages/packages-docs/demos/MockDataEditor';
import PackageDemos from '../../src/pages/packages-docs/demos/PackageDemos';
import { fenceTag, monacoLanguage } from '../../src/pages/packages-docs/editor/monaco-language';
import type { PackageDoc } from '../../src/pages/packages-docs/package-docs';

beforeEach(() => {
  vi.clearAllMocks();
  m.monaco = [];
  m.editorProps = null;
});

describe('monaco-language', () => {
  it.each([
    ['language-ts', 'typescript'],
    ['language-TSX', 'typescript'],
    ['language-sh', 'shell'],
    ['language-gql', 'graphql'],
    ['language-dockerfile', 'dockerfile'],
    ['language-unknown-lang', 'plaintext'],
    ['', 'plaintext'],
    [undefined, 'plaintext'],
  ])('maps %s to %s', (cls, expected) => {
    expect(monacoLanguage(cls)).toBe(expected);
  });

  it('reads the tag as written, lower-cased, and is empty when untagged', () => {
    expect(fenceTag('hljs language-TS')).toBe('ts');
    expect(fenceTag('no-tag')).toBe('');
    expect(fenceTag(undefined)).toBe('');
  });
});

describe('PackageDocBody', () => {
  const md = [
    '# Title',
    '',
    '## Section',
    '',
    '### Sub',
    '',
    '#### Deep',
    '',
    'Paragraph with `inline` code and a [link](https://example.test).',
    '',
    '- item one',
    '',
    '> quoted',
    '',
    '| a | b |',
    '| - | - |',
    '| 1 | 2 |',
    '',
    '```ts',
    'const x = 1;',
    '```',
    '',
    '```',
    'plain text',
    '```',
  ].join('\n');

  it('maps headings one level below the page title and opens fences as editors', () => {
    render(<PackageDocBody markdown={md} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Section' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5, name: 'Sub' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 6, name: 'Deep' })).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'link' });
    expect(link).toHaveAttribute('href', 'https://example.test');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');

    expect(screen.getByRole('columnheader', { name: 'a' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('item one');
    expect(screen.getByText('quoted')).toBeInTheDocument();
    expect(screen.getByText('inline').tagName).toBe('CODE');

    const blocks = screen.getAllByTestId('monaco');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toHaveAttribute('data-language', 'typescript');
    expect(blocks[0]).toHaveAttribute('data-badge', 'ts');
    expect(blocks[0].textContent).toBe('const x = 1;');
    expect(blocks[1]).toHaveAttribute('data-language', 'plaintext');
    expect(blocks[1]).toHaveAttribute('data-badge', '');
  });

  describe('the fenced-block override', () => {
    const pre = (children: ReactNode) => {
      render(<PackageDocBody markdown="x" />);
      return render(<>{m.components!.pre({ children })}</>);
    };

    it('reads the code and tag from the code child, dropping one trailing newline', () => {
      pre(<code className="language-json">{'{"a":1}\n'}</code>);
      expect(m.monaco.at(-1)).toMatchObject({ code: '{"a":1}', language: 'json', badge: 'json' });
    });

    it('takes the first child when the fence arrives as a list', () => {
      pre([<code key="c" className="language-sh">echo hi</code>, null]);
      expect(m.monaco.at(-1)).toMatchObject({ code: 'echo hi', language: 'shell' });
    });

    it('falls back to the raw text when the child is not an element', () => {
      pre('just text');
      expect(m.monaco.at(-1)).toMatchObject({ code: 'just text', language: 'plaintext', badge: '' });
    });

    it('renders an empty block when there is no child at all', () => {
      pre(undefined);
      expect(m.monaco.at(-1)).toMatchObject({ code: '' });
    });

    it('treats a code element with no class or text as an untagged empty block', () => {
      pre(<code />);
      expect(m.monaco.at(-1)).toMatchObject({ code: '', language: 'plaintext', badge: '' });
    });
  });
});

describe('PackageDocHeader', () => {
  const doc = (over: Partial<PackageDoc> = {}): PackageDoc => ({
    slug: 'x',
    name: '@duncit/x',
    summary: 'Does x',
    category: 'core',
    zeroDeps: false,
    frameworkFree: false,
    coverageGate: false,
    consumers: [],
    exports: [],
    body: '',
    ...over,
  });

  it('shows only the facts the package actually has', () => {
    render(<PackageDocHeader doc={doc()} />);
    expect(screen.getByRole('heading', { level: 2, name: '@duncit/x' })).toBeInTheDocument();
    expect(screen.getByText('core')).toBeInTheDocument();
    expect(screen.queryByText('framework-free')).toBeNull();
    expect(screen.queryByText('100% coverage gate')).toBeNull();
    expect(screen.queryByText('Imported by')).toBeNull();
    expect(screen.queryByText('Exports')).toBeNull();
  });

  it('lists guarantees, consumers and exports when present', () => {
    render(
      <PackageDocHeader
        doc={doc({
          zeroDeps: true,
          frameworkFree: true,
          coverageGate: true,
          consumers: ['mweb', 'portals'],
          exports: ['alpha', 'beta'],
        })}
      />,
    );
    expect(screen.getByText('framework-free')).toBeInTheDocument();
    expect(screen.getByText('100% coverage gate')).toBeInTheDocument();
    expect(screen.getByText('mweb · portals')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });
});

describe('DemoBoundary', () => {
  function Bomb({ explode }: Readonly<{ explode: unknown }>) {
    if (explode) throw explode;
    return <p>fine</p>;
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('renders its children while nothing throws', () => {
    render(
      <DemoBoundary resetKey="a" title="Demo failed">
        <Bomb explode={null} />
      </DemoBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('contains a throwing demo inside an alert with the error message', () => {
    render(
      <DemoBoundary resetKey="a" title="Demo failed">
        <Bomb explode={new Error('bad mock')} />
      </DemoBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Demo failed');
    expect(screen.getByRole('alert')).toHaveTextContent('bad mock');
  });

  it('stringifies a non-Error throw', () => {
    render(
      <DemoBoundary resetKey="a" title="Demo failed">
        <Bomb explode="plain string failure" />
      </DemoBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('plain string failure');
  });

  it('recovers when the mock changes, and stays put while it does not', () => {
    const { rerender } = render(
      <DemoBoundary resetKey="a" title="Demo failed">
        <Bomb explode={new Error('bad mock')} />
      </DemoBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <DemoBoundary resetKey="a" title="Demo failed">
        <Bomb explode={null} />
      </DemoBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <DemoBoundary resetKey="b" title="Demo failed">
        <Bomb explode={null} />
      </DemoBoundary>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('a key change with nothing broken leaves the children alone', () => {
    const { rerender } = render(
      <DemoBoundary resetKey="a" title="t">
        <Bomb explode={null} />
      </DemoBoundary>,
    );
    rerender(
      <DemoBoundary resetKey="b" title="t">
        <Bomb explode={null} />
      </DemoBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });
});

describe('MockDataEditor', () => {
  const editor = () => screen.getByLabelText('mock-editor') as HTMLTextAreaElement;

  it('starts from the demo mock and applies every edit that still parses', () => {
    const onChange = vi.fn();
    render(<MockDataEditor initial={{ a: 1 }} onChange={onChange} />);
    expect(JSON.parse(editor().value)).toEqual({ a: 1 });
    fireEvent.change(editor(), { target: { value: '{"a": 2}' } });
    expect(onChange).toHaveBeenLastCalledWith({ a: 2 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reports invalid JSON without applying it', () => {
    const onChange = vi.fn();
    render(<MockDataEditor initial={{ a: 1 }} onChange={onChange} />);
    fireEvent.change(editor(), { target: { value: '{"a": ' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(editor().value).toBe('{"a": ');
  });

  it('falls back to the generic message when applying throws a non-Error', () => {
    const onChange = vi.fn(() => {
      throw 'rejected by consumer';
    });
    render(<MockDataEditor initial={{ a: 1 }} onChange={onChange} />);
    fireEvent.change(editor(), { target: { value: '{"a": 3}' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent('rejected by consumer');
  });

  it('treats an undefined editor value as empty text', () => {
    const onChange = vi.fn();
    render(<MockDataEditor initial={{ a: 1 }} onChange={onChange} />);
    act(() => m.editorProps!.onChange(undefined as unknown as string));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('resets to the demo mock and clears the error', () => {
    const onChange = vi.fn();
    render(<MockDataEditor initial={{ a: 1 }} onChange={onChange} />);
    fireEvent.change(editor(), { target: { value: 'nope' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(JSON.parse(editor().value)).toEqual({ a: 1 });
    expect(onChange).toHaveBeenLastCalledWith({ a: 1 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reloads its own mock when the demo changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<MockDataEditor initial={{ a: 1 }} onChange={onChange} />);
    fireEvent.change(editor(), { target: { value: 'nope' } });
    rerender(<MockDataEditor initial={{ b: 2 }} onChange={onChange} />);
    expect(JSON.parse(editor().value)).toEqual({ b: 2 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('follows the dark theme in the editor', () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <MockDataEditor initial={{}} onChange={vi.fn()} />
      </ThemeProvider>,
    );
    expect(m.editorProps?.theme).toBe('vs-dark');
    expect(m.editorProps?.language).toBe('json');
  });

  it('uses the light editor theme by default and sizes tall mocks within bounds', () => {
    const tall = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`k${i}`, i]));
    const { container, rerender } = render(<MockDataEditor initial={tall} onChange={vi.fn()} />);
    expect(m.editorProps?.theme).toBe('light');
    // the editor area is capped at 24 lines (19px each + 16px padding) regardless of length
    const boxes = Array.from(container.querySelectorAll('div'));
    const cs = boxes.map((b) => getComputedStyle(b).height).filter(Boolean);
    expect(cs).toContain(`${24 * 19 + 16}px`);
    rerender(<MockDataEditor initial={1} onChange={vi.fn()} />);
    const short = Array.from(container.querySelectorAll('div')).map((b) => getComputedStyle(b).height);
    expect(short).toContain(`${4 * 19 + 16}px`);
  });
});

describe('PackageDemos', () => {
  it('shows a spinner until the demo module and its source arrive, then every demo plus the source', async () => {
    m.loadDemos.mockResolvedValue({ demos: [{ id: 'd1', title: 'First' }, { id: 'd2', title: 'Second' }] });
    m.loadSource.mockResolvedValue('export const demos = [];');
    const { container } = render(<PackageDemos slug="table" />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(screen.getAllByTestId('demo-card')).toHaveLength(2);
    expect(m.loadDemos).toHaveBeenCalledWith('table');
    expect(m.loadSource).toHaveBeenCalledWith('table');
    expect(screen.getByTestId('monaco')).toHaveTextContent('export const demos = [];');
    expect(screen.getByTestId('monaco')).toHaveAttribute('data-language', 'typescript');
  });

  it('says there is no demo yet when the package ships none', async () => {
    m.loadDemos.mockResolvedValue(null);
    m.loadSource.mockResolvedValue('');
    render(<PackageDemos slug="newpkg" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('packages/docs-demos/src/demos/newpkg.tsx');
    expect(screen.queryByTestId('demo-card')).toBeNull();
  });

  it('says there is no demo yet when the module has an empty demo list', async () => {
    m.loadDemos.mockResolvedValue({ demos: [] });
    m.loadSource.mockResolvedValue('');
    render(<PackageDemos slug="emptypkg" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('monaco')).toBeNull();
  });

  it('shows the load failure message', async () => {
    m.loadDemos.mockRejectedValue(new Error('chunk 404'));
    m.loadSource.mockResolvedValue('');
    render(<PackageDemos slug="x" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('chunk 404');
  });

  it('stringifies a non-Error load failure', async () => {
    m.loadDemos.mockRejectedValue('network down');
    m.loadSource.mockResolvedValue('');
    render(<PackageDemos slug="x" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('network down');
  });

  it('ignores an answer that arrives after the page moved on', async () => {
    let resolveDemos: (v: unknown) => void = () => undefined;
    m.loadDemos.mockReturnValue(new Promise((r) => (resolveDemos = r)));
    m.loadSource.mockResolvedValue('src');
    const { unmount } = render(<PackageDemos slug="slow" />);
    unmount();
    await act(async () => {
      resolveDemos({ demos: [{ id: 'late', title: 'Late' }] });
    });
    expect(screen.queryByText('Late')).toBeNull();
  });

  it('ignores a failure that arrives after the page moved on', async () => {
    let rejectDemos: (e: unknown) => void = () => undefined;
    m.loadDemos.mockReturnValue(new Promise((_r, rej) => (rejectDemos = rej)));
    m.loadSource.mockResolvedValue('src');
    const { unmount } = render(<PackageDemos slug="slow" />);
    unmount();
    await act(async () => {
      rejectDemos(new Error('late failure'));
    });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});

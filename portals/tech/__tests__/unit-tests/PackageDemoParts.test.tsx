import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { PackageDemo } from '@duncit/docs-demos';

const m = vi.hoisted(() => ({
  editorProps: [] as Array<{ theme: string; language: string; value: string; onChange: (v?: string) => void }>,
  copy: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('@monaco-editor/react', () => ({
  default: (p: { theme: string; language: string; value: string; onChange: (v?: string) => void }) => {
    m.editorProps.push(p);
    return <textarea aria-label={`editor-${p.language}`} value={p.value} onChange={(e) => p.onChange(e.target.value)} />;
  },
}));
vi.mock('@duncit/utils', async (io) => ({ ...(await io<typeof import('@duncit/utils')>()), copyToClipboard: m.copy }));
vi.mock('@duncit/dialogs', async (io) => ({ ...(await io<typeof import('@duncit/dialogs')>()), notifySuccess: m.notifySuccess }));

import DemoCard from '../../src/pages/packages-docs/demos/DemoCard';
import DemoOutput from '../../src/pages/packages-docs/demos/DemoOutput';
import MonacoBlock from '../../src/pages/packages-docs/editor/MonacoBlock';

beforeEach(() => {
  vi.clearAllMocks();
  m.editorProps = [];
  m.copy.mockResolvedValue(true);
});

const demo = (over: Partial<PackageDemo> = {}): PackageDemo => ({ id: 'd1', title: 'Fee split', mock: { amount: 100 }, ...over });
const lastEditor = (language: string) => m.editorProps.filter((p) => p.language === language).at(-1);

function Fragile({ amount }: Readonly<{ amount: number }>) {
  if (amount < 0) throw new Error('negative amount');
  return <div data-testid="live">fine</div>;
}

describe('DemoOutput', () => {
  it('says so when the demo returned nothing', () => {
    render(<DemoOutput output={{}} />);
    expect(screen.getByText('This demo returned nothing for the current mock.')).toBeInTheDocument();
  });

  it('prints a string as itself, an object as JSON, and what has no JSON form by name', () => {
    function named() {
      return 1;
    }
    render(
      <DemoOutput
        output={{
          text: 'hello',
          object: { total: 118 },
          missing: undefined,
          namedFn: named,
          anonymousFn: (() => () => 1)(),
          symbol: Symbol('token'),
        }}
      />,
    );
    const cell = (key: string) => screen.getByText(key).nextElementSibling?.textContent;

    expect(cell('text')).toBe('hello');
    expect(JSON.parse(cell('object') ?? '')).toEqual({ total: 118 });
    expect(cell('missing')).toBe('undefined');
    expect(cell('namedFn')).toBe('[function named]');
    expect(cell('anonymousFn')).toBe('[function anonymous]');
    expect(cell('symbol')).toBe('Symbol(token)');
  });
});

describe('DemoCard', () => {
  it('shows the live view, what the real export returned and the editable mock', () => {
    render(
      <DemoCard
        demo={demo({
          note: 'Look at the total',
          render: (mock) => <div data-testid="live">{`amount ${(mock as { amount: number }).amount}`}</div>,
          compute: (mock) => ({ doubled: (mock as { amount: number }).amount * 2 }),
        })}
      />,
    );

    expect(screen.getByText('Fee split')).toBeInTheDocument();
    expect(screen.getByText('Look at the total')).toBeInTheDocument();
    expect(screen.getByTestId('live')).toHaveTextContent('amount 100');
    expect(screen.getByText('doubled').nextElementSibling).toHaveTextContent('200');
  });

  it('runs the demo again over whatever mock the reader edits it into', () => {
    render(
      <DemoCard
        demo={demo({
          render: (mock) => <div data-testid="live">{`amount ${(mock as { amount: number }).amount}`}</div>,
          compute: (mock) => ({ doubled: (mock as { amount: number }).amount * 2 }),
        })}
      />,
    );

    fireEvent.change(screen.getByLabelText('editor-json'), { target: { value: '{"amount": 250}' } });

    expect(screen.getByTestId('live')).toHaveTextContent('amount 250');
    expect(screen.getByText('doubled').nextElementSibling).toHaveTextContent('500');
  });

  it('leaves out the live view and the returned values for a demo that has neither, and no note', () => {
    render(<DemoCard demo={demo()} />);

    expect(screen.queryByTestId('live')).not.toBeInTheDocument();
    expect(screen.queryByText('This demo returned nothing for the current mock.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('editor-json')).toBeInTheDocument();
  });

  it('shows an export that throws as an Error row, with the message or the text thrown', () => {
    const { unmount } = render(
      <DemoCard
        demo={demo({
          compute: () => {
            throw new Error('amount must be positive');
          },
        })}
      />,
    );
    expect(screen.getByText('Error').nextElementSibling).toHaveTextContent('amount must be positive');
    unmount();

    render(
      <DemoCard
        demo={demo({
          compute: () => {
            throw 'bad mock';
          },
        })}
      />,
    );
    expect(screen.getByText('Error').nextElementSibling).toHaveTextContent('bad mock');
  });

  it('gives a view that threw a fresh try once the mock is fixed', () => {
    render(
      <DemoCard
        demo={demo({
          render: (mock) => <Fragile amount={(mock as { amount: number }).amount} />,
        })}
      />,
    );

    fireEvent.change(screen.getByLabelText('editor-json'), { target: { value: '{"amount": -1}' } });
    expect(screen.getByRole('alert')).toHaveTextContent('negative amount');

    fireEvent.change(screen.getByLabelText('editor-json'), { target: { value: '{"amount": 5}' } });
    expect(screen.getByTestId('live')).toBeInTheDocument();
  });
});

describe('MonacoBlock', () => {
  it('shows the fence tag, and opens the code in an editor', () => {
    render(<MonacoBlock code={'const a = 1;'} language="typescript" badge="ts" />);

    expect(screen.getByText('ts')).toBeInTheDocument();
    expect(screen.getByLabelText('editor-typescript')).toHaveValue('const a = 1;');
  });

  it('leaves the badge out for an untagged fence', () => {
    render(<MonacoBlock code="plain" language="plaintext" />);
    expect(screen.queryByText('plaintext', { selector: '.MuiChip-label' })).not.toBeInTheDocument();
  });

  it('offers a reset only once the snippet has been edited, and puts the original back', () => {
    render(<MonacoBlock code="original" language="plaintext" />);
    expect(screen.queryByRole('button', { name: 'Reset snippet' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('editor-plaintext'), { target: { value: 'edited' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset snippet' }));

    expect(screen.getByLabelText('editor-plaintext')).toHaveValue('original');
    expect(screen.queryByRole('button', { name: 'Reset snippet' })).not.toBeInTheDocument();
  });

  it('copies what is in the editor now, and says so', async () => {
    render(<MonacoBlock code="original" language="plaintext" />);
    fireEvent.change(screen.getByLabelText('editor-plaintext'), { target: { value: 'edited' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy snippet' }));
    });

    expect(m.copy).toHaveBeenCalledWith('edited');
    expect(m.notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('opens the same code full-screen, named by its tag, and shares edits both ways', () => {
    render(<MonacoBlock code="original" language="typescript" badge="ts" />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand snippet' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'ts' })).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('editor-typescript'), { target: { value: 'edited full-screen' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close editor' }));

    expect(screen.getByLabelText('editor-typescript')).toHaveValue('edited full-screen');
  });

  it('names the full-screen editor by its language when the fence had no tag', () => {
    render(<MonacoBlock code="x" language="plaintext" />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand snippet' }));
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'plaintext' })).toBeInTheDocument();
  });

  it('follows the dark theme in the inline and the full-screen editor', () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <MonacoBlock code="x" language="typescript" badge="ts" />
      </ThemeProvider>,
    );
    expect(lastEditor('typescript')?.theme).toBe('vs-dark');

    fireEvent.click(screen.getByRole('button', { name: 'Expand snippet' }));
    expect(m.editorProps.filter((p) => p.theme === 'vs-dark').length).toBeGreaterThanOrEqual(2);
  });

  it('uses the light theme otherwise', () => {
    render(<MonacoBlock code="x" language="typescript" />);
    expect(lastEditor('typescript')?.theme).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Expand snippet' }));
    expect(m.editorProps.every((p) => p.theme === 'light')).toBe(true);
  });

  it('treats a cleared full-screen editor as empty text', () => {
    render(<MonacoBlock code="original" language="plaintext" />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand snippet' }));

    act(() => m.editorProps.at(-1)?.onChange(undefined));

    expect(within(screen.getByRole('dialog')).getByLabelText('editor-plaintext')).toHaveValue('');
  });

  it('treats a cleared editor as empty text', () => {
    render(<MonacoBlock code="original" language="plaintext" />);
    act(() => lastEditor('plaintext')?.onChange(undefined));
    expect(screen.getByLabelText('editor-plaintext')).toHaveValue('');
  });
});

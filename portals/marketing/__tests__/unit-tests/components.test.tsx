import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { aiMjmlMock } from '../mocks';

// ---------------------------------------------------------------------------
// Shared module mocks for heavy / external dependencies. GraphQL (the MjmlAi
// mutation) flows through the real Apollo `MockedProvider` via renderWithProviders.
// ---------------------------------------------------------------------------
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm' }),
}));

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({
    label,
    value,
    onChange,
    disabled,
    minDateTime,
    slotProps,
  }: {
    label: string;
    value: Date | null;
    onChange: (d: Date | null) => void;
    disabled?: boolean;
    minDateTime?: Date;
    slotProps?: { textField?: { helperText?: string } };
  }) => (
    <div>
      <input
        aria-label={label}
        disabled={disabled}
        data-mindatetime={minDateTime ? 'set' : 'none'}
        value={value ? value.toISOString() : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
      />
      <button type="button" onClick={() => onChange(null)}>{`clear-${label}`}</button>
      <span>{slotProps?.textField?.helperText}</span>
    </div>
  ),
}));

// The field itself lives in (and is tested by) @duncit/media-picker; the portal
// only binds it to its own copy, so the stub shows exactly what it was handed.
vi.mock('@duncit/media-picker', () => ({
  default: () => null,
  MediaPickerField: ({
    label,
    value,
    onChange,
    labels,
    folder,
  }: {
    label: string;
    value: string;
    onChange: (url: string) => void;
    labels: { placeholder: string; pick: string; open: string };
    folder?: string;
  }) => (
    <div data-folder={folder}>
      <input
        aria-label={label}
        value={value}
        placeholder={labels.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>{labels.pick}</span>
      <span>{labels.open}</span>
    </div>
  ),
}));

const userCtxMock = vi.hoisted(() => ({
  value: { user: null as any, loading: false, logout: vi.fn() },
}));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userCtxMock.value,
}));

// Spread the real shell (keeps ColorModeProvider for renderWithProviders) and
// replace only the chrome with a probe that surfaces the adapter's props.
const shellProbe = vi.hoisted(() => ({ props: null as any }));
vi.mock('@duncit/shell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/shell')>();
  return {
    ...actual,
    AppShell: (props: Record<string, any>) => {
      shellProbe.props = props;
      return (
        <div data-testid="shell">
          <span data-testid="loading">{String(props.loading)}</span>
          <span data-testid="has-access">{String(props.hasAccess)}</span>
          <span data-testid="has-user">{props.user ? props.user.first_name : 'none'}</span>
          <button type="button" onClick={props.onLogout}>
            logout
          </button>
          <button type="button" onClick={props.onDenied}>
            denied
          </button>
          {props.children as ReactNode}
        </div>
      );
    },
  };
});

import DateTimeField from '../../src/components/DateTimeField';
import MediaPickerField from '../../src/components/MediaPickerField';
import MjmlAiButton from '../../src/components/MjmlAiButton';
import AppShell from '../../src/components/AppShell';
import { getToken, setToken, clearToken } from '../../src/lib/session';

afterEach(() => {
  vi.clearAllMocks();
  clearToken();
  userCtxMock.value = { user: null, loading: false, logout: vi.fn() };
});

// ===========================================================================
describe('DateTimeField', () => {
  it('renders an empty picker for a blank value', () => {
    renderWithProviders(<DateTimeField label="Schedule" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Schedule')).toHaveValue('');
  });

  it('parses a valid ISO value', () => {
    renderWithProviders(
      <DateTimeField label="Schedule" value="2030-01-02T03:04:00.000Z" onChange={vi.fn()} minDateTime={new Date()} />,
    );
    expect(screen.getByLabelText('Schedule')).toHaveValue('2030-01-02T03:04:00.000Z');
    expect(screen.getByLabelText('Schedule')).toHaveAttribute('data-mindatetime', 'set');
  });

  it('ignores an unparseable value', () => {
    renderWithProviders(<DateTimeField label="Schedule" value="not-a-date" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Schedule')).toHaveValue('');
  });

  it('emits an ISO string when a date is picked and empty when cleared', () => {
    const onChange = vi.fn();
    renderWithProviders(<DateTimeField label="Schedule" value="" onChange={onChange} helperText="pick one" />);
    fireEvent.change(screen.getByLabelText('Schedule'), { target: { value: '2031-05-06T07:08:00.000Z' } });
    expect(onChange).toHaveBeenLastCalledWith('2031-05-06T07:08:00.000Z');
    fireEvent.click(screen.getByText('clear-Schedule'));
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.getByText('pick one')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('MediaPickerField', () => {
  it('binds the shared field to the marketing copy', () => {
    renderWithProviders(<MediaPickerField label="Image" value="" onChange={vi.fn()} folder="/notifications" />);
    expect(screen.getByLabelText('Image')).toHaveAttribute(
      'placeholder',
      'Click the image icon to upload, or paste a URL…',
    );
    expect(screen.getByText('Pick from device or Pexels')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByLabelText('Image').parentElement).toHaveAttribute('data-folder', '/notifications');
  });

  it('forwards the value and its changes', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <MediaPickerField label="Image" value="https://cdn.example.com/x.png" onChange={onChange} />,
    );
    expect(screen.getByLabelText('Image')).toHaveValue('https://cdn.example.com/x.png');
    fireEvent.change(screen.getByLabelText('Image'), { target: { value: 'https://cdn.example.com/y.png' } });
    expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/y.png');
  });
});

// ===========================================================================
describe('MjmlAiButton', () => {
  it('opens the popover from the icon button and applies generated MJML', async () => {
    const onApply = vi.fn();
    renderWithProviders(<MjmlAiButton currentMjml="<mjml></mjml>" onApply={onApply} iconOnly />, {
      mocks: [aiMjmlMock({ mjml: '<mjml><mj-body/></mjml>' })],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create/update with AI' }));
    fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: 'Make it festive' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith('<mjml><mj-body/></mjml>'));
  });

  it('renders a labelled button and shows an error when no MJML is returned', async () => {
    renderWithProviders(<MjmlAiButton currentMjml="" onApply={vi.fn()} label="AI" />, {
      mocks: [aiMjmlMock({ mjml: null })],
    });
    fireEvent.click(screen.getByRole('button', { name: 'AI' }));
    fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: 'do it' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('AI did not return MJML')).toBeInTheDocument();
  });

  it('disables Apply and shows the working label while the request is in flight', async () => {
    renderWithProviders(<MjmlAiButton currentMjml="" onApply={vi.fn()} />, {
      mocks: [aiMjmlMock({ pending: true })],
    });
    fireEvent.click(screen.getByRole('button', { name: /Create\/Update with AI/i }));
    fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('button', { name: 'Working...' })).toBeDisabled();
  });

  it('keeps the popover open on backdrop click while loading', async () => {
    renderWithProviders(<MjmlAiButton currentMjml="" onApply={vi.fn()} />, {
      mocks: [aiMjmlMock({ pending: true })],
    });
    fireEvent.click(screen.getByRole('button', { name: /Create\/Update with AI/i }));
    fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByRole('button', { name: 'Working...' });
    fireEvent.click(document.querySelector('.MuiBackdrop-root') as HTMLElement);
    expect(screen.getByText('Create/update MJML with AI')).toBeInTheDocument();
  });

  it('closes the popover from the Cancel button when idle', async () => {
    renderWithProviders(<MjmlAiButton currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Create\/Update with AI/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Create/update MJML with AI')).not.toBeInTheDocument(),
    );
  });

  it('closes the popover on backdrop click when idle', async () => {
    renderWithProviders(<MjmlAiButton currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Create\/Update with AI/i }));
    expect(screen.getByText('Create/update MJML with AI')).toBeInTheDocument();
    fireEvent.click(document.querySelector('.MuiBackdrop-root') as HTMLElement);
    await waitFor(() =>
      expect(screen.queryByText('Create/update MJML with AI')).not.toBeInTheDocument(),
    );
  });
});

// ===========================================================================
describe('AppShell adapter', () => {
  const renderShell = () =>
    renderWithProviders(<></>, {
      initialEntries: ['/'],
      routes: (
        <>
          <Route path="/" element={<AppShell>child-content</AppShell>} />
          <Route path="/login" element={<div>LOGIN ROUTE</div>} />
        </>
      ),
    });

  it('passes access + user through and logs out via navigate', () => {
    const logout = vi.fn();
    userCtxMock.value = {
      user: { first_name: 'Alex', roles: ['MARKETING_MANAGER'] },
      loading: false,
      logout,
    };
    setToken('tok');
    renderShell();
    expect(screen.getByTestId('has-access')).toHaveTextContent('true');
    expect(screen.getByTestId('has-user')).toHaveTextContent('Alex');
    expect(screen.getByText('child-content')).toBeInTheDocument();

    fireEvent.click(screen.getByText('logout'));
    expect(getToken()).toBeNull();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('LOGIN ROUTE')).toBeInTheDocument();
  });

  it('clears the token on access-denied', () => {
    userCtxMock.value = {
      user: { first_name: 'Alex', roles: ['MARKETING_MANAGER'] },
      loading: false,
      logout: vi.fn(),
    };
    setToken('tok');
    renderShell();
    fireEvent.click(screen.getByText('denied'));
    expect(getToken()).toBeNull();
  });

  it('reports undefined access while there is no user', () => {
    userCtxMock.value = { user: null, loading: true, logout: vi.fn() };
    renderShell();
    expect(screen.getByTestId('has-access')).toHaveTextContent('undefined');
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('has-user')).toHaveTextContent('none');
  });
});

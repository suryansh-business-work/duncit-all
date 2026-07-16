import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { renderWithProviders } from '../testkit';
import { aiMjmlMock } from '../mocks';

// ---------------------------------------------------------------------------
// Shared module mocks for heavy / external dependencies. GraphQL (the MjmlAi
// mutation) flows through the real Apollo `MockedProvider` via renderWithProviders.
// ---------------------------------------------------------------------------
vi.mock('@duncit/app-settings', () => ({
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

const glogin = vi.hoisted(() => ({ props: null as unknown as Record<string, any> }));
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (props: Record<string, any>) => {
    glogin.props = props;
    return (
      <div>
        <span>{`google-theme-${props.theme}`}</span>
        <button type="button" onClick={() => props.onSuccess({ credential: googleMock.credential })}>
          google-success
        </button>
        <button type="button" onClick={() => props.onError()}>
          google-error
        </button>
      </div>
    );
  },
}));
const googleMock = vi.hoisted(() => ({ credential: 'cred-abc' as string | undefined }));

vi.mock('@duncit/media-picker', () => ({
  default: ({
    open,
    onClose,
    onPicked,
    title,
  }: {
    open: boolean;
    onClose: () => void;
    onPicked: (url: string) => void;
    title: string;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={() => onPicked('https://cdn.example.com/picked.png')}>
          pick-image
        </button>
        <button type="button" onClick={onClose}>
          close-picker
        </button>
      </div>
    ) : null,
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
import GoogleSignInButton from '../../src/components/GoogleSignInButton';
import MediaPickerField from '../../src/components/MediaPickerField';
import MjmlAiButton from '../../src/components/MjmlAiButton';
import AppShell from '../../src/components/AppShell';
import { getToken, setToken, clearToken } from '../../src/lib/session';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  clearToken();
  googleMock.credential = 'cred-abc';
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
describe('GoogleSignInButton', () => {
  it('shows a not-configured tile when no client id is set', () => {
    renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });

  it('shows the not-configured tile for the placeholder client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'your_client_id_here');
    renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });

  it('renders the Google button and forwards the credential', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const onCredential = vi.fn();
    renderWithProviders(<GoogleSignInButton onCredential={onCredential} text="continue_with" />);
    fireEvent.click(screen.getByText('google-success'));
    expect(onCredential).toHaveBeenCalledWith('cred-abc');
    // onError is a no-op but must be exercised.
    fireEvent.click(screen.getByText('google-error'));
    // the host width is measured (clientWidth 800 clamped to the 400 max).
    expect(glogin.props.width).toBe(400);
  });

  it('does not forward when the response has no credential', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    googleMock.credential = undefined;
    const onCredential = vi.fn();
    renderWithProviders(<GoogleSignInButton onCredential={onCredential} />);
    fireEvent.click(screen.getByText('google-success'));
    expect(onCredential).not.toHaveBeenCalled();
  });

  it('shows the loading overlay and recomputes width on resize', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const { container } = renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} loading />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    fireEvent(window, new Event('resize'));
  });

  // Both light and dark are exercised so v8 credits both sides of the `isDark`
  // ternaries (Google theme + loading-overlay background).
  it('switches the Google theme and overlay background with the MUI color mode', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const renderMode = (mode: 'light' | 'dark') =>
      render(
        <ThemeProvider theme={createTheme({ palette: { mode } })}>
          <GoogleSignInButton onCredential={vi.fn()} loading />
        </ThemeProvider>,
      );

    const light = renderMode('light');
    expect(screen.getByText('google-theme-outline')).toBeInTheDocument();
    expect(light.container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    light.unmount();

    const dark = renderMode('dark');
    expect(screen.getByText('google-theme-filled_black')).toBeInTheDocument();
    expect(dark.container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('MediaPickerField', () => {
  it('renders button-only mode and picks an image', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <MediaPickerField label="Banner" value="" onChange={onChange} buttonOnly buttonLabel="Upload" />,
    );
    fireEvent.click(screen.getByText('Upload'));
    fireEvent.click(screen.getByText('pick-image'));
    expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/picked.png');
    fireEvent.click(screen.getByText('close-picker'));
    expect(screen.queryByText('pick-image')).not.toBeInTheDocument();
  });

  it('renders the field, opens the picker and shows a preview', () => {
    renderWithProviders(
      <MediaPickerField label="Image" value="https://cdn.example.com/x.png" onChange={vi.fn()} helperText="help" />,
    );
    expect(screen.getByAltText('preview')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.getByRole('dialog', { name: 'Choose · Image' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('close-picker'));
  });

  it('edits the value by typing and opens the url in a new tab', () => {
    const onChange = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    renderWithProviders(
      <MediaPickerField label="Image" value="https://cdn.example.com/x.png" onChange={onChange} showPreview={false} />,
    );
    fireEvent.change(screen.getByLabelText('Image'), { target: { value: 'https://cdn.example.com/y.png' } });
    expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/y.png');
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(openSpy).toHaveBeenCalledWith('https://cdn.example.com/x.png', '_blank');
    openSpy.mockRestore();
  });

  it('hides the open adornment when the value is empty', () => {
    renderWithProviders(<MediaPickerField label="Image" value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
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

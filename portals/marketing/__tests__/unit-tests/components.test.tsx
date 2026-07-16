import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// ---------------------------------------------------------------------------
// Shared mocks for heavy / external dependencies.
// ---------------------------------------------------------------------------
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm' }),
}));

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label, value, onChange, disabled, minDateTime, slotProps }: any) => (
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

const googleMock = vi.hoisted(() => ({ credential: 'cred-abc' as string | undefined }));
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError, theme }: any) => (
    <div>
      <span>{`google-theme-${theme}`}</span>
      <button type="button" onClick={() => onSuccess({ credential: googleMock.credential })}>
        google-success
      </button>
      <button type="button" onClick={() => onError()}>google-error</button>
    </div>
  ),
}));

vi.mock('@duncit/media-picker', () => ({
  default: ({ open, onClose, onPicked, title }: any) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={() => onPicked('https://cdn.example.com/picked.png')}>
          pick-image
        </button>
        <button type="button" onClick={onClose}>close-picker</button>
      </div>
    ) : null,
}));

const mjmlMock = vi.hoisted(() => ({
  run: vi.fn(),
  loading: false,
}));
vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  return {
    ...actual,
    useMutation: () => [mjmlMock.run, { loading: mjmlMock.loading }] as const,
  };
});

vi.mock('@duncit/user-context', () => ({
  useUserData: () => userCtxMock.value,
}));
const userCtxMock = vi.hoisted(() => ({
  value: { user: null as any, loading: false, logout: vi.fn() },
}));

const shellAppShellSpy = vi.hoisted(() => ({ props: null as any }));
vi.mock('@duncit/shell', () => ({
  parseEnvRoles: (_e: unknown, fallback: string[]) => fallback,
  createSession: () => ({
    getToken: () => 'tok',
    setToken: vi.fn(),
    clearToken: sessionMock.clearToken,
    hasAppAccess: (roles: string[]) => roles.includes('MARKETING_MANAGER'),
    accessDeniedMessage: 'denied',
  }),
  SUPER_ROLE: 'SUPER_ADMIN',
  AppShell: (props: any) => {
    shellAppShellSpy.props = props;
    return (
      <div>
        <span>{`loading-${props.loading}`}</span>
        <span>{`access-${String(props.hasAccess)}`}</span>
        <span>{`user-${props.user ? props.user.first_name : 'none'}`}</span>
        <button type="button" onClick={props.onLogout}>logout</button>
        <button type="button" onClick={props.onDenied}>denied</button>
        {props.children}
      </div>
    );
  },
}));
const sessionMock = vi.hoisted(() => ({ clearToken: vi.fn() }));

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

// ---------------------------------------------------------------------------
import DateTimeField from '../../src/components/DateTimeField';
import GoogleSignInButton from '../../src/components/GoogleSignInButton';
import MediaPickerField from '../../src/components/MediaPickerField';
import MjmlAiButton from '../../src/components/MjmlAiButton';
import AppShell from '../../src/components/AppShell';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  mjmlMock.loading = false;
  googleMock.credential = 'cred-abc';
  userCtxMock.value = { user: null, loading: false, logout: vi.fn() };
});

// ===========================================================================
// DateTimeField
// ===========================================================================
describe('DateTimeField', () => {
  it('renders an empty picker for a blank value', () => {
    const onChange = vi.fn();
    render(<DateTimeField label="Schedule" value="" onChange={onChange} />);
    expect(screen.getByLabelText('Schedule')).toHaveValue('');
  });

  it('parses a valid ISO value', () => {
    render(<DateTimeField label="Schedule" value="2030-01-02T03:04:00.000Z" onChange={vi.fn()} minDateTime={new Date()} />);
    expect(screen.getByLabelText('Schedule')).toHaveValue('2030-01-02T03:04:00.000Z');
    expect(screen.getByLabelText('Schedule')).toHaveAttribute('data-mindatetime', 'set');
  });

  it('ignores an unparseable value', () => {
    render(<DateTimeField label="Schedule" value="not-a-date" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Schedule')).toHaveValue('');
  });

  it('emits an ISO string when a date is picked and empty when cleared', () => {
    const onChange = vi.fn();
    render(<DateTimeField label="Schedule" value="" onChange={onChange} helperText="pick one" />);
    fireEvent.change(screen.getByLabelText('Schedule'), { target: { value: '2031-05-06T07:08:00.000Z' } });
    expect(onChange).toHaveBeenLastCalledWith('2031-05-06T07:08:00.000Z');
    fireEvent.click(screen.getByText('clear-Schedule'));
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.getByText('pick one')).toBeInTheDocument();
  });
});

// ===========================================================================
// GoogleSignInButton
// ===========================================================================
describe('GoogleSignInButton', () => {
  it('shows a not-configured tile when no client id is set', () => {
    render(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });

  it('shows the not-configured tile for the placeholder client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'your_client_id_here');
    render(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });

  it('renders the Google button and forwards the credential', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const onCredential = vi.fn();
    render(<GoogleSignInButton onCredential={onCredential} text="continue_with" />);
    fireEvent.click(screen.getByText('google-success'));
    expect(onCredential).toHaveBeenCalledWith('cred-abc');
    // onError is a no-op but must be exercised.
    fireEvent.click(screen.getByText('google-error'));
  });

  it('does not forward when the response has no credential', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    googleMock.credential = undefined;
    const onCredential = vi.fn();
    render(<GoogleSignInButton onCredential={onCredential} />);
    fireEvent.click(screen.getByText('google-success'));
    expect(onCredential).not.toHaveBeenCalled();
  });

  it('shows the loading overlay and recomputes width on resize', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    render(<GoogleSignInButton onCredential={vi.fn()} loading />);
    expect(screen.getByText('google-theme-outline')).toBeInTheDocument();
    fireEvent(window, new Event('resize'));
  });

  it('uses the dark Google theme and overlay in dark mode', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <GoogleSignInButton onCredential={vi.fn()} loading />
      </ThemeProvider>,
    );
    expect(screen.getByText('google-theme-filled_black')).toBeInTheDocument();
  });
});

// ===========================================================================
// MediaPickerField
// ===========================================================================
describe('MediaPickerField', () => {
  it('renders button-only mode and picks an image', () => {
    const onChange = vi.fn();
    render(
      <MediaPickerField label="Banner" value="" onChange={onChange} buttonOnly buttonLabel="Upload" />,
    );
    fireEvent.click(screen.getByText('Upload'));
    fireEvent.click(screen.getByText('pick-image'));
    expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/picked.png');
    fireEvent.click(screen.getByText('close-picker'));
    expect(screen.queryByText('pick-image')).not.toBeInTheDocument();
  });

  it('renders the field, opens the picker and shows a preview', () => {
    const onChange = vi.fn();
    render(<MediaPickerField label="Image" value="https://cdn.example.com/x.png" onChange={onChange} helperText="help" />);
    // preview thumbnail present because value is set
    expect(screen.getByAltText('preview')).toBeInTheDocument();
    // first icon button opens the media picker dialog
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.getByRole('dialog', { name: 'Choose · Image' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('close-picker'));
  });

  it('edits the value by typing and opens the url in a new tab', () => {
    const onChange = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<MediaPickerField label="Image" value="https://cdn.example.com/x.png" onChange={onChange} showPreview={false} />);
    const input = screen.getByLabelText('Image');
    fireEvent.change(input, { target: { value: 'https://cdn.example.com/y.png' } });
    expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/y.png');
    // endAdornment "Open" button
    const openBtn = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(openBtn);
    expect(openSpy).toHaveBeenCalledWith('https://cdn.example.com/x.png', '_blank');
    openSpy.mockRestore();
  });

  it('hides the open adornment when the value is empty', () => {
    render(<MediaPickerField label="Image" value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
  });
});

// ===========================================================================
// MjmlAiButton
// ===========================================================================
describe('MjmlAiButton', () => {
  it('opens the popover from the icon button and applies generated MJML', async () => {
    mjmlMock.run.mockResolvedValue({ data: { aiCreateOrUpdateMjml: '<mjml><mj-body/></mjml>' } });
    const onApply = vi.fn();
    render(<MjmlAiButton currentMjml="<mjml></mjml>" onApply={onApply} iconOnly />);
    fireEvent.click(screen.getByRole('button', { name: 'Create/update with AI' }));
    fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: 'Make it festive' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith('<mjml><mj-body/></mjml>'));
  });

  it('renders a labelled button and shows an error when no MJML is returned', async () => {
    mjmlMock.run.mockResolvedValue({ data: { aiCreateOrUpdateMjml: null } });
    render(<MjmlAiButton currentMjml="" onApply={vi.fn()} label="AI" />);
    fireEvent.click(screen.getByRole('button', { name: 'AI' }));
    fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: 'do it' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('AI did not return MJML')).toBeInTheDocument();
  });

  it('falls back to a default error message when the error has no message', async () => {
    mjmlMock.run.mockRejectedValue({});
    render(<MjmlAiButton currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Create\/Update with AI/i }));
    fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('Could not generate MJML')).toBeInTheDocument();
  });

  it('cancels the popover and disables Apply while loading', () => {
    mjmlMock.loading = true;
    render(<MjmlAiButton currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Create\/Update with AI/i }));
    expect(screen.getByRole('button', { name: 'Working...' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('closes the popover from the Cancel button when idle', async () => {
    render(<MjmlAiButton currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Create\/Update with AI/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Create/update MJML with AI')).not.toBeInTheDocument(),
    );
  });

  it('closes the popover on backdrop click when idle', async () => {
    render(<MjmlAiButton currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Create\/Update with AI/i }));
    expect(screen.getByText('Create/update MJML with AI')).toBeInTheDocument();
    fireEvent.click(document.querySelector('.MuiBackdrop-root') as HTMLElement);
    await waitFor(() =>
      expect(screen.queryByText('Create/update MJML with AI')).not.toBeInTheDocument(),
    );
  });

  it('keeps the popover open on backdrop click while loading', () => {
    mjmlMock.loading = true;
    render(<MjmlAiButton currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Create\/Update with AI/i }));
    fireEvent.click(document.querySelector('.MuiBackdrop-root') as HTMLElement);
    expect(screen.getByText('Create/update MJML with AI')).toBeInTheDocument();
  });
});

// ===========================================================================
// AppShell (adapter over the shared shell chrome)
// ===========================================================================
describe('AppShell adapter', () => {
  it('passes access + user through and logs out via navigate', () => {
    userCtxMock.value = {
      user: { first_name: 'Alex', roles: ['MARKETING_MANAGER'] },
      loading: false,
      logout: vi.fn(),
    };
    render(<AppShell>child-content</AppShell>);
    expect(screen.getByText('access-true')).toBeInTheDocument();
    expect(screen.getByText('user-Alex')).toBeInTheDocument();
    expect(screen.getByText('child-content')).toBeInTheDocument();

    fireEvent.click(screen.getByText('logout'));
    expect(sessionMock.clearToken).toHaveBeenCalled();
    expect(userCtxMock.value.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login', { replace: true });

    fireEvent.click(screen.getByText('denied'));
    expect(sessionMock.clearToken).toHaveBeenCalledTimes(2);
  });

  it('reports undefined access while there is no user', () => {
    userCtxMock.value = { user: null, loading: true, logout: vi.fn() };
    render(<AppShell>child</AppShell>);
    expect(screen.getByText('access-undefined')).toBeInTheDocument();
    expect(screen.getByText('loading-true')).toBeInTheDocument();
    expect(screen.getByText('user-none')).toBeInTheDocument();
  });
});

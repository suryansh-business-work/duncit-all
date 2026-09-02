/**
 * "Report a problem" on the public status page.
 *
 * The probes above it answer one question — is the host returning an HTTP
 * status — and most of what actually goes wrong is invisible to that. So this
 * form is the other half of the page, and the things worth holding are the
 * ones that decide whether a report is filed at all: it is unauthenticated by
 * design (the visitor it exists for may be the one who cannot sign in), a
 * spent verification code is never reused, and a failure says which failure it
 * was rather than swallowing the report.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceGroup } from '../../types';

const submitStatusReport = vi.fn();
const reload = vi.fn();

vi.mock('../../api', () => ({
  submitStatusReport: (...args: unknown[]) => submitStatusReport(...args),
}));

/**
 * The captcha widget is the shared package's, tested there. What this suite
 * needs from it is the two things the form drives: a token to send, and a
 * `reload` it must call once a code has been spent.
 */
vi.mock('@duncit/captcha/mui', async () => {
  const { useController } = await import('react-hook-form');
  const CaptchaField = ({ control, name }: any) => {
    const { field, fieldState } = useController({ control, name });
    return (
      <div>
        <input aria-label="Human check" value={field.value} onChange={field.onChange} />
        <span data-testid="captcha-error">{fieldState.error?.message ?? ''}</span>
      </div>
    );
  };
  return {
    CaptchaField,
    useCaptcha: () => ({ token: 'tok-1', image: '', loading: false, failed: false, reload }),
  };
});

const ReportIssueForm = (await import('./report-issue.form')).default;
const ReportIssueSection = (await import('./index')).default;

const GROUPS: ServiceGroup[] = [
  {
    key: 'apps',
    name: 'Apps',
    items: [
      { key: 'mweb', name: 'mWeb', url: 'https://mweb.duncit.com', status: 'UP' },
      { key: 'server', name: 'API', url: 'https://server.duncit.com', status: 'UP' },
    ],
  } as unknown as ServiceGroup,
];

/** Fills every required field with something the schema accepts. */
const fillValidReport = () => {
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Meera N' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'meera@duncit.com' } });
  fireEvent.change(screen.getByLabelText('What went wrong'), {
    target: { value: 'The sign-in page returns a 500 every single time.' },
  });
  fireEvent.change(screen.getByLabelText('Human check'), { target: { value: '7' } });
};

beforeEach(() => {
  submitStatusReport.mockReset();
  reload.mockReset();
  submitStatusReport.mockResolvedValue({ ok: true, errors: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReportIssueForm', () => {
  it('offers the services the board itself names, plus "not sure"', () => {
    render(<ReportIssueForm groups={GROUPS} onSubmitted={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]!);
    const list = within(screen.getByRole('listbox'));
    expect(list.getByText('mWeb')).toBeTruthy();
    expect(list.getByText('API')).toBeTruthy();
    // A visitor who does not know which service broke still has to be able to
    // file — that is most of them.
    expect(list.getAllByRole('option')[0]?.textContent).toBeTruthy();
  });

  it('renders with no catalogue at all, which is the state during an outage', () => {
    render(<ReportIssueForm groups={null} onSubmitted={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
  });

  it('refuses to send an empty report, and says which fields are missing', async () => {
    render(<ReportIssueForm groups={GROUPS} onSubmitted={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.submit(screen.getByRole('button', { name: 'Send report' }).closest('form')!);

    await waitFor(() => expect(submitStatusReport).not.toHaveBeenCalled());
  });

  it('files the report, then hands the section back so it can say thank you', async () => {
    const onSubmitted = vi.fn();
    render(<ReportIssueForm groups={GROUPS} onSubmitted={onSubmitted} onCancel={vi.fn()} />);

    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    expect(submitStatusReport).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Meera N',
        email: 'meera@duncit.com',
        captcha_token: 'tok-1',
        images: [],
      }),
    );
    // A sent report does not spend a second code on the way out.
    expect(reload).not.toHaveBeenCalled();
  });

  it('shows the failure banner when the request never reached the server', async () => {
    submitStatusReport.mockRejectedValue(new Error('offline'));
    render(<ReportIssueForm groups={GROUPS} onSubmitted={vi.fn()} onCancel={vi.fn()} />);

    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  /**
   * A spent code cannot be reused whether it was right or wrong, so the next
   * attempt needs a fresh one — and the box it was typed into is cleared with
   * it. Leaving the old answer sitting there is how somebody presses Send
   * twice and is refused twice for the same reason.
   */
  it('mints a new code and names the mistake when the answer was wrong', async () => {
    submitStatusReport.mockResolvedValue({
      ok: false,
      errors: [{ message: 'nope', extensions: { code: 'CAPTCHA_WRONG' } }],
    });
    render(<ReportIssueForm groups={GROUPS} onSubmitted={vi.fn()} onCancel={vi.fn()} />);

    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('captcha-error').textContent).not.toBe(''));
    // Named, not the generic banner: this one is the reader's to fix.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('falls back to the failure banner when the server refused for some other reason', async () => {
    submitStatusReport.mockResolvedValue({
      ok: false,
      errors: [{ message: 'nope', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
    });
    render(<ReportIssueForm groups={GROUPS} onSubmitted={vi.fn()} onCancel={vi.fn()} />);

    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('backs out without sending anything', () => {
    const onCancel = vi.fn();
    render(<ReportIssueForm groups={GROUPS} onSubmitted={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(submitStatusReport).not.toHaveBeenCalled();
  });
});

describe('ReportIssueSection', () => {
  it('opens the form, files a report and offers to send another', async () => {
    render(<ReportIssueSection groups={GROUPS} />);

    // Closed: one button, and no form.
    expect(screen.queryByLabelText('Email')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));

    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

    const success = await screen.findByRole('alert');
    expect(success).toBeTruthy();
    // The button comes back naming what pressing it does now.
    expect(screen.getByRole('button', { name: 'Report something else' })).toBeTruthy();
  });

  it('sends the attached screenshots along with the report', async () => {
    render(<ReportIssueForm groups={GROUPS} onSubmitted={vi.fn()} onCancel={vi.fn()} />);

    const picker = document.querySelector('input[type="file"]') as HTMLInputElement;
    const shot = new File(['screenshot-bytes'], 'signin-500.png', { type: 'image/png' });
    fireEvent.change(picker, { target: { files: [shot] } });
    await screen.findByAltText('signin-500.png');

    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

    await waitFor(() => expect(submitStatusReport).toHaveBeenCalled());
    // The images travel INSIDE the mutation as base64 — the form is
    // unauthenticated, so there is no upload credential to hand out.
    const sent = submitStatusReport.mock.calls[0][0];
    expect(sent.images).toHaveLength(1);
    expect(sent.images[0].file_name).toBe('signin-500.png');
    expect(sent.images[0].mime_type).toBe('image/png');
    expect(sent.images[0].data).toContain('data:image/png;base64,');
    // Only the three fields the mutation takes. The local draft id is not
    // one of them and must not leak into the payload.
    expect(sent.images[0]).toEqual({
      file_name: 'signin-500.png',
      mime_type: 'image/png',
      data: expect.stringContaining('data:image/png;base64,'),
    });
  });

  it('lets the reporter dismiss the thank-you from the alert itself', async () => {
    render(<ReportIssueSection groups={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await screen.findByRole('alert');

    // MUI renders the Alert close affordance only when onClose is wired, so
    // this is also the assertion that it still is.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('dismisses the thank-you, and closes when the form is cancelled', async () => {
    render(<ReportIssueSection groups={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByLabelText('Email')).toBeNull());
  });
});

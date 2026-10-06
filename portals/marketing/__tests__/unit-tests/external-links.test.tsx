import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { flush, renderWithProviders } from '../testkit';
import {
  campaignsForShortLinkMock,
  makeShortLinkPolicy,
  purgeShortLinkClicksMock,
  rotateShortLinkIpSaltMock,
  shortLinkOptionsMock,
  shortLinkPolicyMock,
  updateShortLinkPolicyMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({
    formatDateTime: (d: Date | string) => `fmt:${String(d)}`,
    formatDate: (d: Date | string) => `day:${String(d)}`,
  }),
}));
const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: dialogsMock.notifySuccess,
}));

import ExternalLinksPage from '../../src/pages/external-links-page/ExternalLinksPage';
import ExternalLinksTab from '../../src/pages/external-links-page/ExternalLinksTab';
import LinkPrivacyForm, {
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  linkPrivacySchema,
  policyToValues,
  toPolicyInput,
} from '../../src/pages/external-links-page/link-privacy-form';
import LinkPrivacyTab from '../../src/pages/external-links-page/privacy/LinkPrivacyTab';
import PrivacyActions from '../../src/pages/external-links-page/privacy/PrivacyActions';
import PrivacyFacts from '../../src/pages/external-links-page/privacy/PrivacyFacts';

const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

beforeEach(() => {
  __setTableRows([]);
});
afterEach(() => {
  vi.clearAllMocks();
});

/** The first validation message zod returns for the given raw values. */
const firstIssue = (values: Record<string, unknown>) => {
  const result = linkPrivacySchema(t).safeParse({
    retention_days: 365,
    honour_consent_signals: true,
    blocked_domains: '',
    ...values,
  });
  return result.success ? null : result.error.issues[0]?.message;
};

// ===========================================================================
describe('link privacy schema and mapping', () => {
  it('publishes the same bounds the server enforces', () => {
    expect(MIN_RETENTION_DAYS).toBe(30);
    expect(MAX_RETENTION_DAYS).toBe(1095);
  });

  it('accepts a whole number of days inside the window, coercing typed text', () => {
    const parsed = linkPrivacySchema(t).parse({
      retention_days: '30',
      honour_consent_signals: false,
      blocked_domains: '  a.com\nb.org  ',
    });
    expect(parsed).toEqual({
      retention_days: 30,
      honour_consent_signals: false,
      blocked_domains: 'a.com\nb.org',
    });
    expect(firstIssue({ retention_days: 1095 })).toBeNull();
  });

  it('refuses retention that is not a number', () => {
    expect(firstIssue({ retention_days: 'abc' })).toBe('Retention has to be a number of days');
  });

  it('refuses a fractional number of days', () => {
    expect(firstIssue({ retention_days: 45.5 })).toBe(
      'Retention has to be a whole number of days',
    );
  });

  it('names the bound a too-short or too-long window breaks', () => {
    expect(firstIssue({ retention_days: 29 })).toBe('Keep clicks for at least 30 days');
    expect(firstIssue({ retention_days: 1096 })).toBe('Keep clicks for at most 1095 days');
  });

  it('refuses a blocked-domain line with a space in it, ignoring blank lines', () => {
    expect(firstIssue({ blocked_domains: 'a.com b.com' })).toBe(
      'One domain per line, with no spaces',
    );
    expect(firstIssue({ blocked_domains: 'a.com\n\n  \nb.com' })).toBeNull();
  });

  it('defaults a missing domain list to empty and works without a translator', () => {
    const parsed = linkPrivacySchema().parse({
      retention_days: 90,
      honour_consent_signals: true,
    });
    expect(parsed.blocked_domains).toBe('');
    expect(
      linkPrivacySchema().safeParse({ retention_days: 1, honour_consent_signals: true }).success,
    ).toBe(false);
  });

  it('turns a stored policy into one-per-line form values', () => {
    expect(policyToValues(makeShortLinkPolicy())).toEqual({
      retention_days: 365,
      honour_consent_signals: true,
      blocked_domains: 'spam.example.com\nphish.example.org',
    });
  });

  it('turns form values back into a trimmed domain list without blank lines', () => {
    expect(
      toPolicyInput({
        retention_days: 90,
        honour_consent_signals: false,
        blocked_domains: ' a.com \n\n b.org\n   ',
      }),
    ).toEqual({
      retention_days: 90,
      honour_consent_signals: false,
      blocked_domains: ['a.com', 'b.org'],
    });
  });
});

// ===========================================================================
describe('LinkPrivacyForm', () => {
  /** Mounts the form and lets its on-mount validation settle, as it has long
   * before a person reaches the first field. */
  const renderForm = async (props: Partial<Parameters<typeof LinkPrivacyForm>[0]> = {}) => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <LinkPrivacyForm
        policy={makeShortLinkPolicy()}
        busy={false}
        onSubmit={onSubmit}
        {...props}
      />,
    );
    await act(flush);
    return onSubmit;
  };
  const consentSwitch = () =>
    within(screen.getByTestId('link-privacy-consent-signals')).getByRole('switch');
  const retention = () => screen.getByLabelText(/Keep clicks for/) as HTMLInputElement;
  const submitButton = () => screen.getByTestId('form-actions-row-submit');

  it('starts from the stored policy, with saving disabled until something changes', async () => {
    await renderForm();
    expect(retention().value).toBe('365');
    expect(
      (screen.getByLabelText(/Blocked domains/) as HTMLTextAreaElement).value,
    ).toBe('spam.example.com\nphish.example.org');
    expect(consentSwitch()).toBeChecked();
    expect(
      screen.getByText(
        'Between 30 and 1095 days. A daily sweep deletes every click older than this.',
      ),
    ).toBeInTheDocument();
    expect(submitButton()).toHaveTextContent('Save privacy settings');
    expect(submitButton()).toBeDisabled();
  });

  it('submits the parsed values once a valid change is made', async () => {
    const onSubmit = await renderForm();
    fireEvent.change(retention(), { target: { value: '400' } });
    fireEvent.click(consentSwitch());
    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        retention_days: 400,
        honour_consent_signals: false,
        blocked_domains: 'spam.example.com\nphish.example.org',
      }),
    );
  });

  it('treats switching consent back to the stored value as no change', async () => {
    await renderForm();
    fireEvent.click(consentSwitch());
    await waitFor(() => expect(submitButton()).toBeEnabled());
    expect(consentSwitch()).not.toBeChecked();
    fireEvent.click(consentSwitch());
    await waitFor(() => expect(submitButton()).toBeDisabled());
  });

  it('explains an out-of-range retention and keeps saving disabled', async () => {
    const onSubmit = await renderForm();
    fireEvent.change(retention(), { target: { value: '10' } });
    expect(await screen.findByText('Keep clicks for at least 30 days')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the last save failure above the button', async () => {
    await renderForm({ errorMessage: 'Server said no' });
    expect(screen.getByTestId('form-actions-row-error')).toHaveTextContent('Server said no');
  });
});

// ===========================================================================
describe('PrivacyFacts', () => {
  const formatDateTime = (value: Date | string) => `at:${String(value)}`;

  it('lays out the stored-click numbers and dates', () => {
    renderWithProviders(
      <PrivacyFacts policy={makeShortLinkPolicy()} formatDateTime={formatDateTime} />,
    );
    expect(screen.getByText('Stored click data')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-clicks-stored')).toHaveTextContent('Clicks stored12,345');
    expect(screen.getByTestId('privacy-clicks-beyond-retention')).toHaveTextContent(
      'Past the retention window678',
    );
    expect(screen.getByTestId('privacy-consent-minimised')).toHaveTextContent(
      'Minimised on request9',
    );
    expect(screen.getByTestId('privacy-retention-cutoff')).toHaveTextContent(
      'Deleted belowat:2025-07-31T00:00:00.000Z',
    );
    expect(screen.getByTestId('privacy-last-purge')).toHaveTextContent(
      'Last sweepat:2026-07-30T02:00:00.000Z · 4,321 removed',
    );
    expect(screen.getByTestId('privacy-salt-rotated')).toHaveTextContent(
      'Salt last rotatedat:2026-07-01T00:00:00.000Z',
    );
  });

  it('says the sweep has not run and em-dashes dates that are missing', () => {
    renderWithProviders(
      <PrivacyFacts
        policy={makeShortLinkPolicy({
          last_purge_at: null,
          retention_cutoff: '',
          ip_salt_rotated_at: '',
        })}
        formatDateTime={formatDateTime}
      />,
    );
    expect(screen.getByTestId('privacy-last-purge')).toHaveTextContent('Last sweepNot run yet');
    expect(screen.getByTestId('privacy-retention-cutoff')).toHaveTextContent('Deleted below—');
    expect(screen.getByTestId('privacy-salt-rotated')).toHaveTextContent('Salt last rotated—');
  });
});

// ===========================================================================
describe('PrivacyActions', () => {
  const renderActions = (mocks = [rotateShortLinkIpSaltMock()]) => {
    const onDone = vi.fn();
    renderWithProviders(<PrivacyActions beyondRetention={2500} onDone={onDone} />, { mocks });
    return onDone;
  };

  it('says how many clicks a sweep would remove', () => {
    renderActions();
    expect(screen.getByText('2,500 clicks are past the window and would go.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rotates the salt after confirming, then reports and refreshes', async () => {
    const onDone = renderActions();
    fireEvent.click(screen.getByTestId('privacy-rotate-salt'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Rotate the address salt?');
    expect(dialog).toHaveTextContent(/stops being comparable/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rotate salt' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith(
        'Address salt rotated — earlier hashes are now unlinkable',
      ),
    );
    expect(onDone).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('runs the sweep after confirming and reports how many clicks went', async () => {
    const onDone = renderActions([purgeShortLinkClicksMock(1234)]);
    fireEvent.click(screen.getByTestId('privacy-purge-now'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Run the retention sweep now?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete now' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('1,234 clicks deleted'),
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports zero when the sweep returns no count', async () => {
    renderActions([purgeShortLinkClicksMock(null)]);
    fireEvent.click(screen.getByTestId('privacy-purge-now'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete now' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('0 clicks deleted'));
  });

  it('keeps the dialog open with the failure instead of closing silently', async () => {
    const onDone = renderActions([rotateShortLinkIpSaltMock({ failWith: 'salt store offline' })]);
    fireEvent.click(screen.getByTestId('privacy-rotate-salt'));
    fireEvent.click(await screen.findByRole('button', { name: 'Rotate salt' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toHaveTextContent('salt store offline'));
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('backs out of a confirmation without acting', async () => {
    const onDone = renderActions();
    fireEvent.click(screen.getByTestId('privacy-purge-now'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
  });
});

// ===========================================================================
describe('LinkPrivacyTab', () => {
  const newInput = {
    retention_days: 400,
    honour_consent_signals: true,
    blocked_domains: ['spam.example.com', 'phish.example.org'],
  };

  it('shows a placeholder while the policy loads', () => {
    const { container } = renderWithProviders(<LinkPrivacyTab />, {
      mocks: [shortLinkPolicyMock()],
    });
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(screen.queryByText('Retention and consent')).not.toBeInTheDocument();
  });

  it('says so when the policy cannot be loaded', async () => {
    renderWithProviders(<LinkPrivacyTab />, {
      mocks: [shortLinkPolicyMock({}, { failWith: 'policy store down' })],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('policy store down');
  });

  it('renders the form, facts, actions and notice for the stored policy', async () => {
    renderWithProviders(<LinkPrivacyTab />, { mocks: [shortLinkPolicyMock()] });
    expect(await screen.findByText('Retention and consent')).toBeInTheDocument();
    expect((screen.getByLabelText(/Keep clicks for/) as HTMLInputElement).value).toBe('365');
    expect(screen.getByTestId('privacy-clicks-stored')).toHaveTextContent('12,345');
    expect(screen.getByTestId('privacy-retention-cutoff')).toHaveTextContent(
      'fmt:2025-07-31T00:00:00.000Z',
    );
    expect(screen.getByText('678 clicks are past the window and would go.')).toBeInTheDocument();
    expect(screen.getByText('What a click records')).toBeInTheDocument();
  });

  it('saves the policy, confirms it, and rebuilds the form from the refetch', async () => {
    renderWithProviders(<LinkPrivacyTab />, {
      mocks: [
        shortLinkPolicyMock(),
        updateShortLinkPolicyMock(newInput, { over: { retention_days: 400 } }),
        shortLinkPolicyMock({ retention_days: 400, updated_at: '2026-08-01T00:00:00.000Z' }),
      ],
    });
    fireEvent.change(await screen.findByLabelText(/Keep clicks for/), {
      target: { value: '400' },
    });
    const submit = screen.getByTestId('form-actions-row-submit');
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Privacy settings saved'),
    );
    // The refetched policy re-keys the form, so it is clean again at 400.
    await waitFor(() =>
      expect(screen.getByTestId('form-actions-row-submit')).toBeDisabled(),
    );
    expect((screen.getByLabelText(/Keep clicks for/) as HTMLInputElement).value).toBe('400');
  });

  it('shows a refused save on the form and does not claim success', async () => {
    renderWithProviders(<LinkPrivacyTab />, {
      mocks: [
        shortLinkPolicyMock(),
        updateShortLinkPolicyMock(newInput, { failWith: 'retention outside policy' }),
      ],
    });
    fireEvent.change(await screen.findByLabelText(/Keep clicks for/), {
      target: { value: '400' },
    });
    const submit = screen.getByTestId('form-actions-row-submit');
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    expect(await screen.findByTestId('form-actions-row-error')).toHaveTextContent(
      'retention outside policy',
    );
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
  });

  it('refreshes the facts after a data action', async () => {
    renderWithProviders(<LinkPrivacyTab />, {
      mocks: [
        shortLinkPolicyMock(),
        purgeShortLinkClicksMock(678),
        shortLinkPolicyMock({ clicks_stored: 11667, clicks_beyond_retention: 0 }),
      ],
    });
    fireEvent.click(await screen.findByTestId('privacy-purge-now'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete now' }));
    await waitFor(() =>
      expect(screen.getByTestId('privacy-clicks-stored')).toHaveTextContent('11,667'),
    );
    expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('678 clicks deleted');
  });

  it('says so when the refresh after an action fails, without an unhandled rejection', async () => {
    renderWithProviders(<LinkPrivacyTab />, {
      mocks: [
        shortLinkPolicyMock(),
        rotateShortLinkIpSaltMock(),
        shortLinkPolicyMock({}, { failWith: 'refresh failed' }),
      ],
    });
    fireEvent.click(await screen.findByTestId('privacy-rotate-salt'));
    fireEvent.click(await screen.findByRole('button', { name: 'Rotate salt' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith(
        'Address salt rotated — earlier hashes are now unlinkable',
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('refresh failed');
  });
});

// ===========================================================================
describe('ExternalLinksPage', () => {
  const listMocks = () => [shortLinkOptionsMock(), campaignsForShortLinkMock()];

  it('lists only external links on its own tab', async () => {
    renderWithProviders(<ExternalLinksTab />, { mocks: listMocks() });
    expect(screen.getByTestId('external-links-new')).toHaveTextContent('New external link');
    expect(await screen.findByTestId('table-empty')).toHaveTextContent(
      'No external links yet. Create one to shorten a non-Duncit URL.',
    );
  });

  it('opens on the links tab by default', async () => {
    renderWithProviders(<ExternalLinksPage />, { mocks: listMocks() });
    const page = screen.getByTestId('external-links-page');
    expect(within(page).getByRole('heading', { name: 'External Links' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Links' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Privacy & GDPR' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(await screen.findByTestId('external-links-new')).toBeInTheDocument();
    expect(screen.queryByText('Retention and consent')).not.toBeInTheDocument();
  });

  it('switches to the privacy tab', async () => {
    renderWithProviders(<ExternalLinksPage />, {
      mocks: [...listMocks(), shortLinkPolicyMock()],
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Privacy & GDPR' }));
    expect(await screen.findByText('Retention and consent')).toBeInTheDocument();
    expect(screen.queryByTestId('external-links-new')).not.toBeInTheDocument();
  });

  it('honours a privacy tab already in the URL', async () => {
    renderWithProviders(<ExternalLinksPage />, {
      mocks: [shortLinkPolicyMock()],
      initialEntries: ['/external-links?selectedtab=privacy'],
    });
    expect(screen.getByRole('tab', { name: 'Privacy & GDPR' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByText('Retention and consent')).toBeInTheDocument();
  });
});

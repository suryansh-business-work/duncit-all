import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  igSearchesErrorMock,
  igSearchesMock,
  igSettingsErrorMock,
  igSettingsMock,
  makeIgSearch,
  makeIgSettings,
  startIgSearchErrorMock,
  startIgSearchMock,
  updateIgSettingsErrorMock,
  updateIgSettingsMock,
} from '../mocks/instagram-leads.mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn(), confirm: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
  useConfirm: () => dialogsMock.confirm,
}));
// The Tech console's key editor and its emailed-code gate are that console's own
// (and covered there); here they are probes that show what they were handed.
vi.mock('../../../tech/src/pages/environment/access-gate', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="env-gate">{children}</div>,
}));
vi.mock('../../../tech/src/pages/environment/EnvVariablesTab', () => ({
  default: ({ category }: { category: string }) => <div data-testid="env-tab">{category}</div>,
}));

import { useTranslation } from '@duncit/app-settings';
import InstagramLeadsPage from '../../src/pages/instagram-leads-page';
import FindTab from '../../src/pages/instagram-leads-page/find/FindTab';
import SearchRunList from '../../src/pages/instagram-leads-page/find/SearchRunList';
import SettingsTab from '../../src/pages/instagram-leads-page/settings/SettingsTab';
import { BRIEF_MAX, blankLeadSearchValues, leadSearchSchema } from '../../src/pages/instagram-leads-page/lead-search-form/lead-search.types';
import { LIMITS, leadSettingsSchema, settingsValues } from '../../src/pages/instagram-leads-page/lead-settings-form';

afterEach(() => {
  vi.clearAllMocks();
});

const translator = () => renderHook(() => useTranslation()).result.current;

describe('InstagramLeadsPage', () => {
  it('opens on the leads with the sent count, and warns about each missing connection', async () => {
    renderWithProviders(<InstagramLeadsPage />, {
      initialEntries: ['/instagram-leads'],
      mocks: [igSettingsMock(makeIgSettings({ serper_ready: false, instagram_ready: false }))],
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Instagram Leads' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('Lead search needs a Serper key. Add it under Settings.')).toBeInTheDocument();
    expect(screen.getByText('Connect an Instagram business account in Social Accounts. Profiles are read through it.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Leads' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('ig-leads-tab')).toHaveTextContent('4 of 20 DMs sent today');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('warns only about the connection that is missing', async () => {
    renderWithProviders(<InstagramLeadsPage />, { mocks: [igSettingsMock(makeIgSettings({ instagram_ready: false }))] });
    expect(await screen.findByText(/Connect an Instagram business account/)).toBeInTheDocument();
    expect(screen.queryByText(/needs a Serper key/)).not.toBeInTheDocument();
  });

  it('warns about nothing once both are connected, and opens Settings from the URL', async () => {
    renderWithProviders(<InstagramLeadsPage />, {
      initialEntries: ['/instagram-leads?selectedtab=settings'],
      mocks: [igSettingsMock(makeIgSettings())],
    });
    expect(await screen.findByTestId('ig-leads-settings')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows why the settings could not be read, and keeps Settings empty without them', async () => {
    renderWithProviders(<InstagramLeadsPage />, {
      initialEntries: ['/instagram-leads?selectedtab=settings'],
      mocks: [igSettingsErrorMock('Not allowed')],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Not allowed');
    expect(screen.queryByTestId('ig-leads-settings')).not.toBeInTheDocument();
  });

  it('switches to the search tab', async () => {
    renderWithProviders(<InstagramLeadsPage />, { mocks: [igSettingsMock(makeIgSettings()), igSearchesMock([])] });
    fireEvent.click(screen.getByRole('tab', { name: 'Find leads' }));
    expect(await screen.findByTestId('ig-leads-find')).toBeInTheDocument();
    expect(screen.queryByTestId('ig-leads-tab')).not.toBeInTheDocument();
  });
});

describe('leadSearchSchema', () => {
  it('trims the brief and keeps it within the server’s bounds, and starts blank at twenty results', () => {
    const schema = leadSearchSchema(translator().t);
    expect(blankLeadSearchValues()).toEqual({ brief: '', max_results: 20 });
    expect(schema.parse({ brief: '  Dog trainers in Bangalore  ', max_results: 20 })).toEqual({ brief: 'Dog trainers in Bangalore', max_results: 20 });
    expect(schema.safeParse({ brief: '  short   ', max_results: 20 }).error?.issues[0]?.message).toBe('Describe the leads in at least 10 characters.');
    expect(schema.safeParse({ brief: 'x'.repeat(BRIEF_MAX + 1), max_results: 20 }).error?.issues[0]?.message).toBe('Keep the brief under 500 characters.');
    expect(schema.safeParse({ brief: 'Dog trainers in Bangalore', max_results: 51 }).success).toBe(false);
  });
});

describe('SearchRunList', () => {
  it('says when there are no searches yet', () => {
    renderWithProviders(<SearchRunList searches={[]} />);
    expect(screen.getByText('No searches yet.')).toBeInTheDocument();
  });

  it('shows each run: running with its bar, done with its counts, failed with its error', () => {
    renderWithProviders(
      <SearchRunList
        searches={[
          makeIgSearch({ id: 'r', brief: 'Running brief', status: 'RUNNING', summary: '', queries: [], created_at: null }),
          makeIgSearch({ id: 'd', brief: 'Done brief' }),
          makeIgSearch({ id: 'f', brief: 'Failed brief', status: 'FAILED', summary: '', queries: [], error: 'Serper quota used up' }),
        ]}
      />,
    );
    const [running, done, failed] = screen.getAllByRole('listitem');
    expect(within(running).getByText('Running brief')).toBeInTheDocument();
    expect(within(running).getByRole('progressbar', { name: 'Searching' })).toBeInTheDocument();
    expect(within(running).queryByText(/^fmt:/)).not.toBeInTheDocument();
    expect(within(running).queryByText(/profiles found/)).not.toBeInTheDocument();

    expect(within(done).getByText('fmt:2026-10-31T08:00:00.000Z')).toBeInTheDocument();
    expect(within(done).getByText('Done')).toBeInTheDocument();
    expect(within(done).getByText('Pet trainers and groomers with 1k-50k followers')).toBeInTheDocument();
    expect(within(done).getByText('dog trainer bangalore instagram')).toBeInTheDocument();
    expect(within(done).getByText('pet groomer bangalore')).toBeInTheDocument();
    expect(within(done).getByText(/^14 profiles found, 9 new leads added, 5 skipped/)).toBeInTheDocument();
    expect(within(done).queryByRole('progressbar')).not.toBeInTheDocument();

    expect(within(failed).getByText('Failed')).toBeInTheDocument();
    expect(within(failed).getByRole('alert')).toHaveTextContent('Serper quota used up');
    expect(within(failed).queryByText(/profiles found/)).not.toBeInTheDocument();
  });
});

const briefBox = () => screen.getByRole('textbox', { name: 'Who do you want to reach?' });

describe('FindTab', () => {
  it('shows the bar while the runs load, then says there are none', async () => {
    renderWithProviders(<FindTab />, { mocks: [igSearchesMock([])] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('No searches yet.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows why the runs could not be read', async () => {
    renderWithProviders(<FindTab />, { mocks: [igSearchesErrorMock('Searches unavailable')] });
    expect(await screen.findByRole('alert')).toHaveTextContent('Searches unavailable');
  });

  it('refuses a brief that is too short before anything is sent', async () => {
    renderWithProviders(<FindTab />, { mocks: [igSearchesMock([])] });
    fireEvent.change(briefBox(), { target: { value: 'dogs' } });
    fireEvent.click(screen.getByTestId('ig-lead-search-start'));
    expect(await screen.findByText('Describe the leads in at least 10 characters.')).toBeInTheDocument();
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('starts nothing on Enter: only Search sends, so the page never submits away', async () => {
    renderWithProviders(<FindTab />, { mocks: [igSearchesMock([])] });
    await screen.findByText('No searches yet.');
    fireEvent.change(briefBox(), { target: { value: 'Dog trainers in Bangalore' } });
    expect(fireEvent.submit(screen.getByTestId('ig-lead-search-form'))).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(dialogsMock.notify).not.toHaveBeenCalled();
    expect(briefBox()).toHaveValue('Dog trainers in Bangalore');
  });

  it('starts a search with the trimmed brief, says so, clears the brief and reads the runs again', async () => {
    const started = makeIgSearch({ id: 's2', brief: 'Dog trainers in Bangalore', status: 'DONE' });
    renderWithProviders(<FindTab />, {
      mocks: [igSearchesMock([]), startIgSearchMock('Dog trainers in Bangalore', 20, started), igSearchesMock([started])],
    });
    await screen.findByText('No searches yet.');
    fireEvent.change(briefBox(), { target: { value: '  Dog trainers in Bangalore ' } });
    fireEvent.click(screen.getByTestId('ig-lead-search-start'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Search started. Its progress shows below.', 'success'));
    await waitFor(() => expect(briefBox()).toHaveValue(''));
    expect(await screen.findByText(/^14 profiles found/)).toBeInTheDocument();
  });

  it('sends the count picked, and keeps the brief when the server refuses', async () => {
    renderWithProviders(<FindTab />, {
      mocks: [igSearchesMock([]), startIgSearchErrorMock('Pet groomers in Pune', 50, 'Add a Serper key first')],
    });
    await screen.findByText('No searches yet.');
    fireEvent.change(briefBox(), { target: { value: 'Pet groomers in Pune' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Add at most/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '50' }));
    fireEvent.click(screen.getByTestId('ig-lead-search-start'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Add a Serper key first', 'error'));
    expect(briefBox()).toHaveValue('Pet groomers in Pune');
  });

  it('allows one run at a time: no new search while one is running', async () => {
    renderWithProviders(<FindTab />, { mocks: [igSearchesMock([makeIgSearch({ status: 'RUNNING' })])] });
    expect(await screen.findByRole('progressbar', { name: 'Searching' })).toBeInTheDocument();
    expect(screen.getByTestId('ig-lead-search-start')).toBeDisabled();
  });
});

describe('leadSettingsSchema', () => {
  const schema = () => leadSettingsSchema(translator().t);
  const valid = settingsValues(makeIgSettings());

  it('starts from the saved settings and reads typed numbers as numbers', () => {
    expect(valid).toEqual({ max_follow_ups: 2, follow_up_gap_days: 3, daily_send_limit: 20, pitch: 'Host your sessions as Duncit pods' });
    expect(schema().parse({ ...valid, max_follow_ups: '0', pitch: '  Pods  ' })).toEqual({ ...valid, max_follow_ups: 0, pitch: 'Pods' });
  });

  it('refuses a fraction, a number outside the server’s bounds, and a missing or overlong pitch', () => {
    const issue = (values: object) => schema().safeParse({ ...valid, ...values }).error?.issues[0]?.message;
    expect(issue({ follow_up_gap_days: 1.5 })).toBe('Enter a whole number.');
    expect(issue({ max_follow_ups: LIMITS.max_follow_ups.max + 1 })).toBe('Enter a number from 0 to 10.');
    expect(issue({ follow_up_gap_days: 0 })).toBe('Enter a number from 1 to 30.');
    expect(issue({ daily_send_limit: 101 })).toBe('Enter a number from 1 to 100.');
    expect(issue({ pitch: '   ' })).toBe('Write what you are offering.');
    expect(issue({ pitch: 'x'.repeat(LIMITS.pitch.max + 1) })).toBe('Keep this under 1000 characters.');
  });
});

describe('SettingsTab', () => {
  const field = (name: RegExp) => screen.getByRole('spinbutton', { name });
  const pitchBox = () => screen.getByRole('textbox', { name: /What are you offering\?/ });

  it('starts from the saved settings with Save off, and puts the Serper key behind the Tech gate', () => {
    renderWithProviders(<SettingsTab settings={makeIgSettings()} />);
    expect(field(/Follow-ups after the first message/)).toHaveValue(2);
    expect(field(/Days between messages/)).toHaveValue(3);
    expect(field(/DMs per day/)).toHaveValue(20);
    expect(pitchBox()).toHaveValue('Host your sessions as Duncit pods');
    expect(screen.getByTestId('ig-lead-settings-save')).toBeDisabled();
    // Enter in a field submits nothing; Save is the only way a change goes out.
    expect(fireEvent.submit(screen.getByTestId('ig-lead-settings-form'))).toBe(false);
    expect(within(screen.getByTestId('env-gate')).getByTestId('env-tab')).toHaveTextContent('SERPER');
  });

  it('saves the changed settings as numbers with a trimmed pitch, and says so', async () => {
    renderWithProviders(<SettingsTab settings={makeIgSettings()} />, {
      mocks: [
        updateIgSettingsMock(
          { max_follow_ups: 4, follow_up_gap_days: 3, daily_send_limit: 20, pitch: 'Pods near you' },
          makeIgSettings({ max_follow_ups: 4, pitch: 'Pods near you' }),
        ),
      ],
    });
    fireEvent.change(field(/Follow-ups after the first message/), { target: { value: '4' } });
    fireEvent.change(pitchBox(), { target: { value: '  Pods near you  ' } });
    // The edit lands once the resolver has read it; Save turns on only then.
    await waitFor(() => expect(screen.getByTestId('ig-lead-settings-save')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ig-lead-settings-save'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Settings saved.', 'success'));
  });

  it('says what is wrong and sends nothing until it is fixed', async () => {
    renderWithProviders(<SettingsTab settings={makeIgSettings()} />);
    fireEvent.change(field(/DMs per day/), { target: { value: '500' } });
    expect(await screen.findByText('Enter a number from 1 to 100.')).toBeInTheDocument();
    fireEvent.change(pitchBox(), { target: { value: '' } });
    expect(await screen.findByText('Write what you are offering.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ig-lead-settings-save'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('reports a refused save', async () => {
    renderWithProviders(<SettingsTab settings={makeIgSettings()} />, {
      mocks: [updateIgSettingsErrorMock({ max_follow_ups: 2, follow_up_gap_days: 7, daily_send_limit: 20, pitch: 'Host your sessions as Duncit pods' }, 'Only a manager can change this')],
    });
    fireEvent.change(field(/Days between messages/), { target: { value: '7' } });
    await waitFor(() => expect(screen.getByTestId('ig-lead-settings-save')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ig-lead-settings-save'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Only a manager can change this', 'error'));
  });
});

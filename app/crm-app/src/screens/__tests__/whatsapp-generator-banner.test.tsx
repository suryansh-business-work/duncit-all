import { act, fireEvent, screen } from '@testing-library/react-native';

import { useWaExtraction } from '@/features/whatsapp-generator/extractionStore';
import * as docs from '@/graphql/whatsappGenerator';
import { navigationRef } from '@/navigation/navigationRef';
import { gqlRequest } from '@/services/graphql.client';
import { useAuthStore } from '@/stores/auth.store';
import { renderWithTheme } from '@/test-utils';
import { WaExtractionBanner } from '../whatsapp-generator/extraction/WaExtractionBanner';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(() => true), navigate: jest.fn() },
}));

/** The extraction's progress over every screen — the portal's floating widget on the phone. */

const request = gqlRequest as jest.Mock;
const job = (o: Record<string, unknown> = {}) => ({
  id: 'job-1',
  status: 'RUNNING',
  total: 0,
  processed: 0,
  valid: 0,
  invalid: 0,
  duplicates: 0,
  communities: 0,
  groups: 0,
  leads_created: 0,
  error: null,
  ...o,
});
let current: ReturnType<typeof job> | null = null;
const serve = (cancel: () => unknown = () => ({ waCancelExtraction: { id: 'job-1' } })) =>
  request.mockImplementation(async (doc: unknown) => {
    if (doc === docs.CrmAppWhatsappExtractionDocument) return { waExtraction: current };
    if (doc === docs.CrmAppWhatsappCancelExtractionDocument) return cancel();
    throw new Error('unexpected operation');
  });
const press = (id: string) => act(async () => fireEvent.press(screen.getByTestId(id)));
const openCard = async (chip: string) => {
  fireEvent.press(await screen.findByText(chip));
  return screen.findByTestId('wa-extraction-card');
};

beforeEach(() => {
  jest.clearAllMocks();
  current = null;
  serve();
  useAuthStore.setState({ status: 'signedIn' });
});

afterEach(() => {
  useWaExtraction.getState().stop();
});

describe('WaExtractionBanner', () => {
  it('renders nothing while signed out, and asks for no job', () => {
    useAuthStore.setState({ status: 'signedOut' });
    current = job();
    renderWithTheme(<WaExtractionBanner />);
    expect(screen.queryByTestId('wa-extraction-banner')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('floats a running job as a chip with an unknown total, then expands and minimizes it', async () => {
    current = job();
    renderWithTheme(<WaExtractionBanner />);
    await openCard('Extracting 0%');
    expect(screen.getByText('Extracting data…')).toBeOnTheScreen();
    expect(screen.getByText('0 / … contacts (0%)')).toBeOnTheScreen();
    expect(screen.getByTestId('wa-extraction-bar').props.accessibilityValue).toBeUndefined();
    expect(screen.getByText('New leads: 0')).toBeOnTheScreen();
    await press('wa-extraction-minimize');
    expect(await screen.findByText('Extracting 0%')).toBeOnTheScreen();
    expect(screen.queryByTestId('wa-extraction-card')).toBeNull();
  });

  it('shows real progress and the full summary, with a way to the WhatsApp Leads', async () => {
    current = job({
      total: 200,
      processed: 50,
      valid: 40,
      invalid: 6,
      duplicates: 4,
      communities: 3,
      groups: 12,
      leads_created: 38,
    });
    renderWithTheme(<WaExtractionBanner />);
    await openCard('Extracting 25%');
    expect(screen.getByText('50 / 200 contacts (25%)')).toBeOnTheScreen();
    expect(screen.getByTestId('wa-extraction-bar').props.accessibilityValue).toMatchObject({
      now: 25,
    });
    expect(screen.getByText('Valid: 40')).toBeOnTheScreen();
    expect(screen.getByText('Invalid: 6')).toBeOnTheScreen();
    expect(screen.getByText('Duplicates: 4')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cancel extraction')).toBeOnTheScreen();

    await press('wa-extraction-details');
    expect(screen.getByText('Extraction summary')).toBeOnTheScreen();
    expect(screen.getByText('50 / 200')).toBeOnTheScreen();
    expect(screen.getByText('38')).toBeOnTheScreen();
    expect(screen.getByText('RUNNING')).toBeOnTheScreen();
    expect(screen.queryByTestId('wa-extraction-summary-error')).toBeNull();
    await press('wa-extraction-leads');
    expect(navigationRef.navigate).toHaveBeenCalledWith('UserLeads');
    expect(screen.queryByTestId('wa-extraction-summary')).toBeNull();
  });

  it('cancels a running job and shows it cancelled, or why the cancel failed', async () => {
    current = job({ total: 200, processed: 50 });
    serve(() => {
      current = job({ status: 'CANCELLED', total: 200, processed: 80 });
      return { waCancelExtraction: { id: 'job-1' } };
    });
    renderWithTheme(<WaExtractionBanner />);
    await openCard('Extracting 25%');
    await press('wa-extraction-close');
    expect(await screen.findByText('Extraction cancelled')).toBeOnTheScreen();
    expect(screen.getByText('80 contacts processed')).toBeOnTheScreen();
    expect(screen.getByTestId('wa-extraction-bar').props.accessibilityValue).toMatchObject({
      now: 100,
    });

    current = job({ total: 200, processed: 90 });
    serve(() => Promise.reject(new Error('Gateway went away')));
    await act(() => useWaExtraction.getState().load());
    await press('wa-extraction-close');
    expect(await screen.findByText('Gateway went away')).toBeOnTheScreen();
  });

  it('dismisses a finished job until the next one', async () => {
    current = job({ status: 'DONE', total: 20, processed: 20, leads_created: 7 });
    renderWithTheme(<WaExtractionBanner />);
    await openCard('Extraction finished');
    expect(screen.getByText('20 contacts processed')).toBeOnTheScreen();
    expect(screen.getByText('New leads: 7')).toBeOnTheScreen();
    expect(screen.getByLabelText('Dismiss')).toBeOnTheScreen();
    await press('wa-extraction-close');
    expect(screen.queryByTestId('wa-extraction-banner')).toBeNull();

    current = job({ id: 'job-2' });
    await act(() => useWaExtraction.getState().load());
    expect(screen.getByTestId('wa-extraction-banner')).toBeOnTheScreen();
  });

  it('explains a failed job, with the server reason in the summary or a generic line', async () => {
    current = job({ status: 'FAILED', total: 50, processed: 5, error: 'Session logged out' });
    renderWithTheme(<WaExtractionBanner />);
    await openCard('Extraction failed');
    expect(screen.getByTestId('wa-extraction-failed')).toHaveTextContent('Session logged out');
    await press('wa-extraction-details');
    expect(screen.getByTestId('wa-extraction-summary-error')).toHaveTextContent(
      'Session logged out',
    );
    await press('wa-extraction-summary-close');

    current = job({ id: 'job-3', status: 'FAILED', error: null });
    await act(() => useWaExtraction.getState().load());
    expect(screen.getByTestId('wa-extraction-failed')).toHaveTextContent('Extraction failed.');
  });

  it('forgets the job at sign-out', async () => {
    current = job();
    renderWithTheme(<WaExtractionBanner />);
    expect(await screen.findByText('Extracting 0%')).toBeOnTheScreen();
    act(() => useAuthStore.setState({ status: 'signedOut' }));
    expect(screen.queryByTestId('wa-extraction-banner')).toBeNull();
    expect(useWaExtraction.getState().job).toBeNull();
  });
});

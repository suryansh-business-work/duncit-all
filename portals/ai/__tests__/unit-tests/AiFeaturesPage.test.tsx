import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import AiFeaturesPage from '../../src/pages/ai-features';
import FeaturesTable from '../../src/pages/ai-features/FeaturesTable';
import {
  AI_FEATURES,
  DEFAULT_FEATURE_RANGE,
  FEATURE_RANGE_DAYS,
  SET_AI_FEATURE_ENABLED,
  type AiFeature,
} from '../../src/pages/ai-features/queries';
import { renderWithProviders } from '../testkit';
import { answerQuery, mutationOf, queryOptions, resetApollo } from './reel-apollo-mock';

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => confirm,
}));

vi.mock('@duncit/table', async () => ({
  ...(await import('./table-mock')),
  dateColumn: (options: object) => options,
}));

/**
 * AI Features — every AI call site with its On/Off switch and its spend.
 *
 * The switch is the dangerous part: turning a moderation scan off silently
 * downgrades every upload to rule-based checks, so OFF must ask first and say
 * what happens instead, while ON needs no ceremony.
 */
const feature = (over: Partial<AiFeature> = {}): AiFeature => ({
  key: 'moderation.scan',
  label: 'Moderation scan',
  module: 'Safety',
  description: 'Scans every upload for unsafe content',
  when_off: 'Rule-based checks only',
  enabled: true,
  updated_by_name: null,
  updated_at: null,
  range_days: 30,
  calls: 1204,
  failed_calls: 3,
  skipped_calls: 2,
  prompt_tokens: 12_000,
  completion_tokens: 3_400,
  total_tokens: 15_400,
  cost_usd: 1.24,
  avg_duration_ms: 1420,
  unpriced_calls: 0,
  last_called_at: '2026-10-14T10:00:00.000Z',
  ...over,
});

const DESCRIBE = feature({
  key: 'pod/describe',
  label: 'Describe a pod',
  module: 'Pods',
  description: 'Writes the pod blurb',
  when_off: 'Hosts write their own',
  enabled: false,
  prompt_tokens: 800,
  completion_tokens: 120,
  cost_usd: 0.42,
  unpriced_calls: 3,
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

const mount = (path = '/ai-features') =>
  renderWithProviders(<AiFeaturesPage />, {
    initialEntries: [path],
    routes: (
      <>
        <Route
          path="/ai-features"
          element={
            <>
              <AiFeaturesPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/ai-features/:key" element={<LocationProbe />} />
      </>
    ),
  });

const switchOf = (name: string) => screen.getByLabelText(`Switch ${name} on or off`);

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('AiFeaturesPage — the list', () => {
  it('lists every feature with its area, usage and switch state', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [feature(), DESCRIBE] } });
    mount();

    expect(await screen.findAllByTestId('table-row')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'AI Features' })).toBeInTheDocument();
    expect(screen.getByText('Moderation scan')).toBeInTheDocument();
    // The key is what someone greps the server for.
    expect(screen.getByText('moderation.scan')).toBeInTheDocument();
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('12,000')).toBeInTheDocument();
    expect(screen.getByText('3,400')).toBeInTheDocument();
    expect(screen.getByText('$1.24')).toBeInTheDocument();
    expect(switchOf('Moderation scan')).toBeChecked();
    expect(switchOf('Describe a pod')).not.toBeChecked();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('asks for the default 30-day window when the URL names none', () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [] } });
    mount();

    expect(DEFAULT_FEATURE_RANGE).toBe(30);
    expect(queryOptions.get(AI_FEATURES)?.variables).toEqual({ range_days: 30 });
  });

  it('reads the window from ?days= so a shared link opens on the same range', () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [] } });
    mount('/ai-features?days=7');

    expect(queryOptions.get(AI_FEATURES)?.variables).toEqual({ range_days: 7 });
    expect(screen.getByLabelText('Range')).toHaveTextContent('Last 7 days');
  });

  it('ignores a ?days= value that is not one of the presets', () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [] } });
    mount('/ai-features?days=5');

    // 5 is not offered, and 365 would ask the server past its 90-day cap.
    expect(queryOptions.get(AI_FEATURES)?.variables).toEqual({ range_days: 30 });
    expect(screen.getByLabelText('Range')).toHaveTextContent('Last 30 days');
  });

  it('offers exactly the four range presets, each with its own label', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [] } });
    mount();

    fireEvent.mouseDown(screen.getByLabelText('Range'));
    const options = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(FEATURE_RANGE_DAYS).toEqual([1, 7, 30, 90]);
    expect(options.map((o) => o.textContent)).toEqual([
      'Last 24h',
      'Last 7 days',
      'Last 30 days',
      'Last 90 days',
    ]);
  });

  it('writes a new range into the URL, keeping the other params, and refetches against it', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [] } });
    mount('/ai-features?tab=x');

    fireEvent.mouseDown(screen.getByLabelText('Range'));
    fireEvent.click(within(await screen.findByRole('listbox')).getByText('Last 90 days'));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/ai-features?tab=x&days=90'));
    expect(queryOptions.get(AI_FEATURES)?.variables).toEqual({ range_days: 90 });
  });

  it('shows a spinner, not an empty table, while the first load is in flight', () => {
    answerQuery(AI_FEATURES, { loading: true });
    mount();

    expect(screen.getByTestId('loader')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
    // The range stays usable while it loads.
    expect(screen.getByLabelText('Range')).toBeInTheDocument();
  });

  it('says the load failed when there is nothing to show', () => {
    answerQuery(AI_FEATURES, { error: new Error('boom') });
    mount();

    expect(screen.getByText('Could not load the AI features. Try again.')).toBeInTheDocument();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
  });

  it('keeps the rows it already has when a background refresh fails', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [feature()] }, error: new Error('boom') });
    mount();

    expect(await screen.findByText('Moderation scan')).toBeInTheDocument();
    expect(screen.queryByText('Could not load the AI features. Try again.')).not.toBeInTheDocument();
  });

  it('treats an answer with no list in it as no features rather than failing', async () => {
    answerQuery(AI_FEATURES, {});
    mount();

    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No AI features found.');
  });

  it('renders an empty table when the catalogue has no rows', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [] } });
    mount();

    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No AI features found.');
  });

  it('opens a feature on its own page, carrying the range and escaping the key', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [DESCRIBE] } });
    mount('/ai-features?days=7');

    fireEvent.click(await screen.findByTestId('table-row'));

    expect(await screen.findByTestId('location')).toHaveTextContent('/ai-features/pod%2Fdescribe?days=7');
  });

  it('marks the cost of a feature that used an unrated model as a minimum', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [feature(), DESCRIBE] } });
    mount();

    await screen.findAllByTestId('table-row');
    expect(
      screen.getByLabelText('3 call(s) used a model with no rate card entry — the cost shown is a minimum.')
    ).toHaveTextContent('$0.4200');
    // A fully-priced feature carries no such note.
    expect(screen.getAllByLabelText(/no rate card entry/)).toHaveLength(1);
  });

  it('searches by label, area, key or description', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [feature(), DESCRIBE] } });
    mount();

    await screen.findAllByTestId('table-row');
    fireEvent.change(screen.getByLabelText('table-search'), { target: { value: 'blurb' } });

    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));
    expect(screen.getByText('Describe a pod')).toBeInTheDocument();
  });
});

describe('AiFeaturesPage — the switch', () => {
  it('asks before switching a feature off and does nothing when declined', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [feature()] } });
    confirm.mockResolvedValue(false);
    mount();

    fireEvent.click(await screen.findByLabelText('Switch Moderation scan on or off'));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledWith({
      title: 'Switch off Moderation scan?',
      message: 'While it is off: Rule-based checks only',
      confirmLabel: 'Switch off',
      destructive: true,
    });
    expect(mutationOf(SET_AI_FEATURE_ENABLED)).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('switches off once confirmed, says so and reloads the list', async () => {
    const refetch = answerQuery(AI_FEATURES, { data: { aiFeatures: [feature()] } });
    confirm.mockResolvedValue(true);
    mount();

    fireEvent.click(await screen.findByLabelText('Switch Moderation scan on or off'));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Moderation scan switched off'));
    expect(mutationOf(SET_AI_FEATURE_ENABLED)).toHaveBeenCalledWith({
      variables: { key: 'moderation.scan', enabled: false },
    });
    expect(refetch).toHaveBeenCalled();
  });

  it('switches back on without a confirmation', async () => {
    const refetch = answerQuery(AI_FEATURES, { data: { aiFeatures: [DESCRIBE] } });
    mount();

    fireEvent.click(await screen.findByLabelText('Switch Describe a pod on or off'));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Describe a pod switched on'));
    expect(confirm).not.toHaveBeenCalled();
    expect(mutationOf(SET_AI_FEATURE_ENABLED)).toHaveBeenCalledWith({
      variables: { key: 'pod/describe', enabled: true },
    });
    expect(refetch).toHaveBeenCalled();
  });

  it('disables the row switch while its save is in flight', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [DESCRIBE, feature()] } });
    let finish: (value: unknown) => void = () => undefined;
    mutationOf(SET_AI_FEATURE_ENABLED).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    mount();

    fireEvent.click(await screen.findByLabelText('Switch Describe a pod on or off'));

    await waitFor(() => expect(switchOf('Describe a pod')).toBeDisabled());
    // Only the row being saved is locked.
    expect(switchOf('Moderation scan')).toBeEnabled();
    await act(async () => finish({ data: {} }));
    await waitFor(() => expect(switchOf('Describe a pod')).toBeEnabled());
  });

  it('reports a refused save with the server message and does not reload', async () => {
    const refetch = answerQuery(AI_FEATURES, { data: { aiFeatures: [DESCRIBE] } });
    mutationOf(SET_AI_FEATURE_ENABLED).mockRejectedValue(new Error('Only AI managers can do that'));
    mount();

    fireEvent.click(await screen.findByLabelText('Switch Describe a pod on or off'));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Only AI managers can do that'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
    await waitFor(() => expect(switchOf('Describe a pod')).toBeEnabled());
  });

  it('falls back to its own message when the failure says nothing', async () => {
    answerQuery(AI_FEATURES, { data: { aiFeatures: [DESCRIBE] } });
    mutationOf(SET_AI_FEATURE_ENABLED).mockRejectedValue({});
    mount();

    fireEvent.click(await screen.findByLabelText('Switch Describe a pod on or off'));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not change the switch. Try again.'));
  });

  it('survives the list reload failing after a successful save', async () => {
    const refetch = answerQuery(AI_FEATURES, {
      data: { aiFeatures: [DESCRIBE] },
      refetch: vi.fn(() => Promise.reject(new Error('offline'))),
    });
    mount();

    fireEvent.click(await screen.findByLabelText('Switch Describe a pod on or off'));

    // The save itself succeeded, so it is still reported as done.
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Describe a pod switched on'));
    expect(refetch).toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();
  });
});

describe('FeaturesTable', () => {
  function Harness() {
    const [rows, setRows] = useState<AiFeature[]>([feature()]);
    return (
      <>
        <button type="button" onClick={() => setRows([feature(), DESCRIBE])}>
          swap rows
        </button>
        <FeaturesTable rows={rows} pendingKey={null} onToggle={vi.fn()} onOpen={vi.fn()} />
      </>
    );
  }

  it('reloads the grid when new rows arrive (a range switch or a saved toggle)', async () => {
    renderWithProviders(<Harness />);

    expect(await screen.findAllByTestId('table-row')).toHaveLength(1);
    fireEvent.click(screen.getByText('swap rows'));

    // The grid reloads on its own query state, so without the explicit reload
    // the new rows would never show.
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    expect(screen.getByText('Describe a pod')).toBeInTheDocument();
  });

  it('hands the toggle the feature and the new state', async () => {
    const onToggle = vi.fn();
    renderWithProviders(
      <FeaturesTable rows={[feature()]} pendingKey={null} onToggle={onToggle} onOpen={vi.fn()} />
    );

    fireEvent.click(await screen.findByLabelText('Switch Moderation scan on or off'));

    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ key: 'moderation.scan' }), false);
  });
});

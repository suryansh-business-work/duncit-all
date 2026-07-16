import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CreateAdPage from '../../src/pages/create-ad-page/CreateAdPage';
import { blankAdRequestValues } from '../../src/pages/create-ad-page/ad-request';
import { renderWithProviders } from './testkit';

const mut = vi.hoisted(() => ({ fn: vi.fn() }));
const notify = vi.hoisted(() => ({ success: vi.fn() }));
const formProbe = vi.hoisted(() => ({ values: null as any }));

vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useQuery: () => ({
    data: {
      adPricing: {
        auto_per_day: 900,
        home_bottom_per_day: 500,
        sidebar_per_day: 400,
        explore_scroll_per_day: 600,
        status_per_day: 700,
        venue_list_per_day: 300,
        club_list_per_day: 300,
        pod_list_per_day: 350,
        pod_details_per_day: 450,
        currency_symbol: '₹',
      },
    },
    loading: false,
  }),
  useMutation: () => [mut.fn, { loading: false }],
}));

vi.mock('@duncit/dialogs', () => ({ notifySuccess: (msg: string) => notify.success(msg) }));

vi.mock('../../src/pages/create-ad-page/ad-request', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/pages/create-ad-page/ad-request')>()),
  default: (props: Record<string, any>) => (
    <div>
      <div data-testid="form-error">{props.errorMessage ?? ''}</div>
      <div data-testid="form-busy">{String(props.busy)}</div>
      <button onClick={() => props.onValuesChange(formProbe.values)}>change</button>
      <button onClick={() => props.onSubmit(formProbe.values)}>submit</button>
    </div>
  ),
}));

vi.mock('../../src/pages/create-ad-page/EstimateCard', () => ({
  default: (props: Record<string, any>) => (
    <div data-testid="estimate">
      {props.position}:{String(props.loading)}
    </div>
  ),
}));

const validValues = () => ({
  ...blankAdRequestValues(),
  ad_title: 'Weekend Mega Sale',
  ad_description: 'Flat discounts across every listing this weekend only.',
  media_url: 'https://ik.imagekit.io/duncit/ads/banner.png',
  position: 'SIDEBAR' as const,
  duration_days: 10,
});

const renderCreate = () =>
  renderWithProviders(<></>, {
    initialEntries: ['/ads/new'],
    routes: (
      <>
        <Route path="/ads/new" element={<CreateAdPage />} />
        <Route path="/ads/:id" element={<div>DETAIL ROUTE</div>} />
      </>
    ),
  });

beforeEach(() => {
  formProbe.values = validValues();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('CreateAdPage', () => {
  it('renders the header and a live estimate seeded from the draft', () => {
    renderCreate();
    expect(screen.getByText('Create Ad')).toBeInTheDocument();
    // Draft starts from blankAdRequestValues → position AUTO.
    expect(screen.getByTestId('estimate')).toHaveTextContent('AUTO:false');
  });

  it('reflects form value changes into the estimate card', () => {
    renderCreate();
    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    expect(screen.getByTestId('estimate')).toHaveTextContent('SIDEBAR:false');
  });

  it('submits, notifies success and navigates to the new ad', async () => {
    mut.fn.mockResolvedValue({ data: { submitAdRequest: { id: 'ad9', trace_id: 'AD-9' } } });
    renderCreate();
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(screen.getByText('DETAIL ROUTE')).toBeInTheDocument());
    expect(notify.success).toHaveBeenCalledWith(expect.stringContaining('AD-9'));
  });

  it('shows an error when the server returns no created ad', async () => {
    mut.fn.mockResolvedValue({ data: null });
    renderCreate();
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent(/could not be submitted/i),
    );
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('surfaces a thrown mutation error', async () => {
    mut.fn.mockRejectedValue(new Error('Server boom'));
    renderCreate();
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(screen.getByTestId('form-error')).toHaveTextContent('Server boom'));
  });
});

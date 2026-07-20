import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CreateAdPage from '../../src/pages/create-ad-page/CreateAdPage';
import type { AdRequestFormValues } from '@duncit/ad-request-form';
import {
  adPricingMock,
  makeAdRequestFormValues,
  submitAdRequestErrorMock,
  submitAdRequestMock,
} from '../mocks';
import { renderWithProviders } from '../testkit';

const notify = vi.hoisted(() => ({ success: vi.fn() }));
const formProbe = vi.hoisted(() => ({ values: null as unknown as AdRequestFormValues }));

vi.mock('@duncit/dialogs', () => ({ notifySuccess: (msg: string) => notify.success(msg) }));

// Component stubs: the real RHF form + estimate card have their own specs in
// @duncit/ad-request-form. The probe lets us drive onValuesChange/onSubmit
// directly with typed mock values (keep the other package exports real).
vi.mock('@duncit/ad-request-form', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/ad-request-form')>()),
  AdRequestForm: (props: {
    errorMessage?: string | null;
    busy: boolean;
    onValuesChange: (v: AdRequestFormValues) => void;
    onSubmit: (v: AdRequestFormValues) => void;
  }) => (
    <div>
      <div data-testid="form-error">{props.errorMessage ?? ''}</div>
      <div data-testid="form-busy">{String(props.busy)}</div>
      <button onClick={() => props.onValuesChange(formProbe.values)}>change</button>
      <button onClick={() => props.onSubmit(formProbe.values)}>submit</button>
    </div>
  ),
  EstimateCard: (props: { position: string; loading: boolean }) => (
    <div data-testid="estimate">
      {props.position}:{String(props.loading)}
    </div>
  ),
}));

const renderCreate = (mocks = [adPricingMock(), submitAdRequestMock()]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/ads/new'],
    routes: (
      <>
        <Route path="/ads/new" element={<CreateAdPage />} />
        <Route path="/ads/:id" element={<div>DETAIL ROUTE</div>} />
      </>
    ),
  });

beforeEach(() => {
  formProbe.values = makeAdRequestFormValues({ position: 'SIDEBAR', duration_days: 10 });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('CreateAdPage', () => {
  it('renders the header and a live estimate seeded from the draft', async () => {
    renderCreate();
    expect(screen.getByText('Create Ad')).toBeInTheDocument();
    // Draft starts from blankAdRequestValues → position AUTO; pricing resolves.
    expect(await screen.findByText('AUTO:false')).toBeInTheDocument();
  });

  it('reflects form value changes into the estimate card', async () => {
    renderCreate();
    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    expect(await screen.findByText('SIDEBAR:false')).toBeInTheDocument();
  });

  it('submits, notifies success and navigates to the new ad', async () => {
    renderCreate();
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(await screen.findByText('DETAIL ROUTE')).toBeInTheDocument();
    expect(notify.success).toHaveBeenCalledWith(expect.stringContaining('AD-9'));
  });

  it('shows an error when the server returns no created ad', async () => {
    renderCreate([adPricingMock(), submitAdRequestMock(null)]);
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent(/could not be submitted/i),
    );
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('surfaces a thrown mutation error', async () => {
    renderCreate([adPricingMock(), submitAdRequestErrorMock('Server boom')]);
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(screen.getByTestId('form-error')).toHaveTextContent('Server boom'));
  });
});

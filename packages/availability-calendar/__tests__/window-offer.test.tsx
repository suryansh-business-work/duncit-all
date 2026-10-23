import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { DuncitButton } from '@duncit/buttons';
import {
  POD_PARTNER_WINDOW_QUOTE,
  ProposeWindowBlock,
  ProposedTerms,
  WindowOfferForm,
  podRequestQuoteSource,
  windowOfferDefaults,
  type WindowOfferValues,
} from '../src';
import { breakdownResult, makeBreakdown } from './pricing-fixtures';

vi.mock('@mui/x-date-pickers/DatePicker', async () => ({ DatePicker: (await import('./picker-stub')).PickerStub }));
vi.mock('@mui/x-date-pickers/TimePicker', async () => ({ TimePicker: (await import('./picker-stub')).PickerStub }));

const SETTLED = { timeout: 3000 };
const quote = breakdownResult(makeBreakdown({ model: 'FLAT', rate: 5000, base: 5000, venue_price: 5000, venue_payout: 5000, platform_fee: 500, total: 5500 }));

type Answer = { refusal?: string; error?: GraphQLError };

function quoteMock(answer: Answer = {}, seen: Record<string, unknown>[] = []): MockedResponse {
  return {
    request: { query: POD_PARTNER_WINDOW_QUOTE, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: (variables: Record<string, unknown>) => {
      seen.push(variables);
      if (answer.error) return { errors: [answer.error] } as never;
      const podPartnerWindowQuote = answer.refusal
        ? { __typename: 'VenueOfferQuoteResult', ok: false, message: answer.refusal, quote: null }
        : { __typename: 'VenueOfferQuoteResult', ok: true, message: null, quote };
      return { data: { podPartnerWindowQuote } } as never;
    },
  };
}

const withApollo = (mocks: MockedResponse[], ui: ReactNode) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {ui}
    </MockedProvider>,
  );

function renderForm(mocks: MockedResponse[], over: { values?: Partial<WindowOfferValues>; spaces?: string[]; askPax?: boolean } = {}) {
  const onSubmit = vi.fn(async () => undefined);
  withApollo(
    mocks,
    <>
      <WindowOfferForm
        formId="proposal"
        defaultValues={{ ...windowOfferDefaults(), ...over.values }}
        spaces={over.spaces}
        askPax={over.askPax}
        quote={podRequestQuoteSource('req-1')}
        onSubmit={onSubmit}
      />
      <DuncitButton type="submit" form="proposal">
        Send
      </DuncitButton>
    </>,
  );
  return onSubmit;
}

describe('WindowOfferForm', () => {
  it('prices nothing until an amount is typed, then shows the server’s price and sends the proposal', async () => {
    const seen: Record<string, unknown>[] = [];
    const onSubmit = renderForm([quoteMock({}, seen)]);
    expect(screen.queryByLabelText('Guests')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Space')).not.toBeInTheDocument();
    expect(screen.queryByTestId('price-breakdown')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '5000' } });
    expect(await screen.findByTestId('price-breakdown', undefined, SETTLED)).toHaveTextContent('₹5,500');
    expect(seen[0]).toMatchObject({ id: 'req-1', offer: { model: 'FLAT', rate: 5000, space_label: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ model: 'FLAT', rate: 5000, pax: 10 }));
  });

  it('says why the venue cannot take the proposal', async () => {
    renderForm([quoteMock({ refusal: 'The venue is closed then' })], { values: { rate: '800' } });
    expect(await screen.findByText('The venue is closed then', undefined, SETTLED)).toBeInTheDocument();
    expect(screen.queryByTestId('price-breakdown')).not.toBeInTheDocument();
  });

  it('says so when the price could not be worked out', async () => {
    renderForm([quoteMock({ error: new GraphQLError('Pricing is down') })], { values: { rate: '800' } });
    expect(await screen.findByText('Pricing is down', undefined, SETTLED)).toBeInTheDocument();
  });

  it('asks the guests and the space when there is a choice, and sends them', async () => {
    const seen: Record<string, unknown>[] = [];
    const onSubmit = renderForm([quoteMock({}, seen)], { spaces: ['', 'Court 2'], askPax: true, values: { rate: '300' } });

    fireEvent.change(screen.getByLabelText('Guests'), { target: { value: '24' } });
    fireEvent.mouseDown(screen.getByLabelText('Space'));
    const options = within(screen.getByRole('listbox'));
    expect(options.getByRole('option', { name: 'Whole venue' })).toBeInTheDocument();
    fireEvent.click(options.getByRole('option', { name: 'Court 2' }));

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ space_label: 'Court 2', pax: 24 })));
  });

  it('sends nothing while the proposal is not whole', async () => {
    const onSubmit = renderForm([quoteMock()]);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Enter an amount above 0')).toBeInTheDocument();

    const impossibleDay = renderForm([quoteMock()], { values: { date: '2026-02-31', rate: '500' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Send' })[1]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Send' })[1]).toBeEnabled());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(impossibleDay).not.toHaveBeenCalled();
  });

  it('asks for a day when none is picked, and sends nothing', async () => {
    const onSubmit = renderForm([quoteMock()], { values: { date: '', rate: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Pick at least one date')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('ProposeWindowBlock', () => {
  it('proposes a time, the guests and a price for the request', async () => {
    const onPropose = vi.fn(async () => true);
    withApollo([quoteMock()], <ProposeWindowBlock requestId="req-1" busy={false} onPropose={onPropose} />);
    expect(screen.getByRole('heading', { name: 'Propose a time and price' })).toBeInTheDocument();
    expect(screen.getByLabelText('Guests')).toHaveValue(10);

    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '5000' } });
    fireEvent.click(screen.getByTestId('pod-request-send-slot'));
    await waitFor(() => expect(onPropose).toHaveBeenCalledWith(expect.objectContaining({ model: 'FLAT', rate: 5000, pax: 10 })));
  });
});

describe('ProposedTerms', () => {
  it('shows how the venue is paid, for how many guests, what it receives and what the host pays', () => {
    render(<ProposedTerms offer={{ model: 'PER_GUEST', rate: 300, pax: 20, quote: makeBreakdown() }} />);
    const terms = screen.getByTestId('pod-request-proposed-terms');
    expect(terms).toHaveTextContent('₹300 per guest · 20 guests');
    expect(terms).toHaveTextContent('The venue receives ₹6,000');
    expect(terms).toHaveTextContent('The host pays ₹6,600');
    expect(within(terms).getByTestId('price-breakdown')).toBeInTheDocument();
  });
});

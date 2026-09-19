import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { GraphQLError } from 'graphql';
import RunAdDialog, { type AdKind } from './RunAdDialog';
import type { ProductListingRow } from './queries';
import { renderWithProviders } from '../../__tests__/render';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

// The dialog's own documents (not exported), redeclared so the mocks match.
const AD_PRICING = gql`
  query PartnerAdPricing {
    adPricing {
      auto_per_day
      home_bottom_per_day
      sidebar_per_day
      explore_scroll_per_day
      status_per_day
      venue_list_per_day
      club_list_per_day
      pod_list_per_day
      pod_details_per_day
      currency_symbol
      min_days
      max_days
    }
  }
`;

const SUBMIT_AD_REQUEST = gql`
  mutation PartnerSubmitAdRequest($input: SubmitAdRequestInput!) {
    submitAdRequest(input: $input) {
      id
      trace_id
    }
  }
`;

const pricingMock: MockedResponse = {
  request: { query: AD_PRICING },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      adPricing: {
        __typename: 'AdPricing',
        auto_per_day: 500,
        home_bottom_per_day: 400,
        sidebar_per_day: 300,
        explore_scroll_per_day: 350,
        status_per_day: 250,
        venue_list_per_day: 200,
        club_list_per_day: 200,
        pod_list_per_day: 200,
        pod_details_per_day: 200,
        currency_symbol: '₹',
        min_days: 1,
        max_days: 30,
      },
    },
  },
};

const submitMock = (
  result: MockedResponse['result'],
  capture: (input: Record<string, unknown>) => void = () => undefined,
): MockedResponse => ({
  request: {
    query: SUBMIT_AD_REQUEST,
    variables: (variables) => {
      capture((variables as { input: Record<string, unknown> }).input);
      return true;
    },
  },
  result,
});

const product = (over: Partial<ProductListingRow> = {}): ProductListingRow => ({
  id: 'p1',
  product_name: 'Beta Cap',
  description: 'A breathable cotton cap for weekend treks.',
  image_url: '',
  images: ['https://cdn.test/beta-1.jpg', 'https://cdn.test/beta-2.jpg'],
  listing_review_status: 'APPROVED',
  ...over,
});

const renderDialog = (mocks: MockedResponse[], props: { product?: ProductListingRow | null; adKind?: AdKind; open?: boolean } = {}) => {
  const onClose = vi.fn();
  const onSubmitted = vi.fn();
  renderWithProviders(
    <RunAdDialog
      product={props.product === undefined ? product() : props.product}
      adKind={props.adKind ?? 'PRODUCT_AD'}
      open={props.open ?? true}
      onClose={onClose}
      onSubmitted={onSubmitted}
    />,
    { mocks },
  );
  return { onClose, onSubmitted };
};

describe('RunAdDialog', () => {
  it('renders nothing while closed', () => {
    renderDialog([], { open: false, product: null });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('prefills a product ad from the listing, using its first gallery image as the media', async () => {
    let input: Record<string, unknown> | null = null;
    const { onSubmitted } = renderDialog([
      pricingMock,
      submitMock(
        { data: { submitAdRequest: { __typename: 'AdRequest', id: 'ad-1', trace_id: 'TRC-42' } } },
        (captured) => {
          input = captured;
        },
      ),
    ]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Run a Product Ad' })).toBeTruthy();
    expect((within(dialog).getByLabelText(/Ad Title/) as HTMLInputElement).value).toBe('Beta Cap');
    expect((within(dialog).getByAltText('Ad media preview') as HTMLImageElement).src).toBe('https://cdn.test/beta-1.jpg');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Run a Product Ad' }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('TRC-42'));
    expect(input).toMatchObject({
      ad_kind: 'PRODUCT_AD',
      product_id: 'p1',
      ad_title: 'Beta Cap',
      ad_description: 'A breathable cotton cap for weekend treks.',
      media_url: 'https://cdn.test/beta-1.jpg',
    });
  });

  it('titles a brand ad after the product', async () => {
    renderDialog([pricingMock], { adKind: 'BRAND_AD' });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Run a Brand Ad' })).toBeTruthy();
    expect((within(dialog).getByLabelText(/Ad Title/) as HTMLInputElement).value).toBe('Discover Beta Cap');
  });

  it('asks for media when the listing has no image at all', async () => {
    let sent = false;
    const { onSubmitted } = renderDialog(
      [
        pricingMock,
        submitMock({ data: { submitAdRequest: { __typename: 'AdRequest', id: 'ad-1', trace_id: 'TRC-1' } } }, () => {
          sent = true;
        }),
      ],
      { product: product({ image_url: '', images: [] }) },
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByAltText('Ad media preview')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run a Product Ad' }));

    expect(await within(dialog).findByText('Upload the ad media')).toBeTruthy();
    expect(sent).toBe(false);
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and shows why Marketing refused the request', async () => {
    const { onSubmitted } = renderDialog([
      pricingMock,
      submitMock({ errors: [new GraphQLError('Ad slot is fully booked')] }),
    ]);

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run a Product Ad' }));

    expect(await within(dialog).findByText('Ad slot is fully booked')).toBeTruthy();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const { onClose } = renderDialog([pricingMock]);
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { POD_RENTALS_QUERY } from '@duncit/utils';
import { renderWithProviders } from '../../../../__tests__/testkit';
import PodRentalsSection from '../PodRentalsSection';

const POD_RENTALS = gql(POD_RENTALS_QUERY);

const item = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodRentalItem',
  id: 'racket',
  name: 'Racket',
  description: '',
  images: [],
  unit: 'SLOT',
  rate: 100,
  deposit: 300,
  available: 3,
  per_guest_limit: 2,
  ...over,
});

const rentalsMock = (items: unknown[]): MockedResponse => ({
  request: { query: POD_RENTALS, variables: { pod_id: 'pod-1' } },
  result: {
    data: {
      podRentals: { __typename: 'PodRentalCatalogue', open: true, closed_reason: null, hours: 2, currency_symbol: '₹', items },
    },
  },
});

const mount = (mocks: MockedResponse[]) =>
  renderWithProviders(<PodRentalsSection podId="pod-1" editTo="/pods/pod-1/edit" />, { mocks });

describe('PodRentalsSection', () => {
  it('sends the Pod Shop to the pod editor, where products are picked from the catalogue', () => {
    mount([rentalsMock([])]);
    expect(screen.getByTestId('pod-shop-manage')).toHaveAttribute('href', '/pods/pod-1/edit');
  });

  it('lists what the venue rents, its rate by unit and how many are left for this pod', async () => {
    mount([rentalsMock([item(), item({ id: 'proj', name: 'Projector', unit: 'HOUR', rate: 250, available: 0 })])]);
    expect(await screen.findByText('Racket')).toBeInTheDocument();
    expect(screen.getByText(/₹100 per slot · 3 left/)).toBeInTheDocument();
    expect(screen.getByText(/₹250 per hour · Sold out/)).toBeInTheDocument();
  });

  it('says there is nothing to rent when the venue lists nothing', async () => {
    mount([rentalsMock([])]);
    expect(await screen.findByText('Nothing to rent for this pod')).toBeInTheDocument();
  });

  it('shows the server reason when the read fails', async () => {
    mount([
      {
        request: { query: POD_RENTALS, variables: { pod_id: 'pod-1' } },
        result: { errors: [new GraphQLError('Rentals are down')] },
      },
    ]);
    expect(await screen.findByText(/Rentals are down/)).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, waitFor } from '@testing-library/react';
import ChangeRequestList from '../../src/pages/ecomm/ecomm-requests/ChangeRequestList';
import { MY_ECOMM_CHANGE_REQUESTS } from '../../src/pages/ecomm/ecomm-requests/queries';
import { renderWithProviders } from './testkit';

const listMock = (rows: unknown[]): MockedResponse => ({
  request: { query: MY_ECOMM_CHANGE_REQUESTS, variables: { kind: 'BRAND' } },
  result: { data: { myEcommChangeRequests: rows } },
});

describe('ChangeRequestList', () => {
  it('shows the empty message when there are no requests', async () => {
    renderWithProviders(<ChangeRequestList kind="BRAND" />, { mocks: [listMock([])] });
    await waitFor(() =>
      expect(screen.getByText(/No change requests yet/i)).toBeInTheDocument(),
    );
  });

  it('renders each request with its status chip, details and reviewer note', async () => {
    renderWithProviders(<ChangeRequestList kind="BRAND" />, {
      mocks: [
        listMock([
          {
            id: 'c1',
            title: 'Rename brand',
            status: 'PENDING',
            summary: null,
            created_at: null,
            review_notes: 'Please clarify',
            details: [{ label: 'Brand name', value: 'Acme 2' }],
          },
          {
            id: 'c2',
            title: 'Update price',
            status: 'MYSTERY',
            summary: null,
            created_at: null,
            review_notes: null,
            details: [],
          },
        ]),
      ],
    });
    await waitFor(() => expect(screen.getByText('Rename brand')).toBeInTheDocument());
    expect(screen.getByText(/Brand name:/)).toBeInTheDocument();
    expect(screen.getByText(/Reviewer: Please clarify/)).toBeInTheDocument();
    // Unknown status falls back to the default chip colour and still renders.
    expect(screen.getByText('Update price')).toBeInTheDocument();
  });
});

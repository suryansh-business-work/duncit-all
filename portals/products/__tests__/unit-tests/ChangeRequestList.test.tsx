import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import ChangeRequestList from '../../src/pages/ecomm/ecomm-requests/ChangeRequestList';
import { renderWithProviders } from '../testkit';
import {
  makeChangeRequest,
  makeChangeRequestDetail,
  myEcommChangeRequestsMock,
} from '../mocks/changeRequest.mock';

describe('ChangeRequestList', () => {
  it('shows the empty message when there are no requests', async () => {
    renderWithProviders(<ChangeRequestList kind="BRAND" />, {
      mocks: [myEcommChangeRequestsMock('BRAND', [])],
    });
    await waitFor(() =>
      expect(screen.getByText(/No change requests yet/i)).toBeInTheDocument(),
    );
  });

  it('renders each request with its status chip, details and reviewer note', async () => {
    renderWithProviders(<ChangeRequestList kind="BRAND" />, {
      mocks: [
        myEcommChangeRequestsMock('BRAND', [
          makeChangeRequest({
            id: 'c1',
            title: 'Rename brand',
            status: 'PENDING',
            review_notes: 'Please clarify',
            details: [makeChangeRequestDetail({ label: 'Brand name', value: 'Acme 2' })],
          }),
          // An unknown status falls back to the default chip colour and still renders.
          makeChangeRequest({ id: 'c2', title: 'Update price', status: 'MYSTERY', details: [] }),
        ]),
      ],
    });
    await waitFor(() => expect(screen.getByText('Rename brand')).toBeInTheDocument());
    expect(screen.getByText(/Brand name:/)).toBeInTheDocument();
    expect(screen.getByText(/Reviewer: Please clarify/)).toBeInTheDocument();
    expect(screen.getByText('Update price')).toBeInTheDocument();
  });
});

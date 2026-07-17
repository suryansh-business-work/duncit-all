import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from '../../src/pages/DashboardPage';
import { renderWithProviders } from '../testkit';
import { legalDocumentStatsMock, makeLegalDocumentStats, makeLegalDocumentTypeCount } from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));

describe('DashboardPage', () => {
  it('renders totals and the by-type breakdown', async () => {
    __setTableRows([
      makeLegalDocumentTypeCount({ document_type: 'Privacy Policy', count: 3 }),
      makeLegalDocumentTypeCount({ document_type: 'NDA', count: 2 }),
    ]);
    renderWithProviders(<DashboardPage />, {
      mocks: [legalDocumentStatsMock(makeLegalDocumentStats({ total: 5 }))],
    });
    await waitFor(() => expect(screen.getByText('Legal Dashboard')).toBeInTheDocument());
    expect(screen.getByText('5')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    expect(screen.getByText('NDA')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows an empty hint when there are no documents', async () => {
    __setTableRows([]);
    renderWithProviders(<DashboardPage />, {
      mocks: [legalDocumentStatsMock(makeLegalDocumentStats({ total: 0, by_type: [] }))],
    });
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
  });

  it('falls back to a zero total when the server omits it', async () => {
    // total is nullish → the `?? 0` fallback renders 0 in the card.
    __setTableRows([]);
    renderWithProviders(<DashboardPage />, {
      mocks: [legalDocumentStatsMock(makeLegalDocumentStats({ total: null as unknown as number, by_type: [] }))],
    });
    await waitFor(() => expect(screen.getByText('Total documents')).toBeInTheDocument());
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('navigates to documents from the total card', async () => {
    __setTableRows([makeLegalDocumentTypeCount({ document_type: 'NDA', count: 2 })]);
    renderWithProviders(<></>, {
      mocks: [legalDocumentStatsMock(makeLegalDocumentStats({ total: 2 }))],
      initialEntries: ['/'],
      routes: (
        <>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/documents" element={<div>DOCS PAGE</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText('Total documents')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Total documents'));
    await waitFor(() => expect(screen.getByText('DOCS PAGE')).toBeInTheDocument());
  });
});

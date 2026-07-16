import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from '../../src/pages/DashboardPage';
import { LEGAL_DOCUMENT_STATS, LEGAL_DOCUMENT_STATS_TABLE } from '../../src/graphql/documents';
import { renderWithProviders } from './testkit';

const statsMock = (total: number, byType: { document_type: string; count: number }[]) => ({
  request: { query: LEGAL_DOCUMENT_STATS },
  result: { data: { legalDocumentStats: { total, by_type: byType } } },
});

const statsTableMock = (rows: { document_type: string; count: number }[]) => ({
  request: { query: LEGAL_DOCUMENT_STATS_TABLE },
  variableMatcher: () => true,
  result: { data: { legalDocumentStatsTable: { total: rows.length, rows } } },
});

describe('DashboardPage', () => {
  it('renders totals and the by-type breakdown', async () => {
    const byType = [{ document_type: 'Privacy Policy', count: 3 }, { document_type: 'NDA', count: 2 }];
    renderWithProviders(<DashboardPage />, {
      mocks: [statsMock(5, byType), statsTableMock(byType)],
    });
    await waitFor(() => expect(screen.getByText('Legal Dashboard')).toBeInTheDocument());
    expect(screen.getByText('5')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    expect(screen.getByText('NDA')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows an empty hint when there are no documents', async () => {
    renderWithProviders(<DashboardPage />, { mocks: [statsMock(0, []), statsTableMock([])] });
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
  });

  it('falls back to a zero total when the server omits it', async () => {
    // total is nullish → the `?? 0` fallback renders 0 in the card.
    renderWithProviders(<DashboardPage />, {
      mocks: [statsMock(null as unknown as number, []), statsTableMock([])],
    });
    await waitFor(() => expect(screen.getByText('Total documents')).toBeInTheDocument());
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('navigates to documents from the total card', async () => {
    const byType = [{ document_type: 'NDA', count: 2 }];
    renderWithProviders(<></>, {
      mocks: [statsMock(2, byType), statsTableMock(byType)],
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

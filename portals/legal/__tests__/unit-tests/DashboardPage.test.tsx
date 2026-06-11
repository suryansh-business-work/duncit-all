import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from '../../src/pages/DashboardPage';
import { LEGAL_DOCUMENT_STATS } from '../../src/graphql/documents';
import { renderWithProviders } from './testkit';

const statsMock = (total: number, byType: { document_type: string; count: number }[]) => ({
  request: { query: LEGAL_DOCUMENT_STATS },
  result: { data: { legalDocumentStats: { total, by_type: byType } } },
});

describe('DashboardPage', () => {
  it('renders totals and the by-type breakdown', async () => {
    renderWithProviders(<DashboardPage />, {
      mocks: [statsMock(5, [{ document_type: 'Privacy Policy', count: 3 }, { document_type: 'NDA', count: 2 }])],
    });
    await waitFor(() => expect(screen.getByText('Legal Dashboard')).toBeInTheDocument());
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('NDA')).toBeInTheDocument();
  });

  it('shows an empty hint when there are no documents', async () => {
    renderWithProviders(<DashboardPage />, { mocks: [statsMock(0, [])] });
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
  });

  it('navigates to documents from the total card', async () => {
    renderWithProviders(<></>, {
      mocks: [statsMock(2, [{ document_type: 'NDA', count: 2 }])],
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

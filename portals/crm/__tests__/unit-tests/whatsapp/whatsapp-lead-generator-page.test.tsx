import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { logs } from '@duncit/logs';
import WhatsAppLeadGeneratorPage from '@/pages/tools/whatsapp/WhatsAppLeadGeneratorPage';
import { ExtractionProvider } from '@/pages/tools/whatsapp/extraction';
import { WA_COMMUNITIES, WA_CONNECTION, WA_DISCONNECT } from '@/pages/tools/whatsapp/whatsappQueries';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { waConnection } from './fixtures';

const connectionMock = (connection: ReturnType<typeof waConnection>): MockedResponse => ({
  request: { query: WA_CONNECTION },
  result: { data: { waConnection: connection } },
});

const communitiesMock: MockedResponse = {
  request: { query: WA_COMMUNITIES, variables: { input: { search: null, page: 1, page_size: 25 } } },
  result: { data: { waCommunities: { total: 0, page: 1, page_size: 25, items: [] } } },
  maxUsageCount: 10,
};

const renderPage = (mocks: MockedResponse[]) =>
  renderWithApollo(
    <ExtractionProvider>
      <WhatsAppLeadGeneratorPage />
    </ExtractionProvider>,
    mocks,
    { route: '/tools/whatsapp' },
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WhatsAppLeadGeneratorPage', () => {
  it('guides an unconnected account to its API key', async () => {
    renderPage([connectionMock(waConnection())]);

    expect(await screen.findByText('How do I get the API key?')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'WhatsApp Lead Generator' })).toBeInTheDocument();
  });

  it('opens the browser once the account is connected', async () => {
    renderPage([connectionMock(waConnection({ status: 'CONNECTED', phone: '919812345678' })), communitiesMock]);

    expect(await screen.findByText('+919812345678')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Communities' })).toBeInTheDocument();
    expect(screen.queryByText('How do I get the API key?')).toBeNull();
  });

  it('shows the error when the connection cannot be read', async () => {
    renderPage([{ request: { query: WA_CONNECTION }, error: new Error('WhatsApp gateway offline') }]);
    expect(await screen.findByText('WhatsApp gateway offline')).toBeInTheDocument();
  });

  it('logs a refresh that fails after the connection changed', async () => {
    const logError = vi.spyOn(logs.portal.crm, 'error').mockImplementation(() => undefined);
    renderPage([
      connectionMock(waConnection({ status: 'CONNECTED', phone: '919812345678' })),
      communitiesMock,
      { request: { query: WA_DISCONNECT }, result: { data: { waDisconnect: waConnection() } } },
      { request: { query: WA_CONNECTION }, error: new Error('Refresh failed') },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Disconnect' }));

    await waitFor(() =>
      expect(logError).toHaveBeenCalledWith(
        'WhatsAppLeadGeneratorPage',
        'handleChanged',
        expect.objectContaining({ msg: 'waConnection refetch failed' }),
      ),
    );
  });
});

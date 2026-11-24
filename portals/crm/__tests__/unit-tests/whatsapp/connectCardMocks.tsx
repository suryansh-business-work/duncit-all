import { vi } from 'vitest';
import { act } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import WhatsAppConnectCard from '@/pages/tools/whatsapp/WhatsAppConnectCard';
import { WA_POLL_MS } from '@/pages/tools/whatsapp/WhatsAppConnectCard/useWaConnect';
import { WA_CONNECT, WA_QR, WA_SAVE_CONFIG, WA_STATUS, type WaConnection } from '@/pages/tools/whatsapp/whatsappQueries';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { waConnection } from './fixtures';

/** Shared Apollo mocks + timers for the WhatsApp connect-card suites. */

export const LINKED_AT = '2026-11-20T10:00:00.000Z';

export const renderCard = (connection: WaConnection, mocks: MockedResponse[] = []) => {
  const onChanged = vi.fn();
  renderWithApollo(<WhatsAppConnectCard connection={connection} onChanged={onChanged} />, mocks);
  return { onChanged };
};

export const statusMock = (status: WaConnection['status'], extra: Partial<WaConnection> = {}): MockedResponse => ({
  request: { query: WA_STATUS },
  result: { data: { waStatus: waConnection({ status, has_api_key: true, ...extra }) } },
  maxUsageCount: 200,
});

/** The live status answering each poll in turn; the last one repeats. */
export const statusSequence = (statuses: WaConnection['status'][]): MockedResponse => {
  let call = 0;
  return {
    request: { query: WA_STATUS },
    result: () => {
      const status = statuses[Math.min(call, statuses.length - 1)];
      call += 1;
      return { data: { waStatus: waConnection({ status, has_api_key: true }) } };
    },
    maxUsageCount: 200,
  };
};

export const qrMock = (qr_code: string | null): MockedResponse => ({
  request: { query: WA_QR },
  result: { data: { waQr: { __typename: 'WaQr', qr_code, status: 'CONNECTING' } } },
  maxUsageCount: 200,
});

export const connectMock = (
  restart: boolean,
  fn = vi.fn(() => ({ data: { waConnect: waConnection({ status: 'CONNECTING' }) } })),
) => ({
  mock: { request: { query: WA_CONNECT, variables: { restart } }, result: fn, maxUsageCount: 5 } as MockedResponse,
  fn,
});

export const saveMock = (input: { base_url: string; api_key?: string }, error?: Error): MockedResponse => ({
  request: { query: WA_SAVE_CONFIG, variables: { input } },
  ...(error ? { error } : { result: { data: { waSaveConfig: waConnection({ has_api_key: true, base_url: input.base_url }) } } }),
});

// Step one poll interval per act: a single long jump resolves dozens of polls in
// one React batch and trips the nested-update limit.
export const advance = async (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += WA_POLL_MS) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(WA_POLL_MS, ms - elapsed));
    });
  }
};

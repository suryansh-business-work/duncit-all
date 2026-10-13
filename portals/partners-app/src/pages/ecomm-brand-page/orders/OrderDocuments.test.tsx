import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { bookedOrder } from './__tests__/fixtures';
import { mountOrder, orderAnswer, openedOrder } from './__tests__/mount';
import type { SentOperation } from '../../../__tests__/groupC-link';
import { recordNotices } from '../../../__tests__/groupC-notices';

const download = vi.fn();
const print = vi.fn();
vi.mock(import('@duncit/utils'), async (importOriginal) => ({
  ...(await importOriginal()),
  downloadBase64File: (...args: unknown[]) => download(...args),
  printBase64File: (...args: unknown[]) => print(...args),
}));

const GET = 'PartnerBrandProductOrder';
let notices: ReturnType<typeof recordNotices>;

beforeEach(() => {
  download.mockReset();
  print.mockReset();
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});

const messages = () => notices.notices.map((n) => n.message);

describe('order documents', () => {
  const file = { brandProductOrderShipmentFile: { __typename: 'ShipmentFile', filename: 'label.pdf', mime: 'application/pdf', content_base64: 'QUJD' } };
  const group = (name: string) => within(screen.getByRole('group', { name }));

  it('prints the label from the PDF the server returns', async () => {
    const sent: SentOperation[] = [];
    mountOrder({ [GET]: orderAnswer(bookedOrder()), PartnerProductOrderShipmentFile: file }, sent);
    await openedOrder();
    fireEvent.click(group('Label').getByRole('button', { name: 'Print' }));
    await waitFor(() => expect(print).toHaveBeenCalledWith('QUJD', 'application/pdf', 'label.pdf'));
    expect(sent.find((op) => op.name === 'PartnerProductOrderShipmentFile')?.variables).toEqual({ ids: ['o1'], kind: 'LABEL' });
    expect(messages()).toContain('Opening the print dialog…');
  });

  it('downloads the invoice under the returned filename', async () => {
    mountOrder({ [GET]: orderAnswer(bookedOrder()), PartnerProductOrderShipmentFile: file }, []);
    await openedOrder();
    fireEvent.click(group('Invoice').getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(download).toHaveBeenCalledWith('QUJD', 'label.pdf', 'application/pdf'));
    expect(messages()).toContain('Document downloaded.');
  });

  it('says the paper is not ready when ShipRocket returned none', async () => {
    mountOrder({ [GET]: orderAnswer(bookedOrder()), PartnerProductOrderShipmentFile: { brandProductOrderShipmentFile: null } });
    await openedOrder();
    fireEvent.click(group('Manifest').getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(messages()).toContain('ShipRocket has not made this document yet. Try again in a minute.'));
    expect(download).not.toHaveBeenCalled();
  });

  it('reports a failed document request', async () => {
    mountOrder({ [GET]: orderAnswer(bookedOrder()), PartnerProductOrderShipmentFile: new Error('Document service down') });
    await openedOrder();
    fireEvent.click(group('Label').getByRole('button', { name: 'Print' }));
    await waitFor(() => expect(messages()).toContain('Document service down'));
    expect(print).not.toHaveBeenCalled();
  });
});

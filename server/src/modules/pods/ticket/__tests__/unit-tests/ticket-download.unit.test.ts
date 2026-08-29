import express from 'express';
import request from 'supertest';

jest.mock('@config/url-configs', () => ({
  getUrlConfigs: jest.fn().mockResolvedValue({ serverUrl: 'https://server.duncit.test/' }),
}));

const pdfForLink = jest.fn();
jest.mock('../../ticket.service', () => ({ ticketService: { pdfForLink: (id: string) => pdfForLink(id) } }));

import {
  TICKET_PDF_TTL_MS,
  signTicketPdfToken,
  ticketPdfFilename,
  ticketPdfUrl,
  verifyTicketPdfToken,
} from '../../ticket.download';
import { buildTicketRouter } from '../../ticket.router';

const app = express().use('/tickets', buildTicketRouter());

describe('ticket.download', () => {
  it('names the same file everywhere the ticket travels', () => {
    expect(ticketPdfFilename('TKT-4821')).toBe('ticket-TKT-4821.pdf');
  });

  it('round-trips the ticket a link names, and expires it', () => {
    const now = Date.now();
    const token = signTicketPdfToken('t1', now);
    expect(verifyTicketPdfToken(token, now)).toBe('t1');
    expect(verifyTicketPdfToken(token, now + TICKET_PDF_TTL_MS + 1)).toBeNull();
  });

  it('builds a public URL that ends in .pdf, with one slash after the base', async () => {
    const url = await ticketPdfUrl('t1');
    expect(url.startsWith('https://server.duncit.test/tickets/')).toBe(true);
    expect(url.endsWith('/ticket.pdf')).toBe(true);
    expect(verifyTicketPdfToken(url.split('/tickets/')[1].replace('/ticket.pdf', ''))).toBe('t1');
  });
});

describe('GET /tickets/:token/ticket.pdf', () => {
  it('answers the PDF for a good token', async () => {
    pdfForLink.mockResolvedValue({ pdf: Buffer.from('%PDF-1.4 ticket'), filename: 'ticket-TKT-1.pdf' });
    const res = await request(app).get(`/tickets/${signTicketPdfToken('t1')}/ticket.pdf`);

    expect(res.status).toBe(200);
    expect(pdfForLink).toHaveBeenCalledWith('t1');
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('ticket-TKT-1.pdf');
    expect(res.headers['cache-control']).toBe('no-store, max-age=0');
    expect(res.body.toString()).toBe('%PDF-1.4 ticket');
  });

  it('404s a forged token without touching the database', async () => {
    const res = await request(app).get('/tickets/forged.token/ticket.pdf');

    expect(res.status).toBe(404);
    expect(pdfForLink).not.toHaveBeenCalled();
  });

  it('404s a good token whose ticket is gone', async () => {
    pdfForLink.mockResolvedValue(null);
    const res = await request(app).get(`/tickets/${signTicketPdfToken('gone')}/ticket.pdf`);

    expect(res.status).toBe(404);
  });

  it('500s rather than hanging when the PDF cannot be built', async () => {
    pdfForLink.mockRejectedValue(new Error('pdfkit exploded'));
    const res = await request(app).get(`/tickets/${signTicketPdfToken('t1')}/ticket.pdf`);

    expect(res.status).toBe(500);
  });
});

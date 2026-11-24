import express from 'express';
import request from 'supertest';

jest.mock('@config/url-configs', () => ({
  getUrlConfigs: jest.fn().mockResolvedValue({ serverUrl: 'https://server.duncit.test/' }),
}));

const pdfForLink = jest.fn();
jest.mock('../../ticket.service', () => ({ ticketService: { pdfForLink: (id: string) => pdfForLink(id) } }));

const applePassForLink = jest.fn();
jest.mock('../../wallet/wallet.service', () => ({
  walletService: { applePassForLink: (id: string) => applePassForLink(id) },
}));

const googleWalletLogo = jest.fn();
jest.mock('@services/ticket/wallet-images', () => ({ googleWalletLogo: () => googleWalletLogo() }));

import {
  TICKET_PDF_TTL_MS,
  signTicketPassToken,
  signTicketPdfToken,
  ticketPassUrl,
  ticketPdfFilename,
  ticketPdfUrl,
  verifyTicketPassToken,
  verifyTicketPdfToken,
  walletLogoUrl,
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

  it('refuses a pass link, because each link opens only its own document', async () => {
    const res = await request(app).get(`/tickets/${signTicketPassToken('t1')}/ticket.pdf`);

    expect(res.status).toBe(404);
    expect(pdfForLink).not.toHaveBeenCalled();
  });
});

describe('Apple Wallet pass links', () => {
  it('round-trips and expires on the same half hour as the PDF', () => {
    const now = Date.now();
    const token = signTicketPassToken('t1', now);
    expect(verifyTicketPassToken(token, now)).toBe('t1');
    expect(verifyTicketPassToken(token, now + TICKET_PDF_TTL_MS + 1)).toBeNull();
    expect(verifyTicketPassToken(signTicketPdfToken('t1', now), now)).toBeNull();
  });

  it('builds a public .pkpass URL and the public wallet logo URL', async () => {
    const url = await ticketPassUrl('t1');
    expect(url.startsWith('https://server.duncit.test/tickets/')).toBe(true);
    expect(url.endsWith('/ticket.pkpass')).toBe(true);
    expect(verifyTicketPassToken(url.split('/tickets/')[1].replace('/ticket.pkpass', ''))).toBe('t1');
    expect(await walletLogoUrl()).toBe('https://server.duncit.test/tickets/wallet-logo.png');
  });
});

describe('GET /tickets/:token/ticket.pkpass', () => {
  it('serves the pass inline as a pkpass, so Safari opens Wallet', async () => {
    applePassForLink.mockResolvedValue({ pass: Buffer.from('PK-pass'), filename: 'ticket-TKT-1.pkpass' });
    const res = await request(app)
      .get(`/tickets/${signTicketPassToken('t1')}/ticket.pkpass`)
      .buffer(true)
      .parse((r, done) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => done(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(applePassForLink).toHaveBeenCalledWith('t1');
    expect(res.headers['content-type']).toContain('application/vnd.apple.pkpass');
    expect(res.headers['content-disposition']).toBe('inline; filename="ticket-TKT-1.pkpass"');
    expect(res.headers['cache-control']).toBe('no-store, max-age=0');
    expect((res.body as Buffer).toString()).toBe('PK-pass');
  });

  it('404s a PDF token without building a pass', async () => {
    const res = await request(app).get(`/tickets/${signTicketPdfToken('t1')}/ticket.pkpass`);

    expect(res.status).toBe(404);
    expect(applePassForLink).not.toHaveBeenCalled();
  });

  it('404s when the pass cannot be issued (wallet not set up, ticket gone or cancelled)', async () => {
    applePassForLink.mockResolvedValue(null);
    const res = await request(app).get(`/tickets/${signTicketPassToken('t1')}/ticket.pkpass`);

    expect(res.status).toBe(404);
  });

  it('500s rather than hanging when signing fails', async () => {
    applePassForLink.mockRejectedValue(new Error('bad key'));
    const res = await request(app).get(`/tickets/${signTicketPassToken('t1')}/ticket.pkpass`);

    expect(res.status).toBe(500);
  });
});

describe('GET /tickets/wallet-logo.png', () => {
  it('serves the cacheable logo Google Wallet fetches', async () => {
    googleWalletLogo.mockResolvedValue(Buffer.from('png-bytes'));
    const res = await request(app).get('/tickets/wallet-logo.png');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.headers['cache-control']).toBe('public, max-age=86400');
  });

  it('500s when the logo cannot be rendered', async () => {
    googleWalletLogo.mockRejectedValue(new Error('sharp failed'));
    const res = await request(app).get('/tickets/wallet-logo.png');

    expect(res.status).toBe(500);
  });
});

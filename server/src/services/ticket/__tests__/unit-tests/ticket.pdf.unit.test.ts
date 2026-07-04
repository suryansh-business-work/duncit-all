import { generateTicketPdf, type TicketPdfData } from '@services/ticket/ticket.pdf';

const base: TicketPdfData = {
  brand: 'Duncit',
  ticket_code: 'TCK-000123',
  status: 'VALID',
  qr_token: 'signed.qr.token',
  event_title: 'Sunset Rooftop Pod',
  date_label: '4 Jul 2026, 7:30 PM',
  mode: 'IN_PERSON',
  venue_name: 'Duncit Studio',
  venue_address: '12 MG Road, Pune',
  meeting_platform: null,
  attendee_name: 'Riya Sharma',
  attendee_email: 'riya@x.com',
};

const isPdf = (b: Buffer) => b.length > 800 && b.subarray(0, 5).toString() === '%PDF-';

describe('generateTicketPdf (brand band + logo)', () => {
  it('renders an in-person ticket with the brand mark', async () => {
    expect(isPdf(await generateTicketPdf(base))).toBe(true);
  });

  it('renders a virtual ticket (meeting platform, no venue address)', async () => {
    expect(
      isPdf(
        await generateTicketPdf({
          ...base,
          mode: 'VIRTUAL',
          venue_name: null,
          venue_address: null,
          meeting_platform: 'Google Meet',
          status: 'CHECKED_IN',
        })
      )
    ).toBe(true);
  });
});

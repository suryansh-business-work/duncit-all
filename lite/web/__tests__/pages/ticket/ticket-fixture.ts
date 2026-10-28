/**
 * The reader's own registration as the ticket pages read it: the registration
 * plus the event's card, address, join link and UPI details (LiteTicketEventFields).
 */
import type { LiteTicket, LiteTicketEvent } from '../../../graphql/registrations';
import { eventCardFixture, registrationFixture, typed } from '../../test-utils';

export const ticketEventFixture = (over: Partial<LiteTicketEvent> = {}): LiteTicketEvent =>
  typed('LiteEvent', {
    ...eventCardFixture(),
    address: 'Lodhi Road, New Delhi',
    map_url: null,
    virtual_link: null,
    upi_id: null,
    upi_name: null,
    require_approval: false,
    ...over,
  });

export const myTicketFixture = (over: Partial<LiteTicket> = {}): LiteTicket =>
  typed('LiteRegistration', {
    ...registrationFixture(),
    event: ticketEventFixture(),
    qr_data_url: null,
    ...over,
  });

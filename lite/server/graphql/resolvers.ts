import { ticketQrDataUrl } from '../services/qr';
import { adminResolvers } from './resolvers.admin';
import { publicResolvers } from './resolvers.public';

export const resolvers = {
  Query: { ...publicResolvers.Query, ...adminResolvers.Query },
  Mutation: { ...publicResolvers.Mutation, ...adminResolvers.Mutation },
  LiteRegistration: {
    // Drawn only when a page asks for it, and only for a ticket that admits someone.
    qr_data_url: (reg: { status: string; event_id: string; code: string }) => (reg.status === 'CONFIRMED' ? ticketQrDataUrl(reg.event_id, reg.code) : null),
  },
};

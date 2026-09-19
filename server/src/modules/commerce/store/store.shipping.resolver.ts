import type { GraphQLContext } from '@context';
import { storeShippingService } from './store.shipping.service';
import { requireStoreAdmin } from './store.shared';

type Args = Record<string, any>;

/** Every shipping field is for the store's operators only, gated before the service. */
const admin =
  <A extends Args>(run: (args: A) => unknown) =>
  (_p: unknown, args: A, ctx: GraphQLContext) => {
    requireStoreAdmin(ctx);
    return run(args);
  };

export const storeShippingResolvers = {
  Query: {
    storeShipmentCouriers: admin((a) => storeShippingService.couriers(a.id)),
    storeShipmentAlerts: admin(() => storeShippingService.alerts()),
    storeShiprocketStatus: admin(() => storeShippingService.status()),
    storeCodLedger: admin((a) => storeShippingService.codLedger(a.days ?? 30)),
  },
  Mutation: {
    storeBookShipment: admin((a) => storeShippingService.book(a.id, a.courier_id)),
    storeSetParcel: admin((a) => storeShippingService.setParcel(a.id, a.input ?? null)),
    storeUpdateShippingAddress: admin((a) => storeShippingService.updateAddress(a.id, a.input)),
    storeShipmentDocument: admin((a) => storeShippingService.document(a.ids, a.kind)),
    storeAnswerNdr: admin((a) => storeShippingService.answerNdr(a.id, a.action, a.comments)),
    storeSyncPickupLocations: admin(() => storeShippingService.syncPickups()),
    storeBookReturnPickup: admin((a) => storeShippingService.bookReturnPickup(a.id)),
    storeRestockReturn: admin((a) => storeShippingService.restockReturn(a.id)),
  },
};

import type { GraphQLContext } from '@context';
import { storeShippingService } from './store.shipping.service';
import { storeWarehouseService } from './store.warehouse.service';
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
    storePickupLocations: admin(() => storeWarehouseService.list()),
  },
  Mutation: {
    storeBookShipment: admin((a) => storeShippingService.book(a.id, a.courier_id)),
    storeSetParcel: admin((a) => storeShippingService.setParcel(a.id, a.input ?? null)),
    storeUpdateShippingAddress: admin((a) => storeShippingService.updateAddress(a.id, a.input)),
    storeShipmentFile: admin((a) => storeShippingService.file(a.ids, a.kind)),
    storeRetryFailedBookings: admin(() => storeShippingService.retryFailedBookings()),
    storeAnswerNdr: admin((a) => storeShippingService.answerNdr(a.id, a.action, a.comments)),
    storeShiprocketReconnect: admin(() => storeShippingService.reconnect()),
    storeSaveWarehouse: admin((a) => storeWarehouseService.save(a.id, a.input)),
    storeDeleteWarehouse: admin((a) => storeWarehouseService.remove(a.id)),
    storeRegisterWarehouse: admin((a) => storeWarehouseService.register(a.id)),
    storeImportPickup: admin((a) => storeWarehouseService.importPickup(a.nickname)),
    storeBookReturnPickup: admin((a) => storeShippingService.bookReturnPickup(a.id)),
    storeRestockReturn: admin((a) => storeShippingService.restockReturn(a.id)),
  },
};

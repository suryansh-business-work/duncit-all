/**
 * Chat service — the one surface the server mounts.
 *
 * Mounted in-process today: `server/src/modules/index.ts` stitches the typeDefs
 * and resolvers into the schema, and `server/src/index.ts` attaches the socket
 * handlers and starts the scheduler. Other server code that needs a single
 * model or helper imports it by its own path (e.g.
 * `@microservices/chat/rooms/chat.model`) rather than through this barrel, so
 * pulling in a model never loads every resolver and socket with it.
 */
export { chatTypeDefs } from './rooms/chat.schema';
export { chatResolvers } from './rooms/chat.resolver';
export { attachChatHandlers } from './rooms/chat.socket';
export { startChatRetentionScheduler } from './rooms/chat.cleanup';

export { staffChatTypeDefs } from './staff/staffChat.schema';
export { staffChatResolvers } from './staff/staffChat.resolver';
export { attachStaffChatHandlers } from './staff/staffChat.socket';

export { supportChatTypeDefs } from './support/supportChat.schema';
export { supportChatResolvers } from './support/supportChat.resolver';
export { attachSupportChatHandlers } from './support/supportChat.socket';

export { venueChatTypeDefs } from './venue/venueChat.schema';
export { venueChatResolvers } from './venue/venueChat.resolver';
export { attachVenueChatHandlers } from './venue/venueChat.socket';

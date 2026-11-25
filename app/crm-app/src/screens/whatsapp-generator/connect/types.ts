import type { ResultOf } from '@graphql-typed-document-node/core';

import type { CrmAppWhatsappConnectionDocument } from '@/graphql/whatsappGenerator';

/** The stored gateway connection, as the screen reads it. */
export type WaConnection = ResultOf<typeof CrmAppWhatsappConnectionDocument>['waConnection'];

/** The connect stepper's two steps. */
export type WaConnectStep = 'gateway' | 'link';

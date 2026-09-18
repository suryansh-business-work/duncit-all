import { logs } from '@duncit/logs';

/** The storefront's logger: `logs.website.ecomm`, one record shape with every surface. */
export const storeLog = logs.website.ecomm;

/** A `.catch` handler for a fire-and-forget promise — the failure is logged, never dropped. */
export function logFailure(page: string, component: string) {
  return (error: unknown) => {
    storeLog.error(page, component, { error });
  };
}

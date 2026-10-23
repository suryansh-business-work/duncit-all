import { GraphQLError } from 'graphql';

/**
 * Recurring pods are retired, and with them booking several of their dates in
 * one checkout. Installed apps that predate the retirement may still send
 * `date_pod_ids`; they are refused before any payment is made, rather than
 * silently charged for one pod.
 */
export const multiDateCheckoutRetired = () =>
  new GraphQLError('Booking several dates in one checkout is no longer available. Please update the app and book the pod again.', {
    extensions: { code: 'BAD_USER_INPUT' },
  });

export function assertNotMultiDateCheckout(input: { date_pod_ids?: string[] | null }): void {
  if (input.date_pod_ids?.length) throw multiDateCheckoutRetired();
}

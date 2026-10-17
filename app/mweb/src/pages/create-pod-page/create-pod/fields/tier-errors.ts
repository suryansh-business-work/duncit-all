import type { TicketDiscountFieldErrors } from '@duncit/ui';

/** One message slot on an RHF error node, whatever else the node carries. */
type ErrorNode = { message?: string } | undefined;

/**
 * A tier list's RHF error as the shared tier editor's messages. A list-level
 * issue sits on the node itself (or its `root`); a row's issues sit under the
 * row's index. Used by both tier editors of the stepper: multi-ticket and
 * multi-date.
 */
export function toTierFieldErrors(error: unknown, count: number): TicketDiscountFieldErrors | undefined {
  if (!error) return undefined;
  const node = error as Record<string, unknown> & { message?: string; root?: ErrorNode };
  const rowAt = (index: number) =>
    node[String(index)] as Record<'min_tickets' | 'discount_pct', ErrorNode> | undefined;
  return {
    list: node.message ?? node.root?.message,
    rows: Array.from({ length: count }, (_, index) => ({
      min_tickets: rowAt(index)?.min_tickets?.message,
      discount_pct: rowAt(index)?.discount_pct?.message,
    })),
  };
}

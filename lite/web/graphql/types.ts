/** A query or mutation that takes no variables. */
export type NoVars = Record<string, never>;

export interface LiteEventFilterVars {
  search?: string | null;
  city_slug?: string | null;
  category_slug?: string | null;
  calendar_slug?: string | null;
  host_handle?: string | null;
  from?: string | null;
  to?: string | null;
  featured?: boolean | null;
  past?: boolean | null;
}

export type LiteRegistrationAction = 'APPROVE' | 'DECLINE' | 'CONFIRM_PAYMENT' | 'REJECT_PAYMENT' | 'CHECK_IN' | 'UNDO_CHECK_IN' | 'REMOVE';

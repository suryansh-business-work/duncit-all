import { alpha, type Theme } from '@mui/material/styles';
import { useUserData } from '@duncit/user-context';

/** The roles that may refund, review or close a case. FINANCE_USER reads only. */
export const FAILED_PAYMENT_WRITE_ROLES: readonly string[] = ['FINANCE_MANAGER', 'SUPER_ADMIN'];

/** True when these roles may act on a case. UI only: the server checks every write. */
export const canManageFailedPayments = (roles: readonly string[] | null | undefined): boolean =>
  (roles ?? []).some((role) => FAILED_PAYMENT_WRITE_ROLES.includes(role));

export function useCanManageFailedPayments(): boolean {
  const { user } = useUserData();
  return canManageFailedPayments(user?.roles);
}

/**
 * The row tint the server's hint asks for: green = refundable now, yellow =
 * waiting on a person's Review. Theme tokens only, faded the same way the
 * partners app tints a low-stock listing.
 */
export const failedPaymentRowStyle =
  (theme: Theme) =>
  (row: Readonly<{ highlight: string }>): { backgroundColor: string } | undefined => {
    if (row.highlight === 'GREEN') return { backgroundColor: alpha(theme.palette.success.main, 0.1) };
    if (row.highlight === 'YELLOW') return { backgroundColor: alpha(theme.palette.warning.main, 0.1) };
    return undefined;
  };

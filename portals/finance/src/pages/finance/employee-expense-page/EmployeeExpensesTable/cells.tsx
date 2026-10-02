import { Stack, Typography } from '@mui/material';
import {
  EMPLOYEE_EXPENSE_CATEGORIES,
  EMPLOYEE_EXPENSE_PAYMENT_METHODS,
  type EmployeeExpenseClaim,
} from '@duncit/utils';
import { labelize } from '../queries';

export const CATEGORY_OPTIONS = EMPLOYEE_EXPENSE_CATEGORIES.map((c) => ({ value: c, label: labelize(c) }));
export const METHOD_OPTIONS = EMPLOYEE_EXPENSE_PAYMENT_METHODS.map((m) => ({
  value: m,
  label: labelize(m),
}));
export const getRowId = (row: EmployeeExpenseClaim) => row.id;

/** Who filed it, over the claim reference Finance would quote back. */
export const renderEmployee = (row: EmployeeExpenseClaim) => (
  <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
      {row.employee_name || row.employee_email}
    </Typography>
    <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
      {row.claim_id}
    </Typography>
  </Stack>
);

/**
 * What the money went on, in one cell.
 *
 * The queue already spends a wide column on the person, so category and payee
 * share one — a reviewer reads "Travel · Uber" as a single fact, and splitting
 * it costs the width the amount and the decision need.
 */
export const renderSpend = (row: EmployeeExpenseClaim) => (
  <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" noWrap>
      {labelize(row.category)}
    </Typography>
    <Typography
      variant="caption"
      component="span"
      noWrap
      sx={{ color: 'text.secondary', maxWidth: 220 }}
    >
      {row.merchant || row.description}
    </Typography>
  </Stack>
);

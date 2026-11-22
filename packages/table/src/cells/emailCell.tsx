import { createContext, useContext, type ReactNode } from 'react';
import { Box } from '@mui/material';

/**
 * What a console puts beside every email address its grids show — the shell's
 * Validate button. The grid only knows that a cell holds an address; the
 * console's shell decides what to offer for it, so this package needs no
 * GraphQL client. Returning null offers nothing (not an address after all).
 */
export type TableEmailAction = (email: string) => ReactNode;

const TableEmailActionContext = createContext<TableEmailAction | null>(null);

export const TableEmailActionProvider = TableEmailActionContext.Provider;

/**
 * A column whose field names one email address: `email`, `buyer_email`,
 * `user.email`. Not `emails` (a list) or `email_verified` (a flag).
 */
const EMAIL_FIELD = /(?:^|[._])email$/i;

export const isEmailField = (field: string): boolean => EMAIL_FIELD.test(field);

const ELLIPSIS_SX = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } as const;

/**
 * A plain email cell: the address, and the console's action beside it.
 * Without a provider, or for a blank value, it is just the text — exactly what
 * the grid drew before. A column named like an email but holding no text
 * draws nothing, as no address is there.
 */
export function EmailCell({ value }: Readonly<{ value: unknown }>) {
  const action = useContext(TableEmailActionContext);
  if (typeof value !== 'string') return null;
  const address = value.trim();
  const extra = action && address ? action(address) : null;
  if (!extra) return <Box component="span" sx={ELLIPSIS_SX}>{value}</Box>;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, height: '100%' }}>
      <Box component="span" sx={ELLIPSIS_SX}>
        {value}
      </Box>
      {extra}
    </Box>
  );
}

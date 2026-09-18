import { Stack, Typography } from '@mui/material';
import { GuestChip } from './chips';

interface BuyerCellProps {
  name?: string;
  email: string;
  guest: boolean;
}

/** Who bought (or is buying): name over email, and a Guest chip for a buyer with no account. */
export default function BuyerCell({ name, email, guest }: Readonly<BuyerCellProps>) {
  return (
    <Stack direction="row" spacing={1} component="span" sx={{ alignItems: 'center', minWidth: 0 }}>
      <Stack component="span" sx={{ minWidth: 0, lineHeight: 1.2 }}>
        {name && (
          <Typography variant="body2" component="span" noWrap>
            {name}
          </Typography>
        )}
        <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
          {email}
        </Typography>
      </Stack>
      {guest && <GuestChip />}
    </Stack>
  );
}

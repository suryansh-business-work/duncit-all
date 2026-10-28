import { Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';

interface Props {
  name: string | null;
  email: string | null;
  /** Shown in place of the name for an account deleted since — its id is what remains. */
  id: string;
}

/** A person as the Loyalty tables show them: the name, with the email under it. */
export default function PersonCell({ name, email, id }: Readonly<Props>) {
  return (
    <Stack sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
        {name || id}
      </Typography>
      <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
        {email || EM_DASH}
      </Typography>
    </Stack>
  );
}

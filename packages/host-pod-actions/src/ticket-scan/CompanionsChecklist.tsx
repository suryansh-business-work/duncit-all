import { Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/** One row on the roster: who, and (for companions) the phone on file. */
export interface ChecklistPerson {
  /** Stable identity for React — user id for the buyer, phone for companions. */
  key: string;
  primary: string;
  secondary?: string;
}

interface Props {
  title: string;
  people: ChecklistPerson[];
}

/**
 * The green-tick roster of everyone a ticket has accounted for.
 *
 * A group check-in that only swaps one line of text reads as "nothing
 * happened" — this list shows each person by name with an explicit tick, so
 * the host can see the whole party is in.
 */
export default function CompanionsChecklist({ title, people }: Readonly<Props>) {
  if (people.length === 0) return null;
  return (
    <Stack spacing={0.75} data-testid="scan-checked-in-list">
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {people.map((person) => (
        <Stack key={person.key} direction="row" spacing={1} alignItems="center">
          <CheckCircleIcon color="success" fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
            {person.primary}
          </Typography>
          {person.secondary && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {person.secondary}
            </Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

import { Link } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { LogPeople } from './types';

interface Props {
  userId: string;
  people: LogPeople;
}

/** A user's name as a link that opens their details — never the raw user id. */
export function PersonLink({ userId, people }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = people.byId.get(userId)?.name || t('crm.people.unknown');
  return (
    <Link
      component="button"
      type="button"
      variant="caption"
      underline="hover"
      sx={{ fontWeight: 700, verticalAlign: 'baseline' }}
      onClick={() => people.onOpenPerson(userId)}
      aria-label={t('crm.people.openDetails', { vars: { name } })}
    >
      {name}
    </Link>
  );
}

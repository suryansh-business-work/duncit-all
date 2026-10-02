import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { PurgeLogEntry } from '../queries';

interface Props {
  entries: PurgeLogEntry[];
}

/** What has already been removed for this request. */
export default function PurgeLog({ entries }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" sx={{
        fontWeight: 700
      }}>
        {t('tech.accountDeletions.purgeLogTitle')}
      </Typography>
      {entries.map((entry) => (
        <Typography
          key={`${entry.model_name}.${entry.field_path}.${entry.purged_at}`}
          variant="caption"
          sx={{
            color: "text.secondary"
          }}
        >
          {t('tech.accountDeletions.purgeLogEntry', {
            vars: {
              removed: entry.removed,
              collection: entry.collection_name,
              field: entry.field_path,
            },
          })}
        </Typography>
      ))}
    </Stack>
  );
}

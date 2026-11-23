import { Box, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { EnvFieldDef } from '../queries';

interface Props {
  field: EnvFieldDef;
  /** Readers of the whole category, shown when no file reads this field by its env key. */
  categoryUsedIn?: string[];
}

/** The tooltip body: why the value is used, its env key, and the files that read it. */
function FieldInfoBody({ field, readers, readersAreField }: Readonly<{ field: EnvFieldDef; readers: string[]; readersAreField: boolean }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.75} sx={{ py: 0.5 }}>
      {field.description ? <Typography variant="body2">{field.description}</Typography> : null}
      {field.envKey ? (
        <Typography variant="caption">
          {t('tech.environment.envFieldEnvKey')} <Box component="code">{field.envKey}</Box>
        </Typography>
      ) : null}
      {readers.length > 0 ? (
        <Box>
          <Typography variant="caption" component="p" sx={{ fontWeight: 'fontWeightMedium' }}>
            {readersAreField ? t('tech.environment.envFieldReadBy') : t('tech.environment.envFieldReadByCategory')}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {readers.map((path) => (
              <Typography key={path} component="li" variant="caption" sx={{ wordBreak: 'break-all' }}>
                <Box component="code">{path}</Box>
              </Typography>
            ))}
          </Box>
        </Box>
      ) : null}
    </Stack>
  );
}

/**
 * An info button beside an environment field. Its tooltip says why the value is
 * used and which files read it, straight from env-registry.json — so an
 * operator knows what breaks before changing a key. Keyboard users reach it
 * like any button; the tooltip opens on focus.
 */
export default function FieldInfo({ field, categoryUsedIn }: Readonly<Props>) {
  const { t } = useTranslation();
  const fieldReaders = field.usedIn ?? [];
  const readers = fieldReaders.length > 0 ? fieldReaders : categoryUsedIn ?? [];
  if (!field.description && !field.envKey && readers.length === 0) return null;
  return (
    <Tooltip title={<FieldInfoBody field={field} readers={readers} readersAreField={fieldReaders.length > 0} />} describeChild>
      <DuncitIconButton aria-label={t('tech.environment.envFieldInfo', { vars: { label: field.label } })} size="small">
        <InfoOutlinedIcon fontSize="small" />
      </DuncitIconButton>
    </Tooltip>
  );
}

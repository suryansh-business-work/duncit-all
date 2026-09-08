import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Card, CardContent, Chip, Skeleton, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../i18n';
import { RENAME_MY_REGION, type Region } from '../queries';

interface Props {
  region?: Region;
  /** True until the region has arrived; the row shows its own shape meanwhile. */
  loading: boolean;
  onRenamed: () => void;
}

/**
 * The region's own name and permanent reference.
 *
 * It starts as the manager's own name because a blank title on the Structure
 * canvas reads as a rendering fault rather than as an unnamed region — this is
 * where they replace it with what the region is actually called.
 *
 * The row aligns on the INPUT's own baseline, not on the field box: a
 * TextField reserves a helper-text line under itself, so centring the row
 * against the whole box left the button and the chips sitting visibly low
 * beside it. The helper line is now rendered only when there is an error to
 * put in it, which is also the only time it says anything.
 */
export default function RegionNameCard({ region, loading, onRenamed }: Readonly<Props>) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rename, renameState] = useMutation(RENAME_MY_REGION);

  // The region arrives after the first paint, and again after every refetch.
  useEffect(() => {
    setName(region?.region_name ?? '');
  }, [region?.region_name]);

  const dirty = !!region && name.trim() !== region.region_name && name.trim().length > 0;

  const save = async () => {
    setError(null);
    try {
      await rename({ variables: { region_name: name.trim() } });
      onRenamed();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        {loading && !region ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Skeleton variant="rounded" height={40} sx={{ flex: '1 1 260px' }} />
            <Skeleton variant="rounded" width={88} height={36} />
            <Skeleton variant="rounded" width={110} height={24} />
          </Stack>
        ) : (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            useFlexGap
            sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
          >
            <TextField
              size="small"
              label={t('partners.regional.regionName')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={!!error}
              helperText={error ?? undefined}
              sx={{ flex: '1 1 260px', minWidth: 240 }}
            />
            <DuncitButton
              variant="contained"
              disabled={!dirty || renameState.loading}
              onClick={save}
            >
              {renameState.loading ? t('shell.common.saving') : t('shell.common.save')}
            </DuncitButton>
            {region?.region_no && <Chip size="small" variant="outlined" label={region.region_no} />}
            <Chip
              size="small"
              color="primary"
              label={t('partners.regional.memberCount', {
                vars: { count: region?.club_admin_count ?? 0 },
              })}
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

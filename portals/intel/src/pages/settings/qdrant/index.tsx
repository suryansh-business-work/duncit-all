import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Button, Chip, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { ENV_LABEL_KEYS } from '../../../components/sources';
import { INTEL_HEALTH, INTEL_REBUILD_INDEX, type HealthData } from '../../../graphql/admin';

/**
 * Settings › Qdrant Vector DB: a managed internal service — nothing to connect.
 * Collection health and size per scope, and Rebuild (needed after changing the
 * embedding model or dimensions).
 */
export default function QdrantSection() {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<HealthData>(INTEL_HEALTH, { fetchPolicy: 'cache-and-network' });
  const [rebuild, { loading: rebuilding }] = useMutation<{ intelRebuildIndex: number }>(INTEL_REBUILD_INDEX);
  const [scope, setScope] = useState<string | null | undefined>(undefined);
  const h = data?.intelHealth;
  const run = async () => {
    const target = scope;
    setScope(undefined);
    try {
      const res = await rebuild({ variables: { scope: target } });
      notifySuccess(t('intel.settings.qdrant.rebuildQueued', { vars: { count: res.data?.intelRebuildIndex ?? 0 } }));
      await refetch();
    } catch (err) {
      notifyError(parseApiError(err, t('intel.settings.qdrant.rebuildFailed')));
    }
  };

  return (
    <SectionCard title={t('intel.settings.sections.qdrant')} subtitle={t('intel.settings.qdrant.subtitle')}>
      {loading && !h && <Skeleton variant="rounded" height={160} />}
      {h && (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1}>
            <Chip color={h.qdrant_reachable ? 'success' : 'error'} label={h.qdrant_reachable ? t('intel.settings.qdrant.reachable') : t('intel.settings.qdrant.unreachable')} />
            <Chip variant="outlined" label={t('intel.settings.qdrant.managed')} />
          </Stack>
          {!h.qdrant_configured && <Alert severity="warning">{t('intel.settings.qdrant.notConfigured')}</Alert>}
          {h.collections.some((c) => c.dimension_mismatch) && <Alert severity="warning">{t('intel.settings.qdrant.mismatch')}</Alert>}
          <Table size="small" aria-label={t('intel.settings.qdrant.collections')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('intel.settings.qdrant.scope')}</TableCell>
                <TableCell>{t('intel.settings.qdrant.collection')}</TableCell>
                <TableCell align="right">{t('intel.settings.qdrant.points')}</TableCell>
                <TableCell>{t('intel.settings.qdrant.status')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {h.collections.map((c) => (
                <TableRow key={c.name}>
                  <TableCell>{t(ENV_LABEL_KEYS[c.scope] ?? 'intel.env.SHARED')}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{c.name}</TableCell>
                  <TableCell align="right">{c.points}</TableCell>
                  <TableCell>{c.exists ? c.status : t('intel.settings.qdrant.missing')}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setScope(c.scope)} disabled={rebuilding || !h.qdrant_reachable}>{t('intel.settings.qdrant.rebuild')}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {h.collections.length === 0 && <Typography variant="body2" color="text.secondary">{t('intel.settings.qdrant.none')}</Typography>}
          <div>
            <Button variant="outlined" color="error" onClick={() => setScope(null)} disabled={rebuilding || !h.qdrant_reachable}>{t('intel.settings.qdrant.rebuildAll')}</Button>
          </div>
        </Stack>
      )}
      <ConfirmDialog open={scope !== undefined} title={t('intel.settings.qdrant.confirmTitle')} message={t('intel.settings.qdrant.confirmText')} destructive busy={rebuilding} confirmLabel={t('intel.settings.qdrant.rebuild')} onConfirm={() => { run().catch(() => undefined); }} onClose={() => setScope(undefined)} />
    </SectionCard>
  );
}

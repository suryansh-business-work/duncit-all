import { Chip, Divider, Drawer, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { money } from './money';
import type { PayLine, TeamNode } from './types';

interface Props {
  node: TeamNode | null;
  currency: string;
  onClose: () => void;
}

/** A variable line shows its range, a fixed one its amount. */
function payText(line: PayLine, currency: string): string {
  const range = line.kind === 'VARIABLE' && line.min_amount != null && line.max_amount != null;
  return range ? `${money(line.min_amount as number, currency)} – ${money(line.max_amount as number, currency)}` : money(line.amount, currency);
}

/**
 * Read-only view of one seat for the share page. It shows only what the server
 * sent: pay and the scorecard arrive null when the link hides them, and their
 * sections then do not render at all.
 */
export default function SeatDetail({ node, currency, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const pay = node?.pay ?? [];
  const kras = node?.kras ?? [];

  return (
    <Drawer anchor="right" open={node !== null} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 } } } }}>
      {node && (
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Typography variant="h6" component="h2">{node.title}</Typography>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={t(`hr.teamStructure.kind.${node.kind}`)} />
            <Chip size="small" label={t(`hr.teamStructure.employment.${node.employment_type}`)} />
            <Chip size="small" label={t(`hr.teamStructure.status.${node.status}`)} />
          </Stack>
          {node.person_name && <Typography variant="body2">{node.person_name}</Typography>}
          {node.department && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{node.department}</Typography>}
          {pay.length > 0 && (
            <section aria-label={t('hr.teamStructure.pay.title')}>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="subtitle2">{t('hr.teamStructure.pay.title')}</Typography>
              <List dense disablePadding>
                {pay.map((line) => (
                  <ListItem key={`${line.label}-${line.frequency}`} disableGutters>
                    <ListItemText
                      primary={`${line.label}: ${payText(line, currency)}`}
                      secondary={t(`hr.teamStructure.pay.frequencies.${line.frequency}`)}
                    />
                  </ListItem>
                ))}
              </List>
            </section>
          )}
          {kras.length > 0 && (
            <section aria-label={t('hr.teamStructure.kra.title')}>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="subtitle2">{t('hr.teamStructure.kra.title')}</Typography>
              {kras.map((kra) => (
                <Stack key={kra.title} spacing={0.5} sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {`${kra.title} (${kra.weight}%)`}
                  </Typography>
                  {kra.description && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{kra.description}</Typography>}
                  <List dense disablePadding>
                    {kra.kpis.map((kpi) => (
                      <ListItem key={kpi.name} disableGutters>
                        <ListItemText
                          primary={`${kpi.name} (${kpi.weight}%)`}
                          secondary={[
                            kpi.target == null ? null : `${kpi.target}${kpi.unit ? ` ${kpi.unit}` : ''}`,
                            t(`hr.teamStructure.kra.frequencies.${kpi.frequency}`),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Stack>
              ))}
            </section>
          )}
          <DuncitButton onClick={onClose}>{t('hr.teamStructure.share.close')}</DuncitButton>
        </Stack>
      )}
    </Drawer>
  );
}

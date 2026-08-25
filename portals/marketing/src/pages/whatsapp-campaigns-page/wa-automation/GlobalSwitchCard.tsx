import { Box, Button, Paper, Stack, Switch, Tooltip, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  enabled: boolean;
  busy: boolean;
  reconciling: boolean;
  onToggle: (next: boolean) => void;
  onReconcile: () => void;
}

/**
 * The kill switch, given a card of its own above the rows.
 *
 * Every switch below it is conditional on this one, so it is not a row in the
 * same table — an operator turning WhatsApp off should not have to find it
 * among seventy scenarios.
 */
export default function GlobalSwitchCard({
  enabled,
  busy,
  reconciling,
  onToggle,
  onReconcile,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderWidth: 2,
        borderColor: enabled ? 'success.main' : 'warning.main',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{
        alignItems: { md: 'center' }
      }}>
        <WhatsAppIcon color={enabled ? 'success' : 'disabled'} fontSize="large" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{
            fontWeight: 800
          }}>
            {t('adminWhatsapp.globalLabel')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('adminWhatsapp.globalHelp')}
          </Typography>
        </Box>
        <Tooltip title={t('adminWhatsapp.reconcileHint')}>
          <span>
            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              disabled={reconciling}
              onClick={onReconcile}
            >
              {t('adminWhatsapp.reconcile')}
            </Button>
          </span>
        </Tooltip>
        <Switch
          checked={enabled}
          disabled={busy}
          color="success"
          onChange={(event) => onToggle(event.target.checked)}
          slotProps={{
            input: { 'aria-label': t('adminWhatsapp.globalLabel') }
          }}
        />
      </Stack>
    </Paper>
  );
}

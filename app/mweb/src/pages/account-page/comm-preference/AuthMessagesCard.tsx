import {
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  authMessageCardState,
  buildCommPreferenceLabels,
  findCommChannel,
  type CommChannel,
} from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { useCommPreference } from './useCommPreference';

interface Props {
  channel: CommChannel;
}

/**
 * The Authentication messages switch, on the channel's OWN screen.
 *
 * It used to sit on the shared Communication Preferences list, where the same
 * control appeared three times and none of them were where the rest of that
 * channel's settings were. Here it is the first thing on the channel's page:
 * one screen, one channel, every switch for it.
 *
 * The card owns its own query rather than taking the sheet as a prop. The
 * mutation answers with the whole sheet — switching one channel off can change
 * whether ANOTHER may still be switched off — so a page that already loads its
 * categories from a different document has nothing useful to hand down.
 */
export default function AuthMessagesCard({ channel }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildCommPreferenceLabels(t);
  const state = useCommPreference();
  const row = findCommChannel(state.preference?.channels, channel);

  // Nothing to show until the sheet lands. A skeleton here would push the
  // categories below it down a beat after the page had already settled.
  if (!row) return null;

  const card = authMessageCardState(row, labels);
  const busy = state.busyChannel === channel;

  return (
    <>
      {state.saveFailed && <Alert severity="error">{labels.saveFailed}</Alert>}

      <Card variant="outlined" data-testid={`auth-messages-${channel}`}>
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{
            alignItems: "flex-start"
          }}>
            <ShieldOutlinedIcon color="action" fontSize="small" sx={{ mt: 0.25 }} />
            <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{
                fontWeight: 700
              }}>
                {card.title}
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {card.body}
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {card.note}
              </Typography>
            </Stack>
            {/* The lock is explained on hover as well as in the note — the note
                is what a touch device gets, the tooltip what a pointer gets,
                and neither is the only place it is said. */}
            {busy && <CircularProgress size={20} sx={{ m: 1 }} />}
            {!busy && card.showSwitch && (
              <Tooltip title={card.canToggle ? '' : card.note}>
                <span>
                  <Switch
                    checked={card.checked}
                    disabled={!card.canToggle}
                    onChange={(event) => {
                      state.setOtpChannel(channel, event.target.checked).catch(() => {
                        /* reported through state.saveFailed */
                      });
                    }}
                    slotProps={{
                      input: { 'aria-label': card.title }
                    }}
                  />
                </span>
              </Tooltip>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={state.saved}
        autoHideDuration={2500}
        onClose={state.dismissSaved}
        message={labels.saved}
      />
    </>
  );
}

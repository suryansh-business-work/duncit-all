import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Drawer, Stack, Tooltip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitIconButton } from '@duncit/buttons';
import { ABOVE_TASKBAR_HEIGHT } from '../../workspace';
import { useTranslation } from '../../i18n/useTranslation';
import { AgentChat } from './AgentChat';
import { AgentDockTab } from './AgentDockTab';
import { AGENT_AVAILABILITY, type AgentAvailability } from './queries';

/**
 * The Agent, offered from every console.
 *
 * A tab stuck to the edge of the viewport rather than a header slot: the
 * shell's header is already full, and the Agent is something you reach for
 * mid-task on whatever page you happen to be on. The tab is draggable and stays
 * where each person leaves it — see AgentDockTab. The panel is a right-hand
 * drawer, so it covers the page it was opened over instead of reflowing it —
 * nothing you were reading moves.
 *
 * Availability is asked for once, when the tab is first shown, so a console
 * with no OpenAI key still renders the launcher and explains itself inside
 * rather than hiding a feature that merely needs configuring.
 */
export function AgentLauncher() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const restartRef = useRef<(() => void) | null>(null);
  const { data } = useQuery<{ agentAvailability: AgentAvailability }>(AGENT_AVAILABILITY, {
    fetchPolicy: 'cache-first',
  });

  const registerRestart = useCallback((restart: () => void) => {
    restartRef.current = restart;
  }, []);
  const close = useCallback(() => setOpen(false), []);

  const availability = data?.agentAvailability;

  return (
    <>
      {/* Hidden while the panel is up: the tab is fixed to the edge and sits
          ABOVE the drawer, so an open Agent had its own tab printed across it.
          There is nothing to launch from while it is already open. */}
      {!open && <AgentDockTab onOpen={() => setOpen(true)} />}

      <Drawer
        anchor="right"
        open={open}
        onClose={close}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 420 },
              // Or the composer — the last row of the column — is behind the
              // taskbar, which paints above the drawer.
              height: ABOVE_TASKBAR_HEIGHT,
              display: 'flex',
              flexDirection: 'column',
            },
          }
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider'
          }}>
          <AutoAwesomeIcon fontSize="small" color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{
              fontWeight: 700
            }}>
              {t('shell.agent.title')}
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('shell.agent.subtitle')}
            </Typography>
          </Box>
          <Tooltip title={t('shell.agent.restart')}>
            <DuncitIconButton size="small" onClick={() => restartRef.current?.()}>
              <RestartAltIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
          <DuncitIconButton size="small" onClick={close} aria-label={t('shell.agent.close')}>
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>

        {/* Mounted only while open: the thread is meant to start fresh each
            time, and keeping it alive behind a closed drawer would quietly
            resend an old conversation as context days later. */}
        {open && (
          <AgentChat
            isAvailable={availability?.is_available ?? true}
            canAct={availability?.can_act ?? true}
            onRegisterRestart={registerRestart}
          />
        )}
      </Drawer>
    </>
  );
}

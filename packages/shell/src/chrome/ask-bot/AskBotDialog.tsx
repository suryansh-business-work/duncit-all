import { useCallback, useRef, useState } from 'react';
import { Dialog, DialogTitle, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { BotChat } from './BotChat';
import { BotList } from './BotList';
import { useBotCopy } from './bot-copy';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PAPER_SX = { height: { xs: '100%', sm: '80vh' }, display: 'flex', flexDirection: 'column' } as const;

/**
 * Ask Bot: the list of bots, and the conversation with whichever one is open.
 *
 * Two views in one dialog rather than two dialogs, because going back to the
 * list is a step in the same task — and closing it entirely is the one thing a
 * person does when the answer has landed.
 */
export function AskBotDialog({ open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const copyOf = useBotCopy();
  const [botKey, setBotKey] = useState<string | null>(null);
  const restartRef = useRef<(() => void) | null>(null);
  const registerRestart = useCallback((restart: () => void) => {
    restartRef.current = restart;
  }, []);

  const copy = botKey ? copyOf(botKey) : null;
  const inChat = !!botKey && !!copy;

  const close = () => {
    setBotKey(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" slotProps={{
      paper: { sx: PAPER_SX }
    }}>
      <DialogTitle component="div" sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          {inChat && (
            <Tooltip title={t('shell.askBot.back')}>
              <DuncitIconButton size="small" edge="start" onClick={() => setBotKey(null)} aria-label={t('shell.askBot.back')}>
                <ArrowBackIcon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
          )}
          <Typography variant="h6" sx={{ flex: 1, minWidth: 0 }} noWrap>
            {copy ? copy.name : t('shell.askBot.title')}
          </Typography>
          {inChat && (
            <Tooltip title={t('shell.askBot.restart')}>
              <DuncitIconButton
                size="small"
                onClick={() => restartRef.current?.()}
                aria-label={t('shell.askBot.restart')}
              >
                <RestartAltIcon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
          )}
          <DuncitIconButton size="small" onClick={close} aria-label={t('shell.askBot.close')}>
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      </DialogTitle>

      {inChat ? (
        <BotChat botKey={botKey} copy={copy} onRegisterRestart={registerRestart} />
      ) : (
        <BotList onOpen={setBotKey} />
      )}
    </Dialog>
  );
}

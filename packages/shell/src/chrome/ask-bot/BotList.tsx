import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { useQuery } from '@apollo/client';
import { useTranslation } from '../../i18n/useTranslation';
import { AppIcon } from '../AppIcon';
import { useBotCopy } from './bot-copy';
import { ASK_BOTS, type AskBotEntry } from './queries';

interface Props {
  onOpen: (botKey: string) => void;
}

/**
 * The bots on offer.
 *
 * Which bots exist comes from the server, so a new one appears here without a
 * console release; what each one is CALLED is this bundle's localized copy, so
 * it reads in the reader's language (rule 38). A bot that cannot answer is still
 * listed, greyed, with the reason — a row that vanished would just look broken.
 */
export function BotList({ onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const copyOf = useBotCopy();
  const { data, loading, error } = useQuery<{ askBots: AskBotEntry[] }>(ASK_BOTS, {
    fetchPolicy: 'cache-and-network',
  });
  const bots = (data?.askBots ?? [])
    .map((bot) => ({ bot, copy: copyOf(bot.key) }))
    .filter((row): row is { bot: AskBotEntry; copy: NonNullable<ReturnType<typeof copyOf>> } => !!row.copy);

  if (loading && !data) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {t('shell.askBot.loadError')}
      </Alert>
    );
  }

  return (
    <Box sx={{ overflowY: 'auto' }}>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          px: 2,
          pb: 1
        }}>
        {t('shell.askBot.listSubtitle')}
      </Typography>
      <List disablePadding>
        {bots.map(({ bot, copy }) => (
          <ListItemButton
            key={bot.key}
            disabled={!bot.is_available}
            onClick={() => onOpen(bot.key)}
            alignItems="flex-start"
          >
            <ListItemIcon sx={{ mt: 0.5 }}>
              <AppIcon name={bot.icon} />
            </ListItemIcon>
            <ListItemText
              primary={copy.name}
              secondary={bot.is_available ? copy.description : t('shell.askBot.notConfigured')}
            />
            {!bot.is_available && (
              <Chip size="small" label={t('shell.askBot.unavailable')} sx={{ mt: 0.5, ml: 1 }} />
            )}
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  InputAdornment,
  List,
  ListItemButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from '@duncit/shell';
import type { SlackChannel } from './queries';

interface Props {
  channels: SlackChannel[];
  selectedId: string;
  onSelect: (channel: SlackChannel) => void;
}

/** One row. Hoisted so it is not redefined per render (S6478). */
function ChannelRow({
  channel,
  selected,
  onSelect,
  membersLabel,
}: Readonly<{
  channel: SlackChannel;
  selected: boolean;
  onSelect: (channel: SlackChannel) => void;
  membersLabel: string;
}>) {
  return (
    <ListItemButton
      selected={selected}
      onClick={() => onSelect(channel)}
      sx={{ borderRadius: 2, mb: 0.5, alignItems: 'flex-start' }}
    >
      <Stack sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{
          alignItems: "center"
        }}>
          {channel.is_private ? (
            <LockIcon sx={{ fontSize: 14 }} color="action" />
          ) : (
            <Typography
              component="span"
              sx={{
                color: "text.secondary",
                fontWeight: 800
              }}>
              #
            </Typography>
          )}
          <Typography noWrap sx={{
            fontWeight: selected ? 800 : 600
          }}>
            {channel.name}
          </Typography>
          {/* The bot only receives history for channels it belongs to, so this
              is the difference between a readable channel and an error. */}
          {!channel.is_member && <Chip size="small" variant="outlined" label={membersLabel} />}
        </Stack>
        {channel.topic && (
          <Typography variant="caption" noWrap sx={{
            color: "text.secondary"
          }}>
            {channel.topic}
          </Typography>
        )}
      </Stack>
    </ListItemButton>
  );
}

/** The left pane: every channel the bot can see, filtered as you type. */
export default function ChannelList({ channels, selectedId, onSelect }: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return channels;
    return channels.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.topic.toLowerCase().includes(needle)
    );
  }, [channels, search]);

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Box sx={{ p: 1.5, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('tech.slack.searchChannels')}
          aria-label={t('tech.slack.searchChannels')}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }
          }}
        />
      </Box>
      <List sx={{ flex: 1, overflowY: 'auto', px: 1, py: 0 }}>
        {filtered.map((c) => (
          <ChannelRow
            key={c.id}
            channel={c}
            selected={c.id === selectedId}
            onSelect={onSelect}
            membersLabel={t('tech.slack.notMember')}
          />
        ))}
        {filtered.length === 0 && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              px: 1.5,
              py: 2
            }}>
            {t('tech.slack.noChannelMatch')}
          </Typography>
        )}
      </List>
    </Stack>
  );
}

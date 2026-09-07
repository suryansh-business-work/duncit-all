import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Autocomplete, Chip, Stack, TextField, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import TagIcon from '@mui/icons-material/Tag';
import type { SlackChannel } from '../pages/slack/queries';

/**
 * Picking the Slack channel a feature posts to.
 *
 * Shared by App Builds and E2E Tests — both ask the same question, and two
 * copies would be two places for the "an ID the bot has not joined must still
 * be savable" rule to drift. It is generic over the form so each caller keeps
 * its own field name and its own schema.
 */

/** A stored value is an ID; the picker renders the name it belongs to. */
const channelLabel = (channel: SlackChannel) => `#${channel.name} (${channel.id})`;

/**
 * What is saved is an ID, which on its own says nothing about which channel it
 * is. Resolving it against the bot's channel list lets the field show the name
 * instead — and returning the ID unchanged when nothing matches is what keeps a
 * not-yet-joined channel savable.
 */
const resolveChannel = (value: string, channels: SlackChannel[]): SlackChannel | string =>
  channels.find((channel) => channel.id === value) ?? value;

/** The saved name, or a warning that this ID matched no channel the bot can see. */
function ChannelIdentity({
  resolved,
  unknownHint,
}: Readonly<{ resolved: SlackChannel | string; unknownHint: string }>) {
  if (typeof resolved !== 'string') {
    return (
      <Chip
        size="small"
        variant="outlined"
        color="success"
        icon={resolved.is_private ? <LockIcon /> : <TagIcon />}
        label={resolved.name}
        sx={{ alignSelf: 'flex-start' }}
      />
    );
  }
  if (!resolved.trim()) return null;
  return (
    <Typography variant="caption" sx={{ color: 'warning.main' }}>
      {unknownHint}
    </Typography>
  );
}

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint: string;
  channels: SlackChannel[];
  unknownHint: string;
}

/**
 * A channel picker that also takes a raw ID: the bot only lists channels it is
 * a member of, and the ID of a channel it has not joined yet must still be
 * savable (the post then works the moment the bot is invited).
 */
export default function SlackChannelField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  channels,
  unknownHint,
}: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        // Passing the CHANNEL (not the bare ID) as the value is what makes the
        // input read `#e2e-results (C0123ABCD)` — getOptionLabel formats the
        // value the same way it formats an option.
        const resolved = resolveChannel(String(field.value ?? ''), channels);
        return (
          <Stack spacing={0.75}>
            <Autocomplete
              freeSolo
              options={channels}
              value={resolved}
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : channelLabel(option)
              }
              isOptionEqualToValue={(option, value) =>
                option.id === (typeof value === 'string' ? value : value.id)
              }
              onChange={(_e, value) => {
                const next = typeof value === 'string' ? value : (value?.id ?? '');
                field.onChange(next);
              }}
              onInputChange={(_e, value, reason) => {
                // Free text is the value; 'reset' fires when an option is picked
                // (and when the list arrives and resolves the stored ID), and
                // would overwrite that ID with the display label.
                if (reason !== 'reset') field.onChange(value);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={label}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message ?? hint}
                  onBlur={field.onBlur}
                />
              )}
            />
            <ChannelIdentity resolved={resolved} unknownHint={unknownHint} />
          </Stack>
        );
      }}
    />
  );
}

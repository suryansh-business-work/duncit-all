import { Box, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  CONTACT_CHANNELS,
  currentContactValue,
  type ContactChangeLabels,
  type ContactChannel,
  type ContactSnapshot,
} from '@duncit/utils';

interface RowProps {
  channel: ContactChannel;
  labels: ContactChangeLabels;
  value: string;
  onChange: (channel: ContactChannel) => void;
}

/**
 * One contact detail: what it is, what it currently is, and the way to move it.
 *
 * Read-only on purpose. These three are the only profile fields whose change
 * has to be proved, so they are not boxes that quietly disagree with the
 * account until Save is pressed — each is the value the account actually holds,
 * with the one door that can change it beside it.
 *
 * All three are required: a missing one is marked with the same asterisk the
 * form's required boxes carry, and its empty line is coloured as the error it
 * is rather than greyed out like an optional blank.
 */
function ContactRow({ channel, labels, value, onChange }: Readonly<RowProps>) {
  const copy = labels.channel(channel);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {copy.name}
          <Box component="span" aria-hidden sx={{ color: 'error.main', ml: 0.25 }}>
            *
          </Box>
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: value ? 'text.primary' : 'error.main' }}>
          {value || copy.emptyValue}
        </Typography>
      </Stack>
      <DuncitButton
        type="button"
        size="small"
        variant="outlined"
        onClick={() => onChange(channel)}
        data-testid={`contact-change-${channel}`}
      >
        {value ? labels.changeAction : labels.addAction}
      </DuncitButton>
    </Stack>
  );
}

interface Props {
  labels: ContactChangeLabels;
  snapshot: ContactSnapshot;
  onChange: (channel: ContactChannel) => void;
}

/** The three contact rows, in the one order both apps list them in. */
export default function ContactRows({ labels, snapshot, onChange }: Readonly<Props>) {
  return (
    <Stack spacing={1} divider={<Divider flexItem />}>
      {CONTACT_CHANNELS.map((channel) => (
        <ContactRow
          key={channel}
          channel={channel}
          labels={labels}
          value={currentContactValue(snapshot, channel)}
          onChange={onChange}
        />
      ))}
    </Stack>
  );
}

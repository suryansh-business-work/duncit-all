import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  CONTACT_CHANNELS,
  contactValueVerified,
  currentContactValue,
  type ContactChangeLabels,
  type ContactChannel,
  type ContactSnapshot,
} from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

interface RowProps {
  channel: ContactChannel;
  labels: ContactChangeLabels;
  value: string;
  /** A one-time code proved this number (`contactValueVerified`). */
  verified: boolean;
  onChange: (channel: ContactChannel) => void;
}

/** The tick beside a proved number — worded, so it never rests on colour alone. */
function VerifiedBadge({ channel, label }: Readonly<{ channel: ContactChannel; label: string }>) {
  return (
    <Stack
      direction="row"
      spacing={0.25}
      data-testid={`contact-change-${channel}-verified`}
      sx={{ alignItems: 'center', flexShrink: 0 }}
    >
      <CheckCircleIcon aria-hidden color="success" sx={{ fontSize: 16 }} />
      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
        {label}
      </Typography>
    </Stack>
  );
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
function ContactRow({ channel, labels, value, verified, onChange }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const copy = labels.channel(channel);
  const action = value ? labels.changeAction : labels.addAction;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {copy.name}
          <Box component="span" aria-hidden sx={{ color: 'error.main', ml: 0.25 }}>
            *
          </Box>
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography
            data-testid={`contact-change-${channel}-value`}
            noWrap
            sx={{ fontSize: 15, minWidth: 0, color: value ? 'text.primary' : 'error.main' }}
          >
            {value || copy.emptyValue}
          </Typography>
          {verified && <VerifiedBadge channel={channel} label={labels.verified} />}
        </Stack>
      </Stack>
      <DuncitButton
        type="button"
        size="small"
        color="inherit"
        onClick={() => onChange(channel)}
        data-testid={`contact-change-${channel}`}
        aria-label={t('mweb.a11y.actionFor', { vars: { action, name: copy.name } })}
        sx={{ bgcolor: 'action.hover', minHeight: 36, px: 2 }}
      >
        {action}
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
          verified={contactValueVerified(snapshot, channel)}
          onChange={onChange}
        />
      ))}
    </Stack>
  );
}

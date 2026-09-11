import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import { readFollowStatus } from '@duncit/utils';
import FollowButton from '../../components/FollowButton';
import { useTranslation } from '../../i18n/useTranslation';
import type { ContactRow as ContactRowData } from './queries';

interface Props {
  row: ContactRowData;
  /** Returns the follow's promise, so the row's own button spins for it. */
  onToggleFollow: (row: ContactRowData) => Promise<void>;
  onOpen: (userId: string) => void;
}

/** Avatar, name, @handle, the phone-book name it was saved under and the
 * three-state follow button; the identity opens the profile. Twin of native
 * `ContactRow` (rule 27). */
export default function ContactRow({ row, onToggleFollow, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { profile } = row;
  const name = profile.full_name || profile.first_name || row.contact_label;
  const savedAs =
    row.contact_label && row.contact_label !== name
      ? t('mweb.contacts.savedAs', { vars: { label: row.contact_label } })
      : '';
  const open = () => onOpen(profile.user_id);

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }}>
      <Avatar
        src={profile.profile_photo || undefined}
        onClick={open}
        sx={{ cursor: 'pointer' }}
      >
        {name[0]?.toUpperCase()}
      </Avatar>
      <Box
        role="button"
        tabIndex={0}
        aria-label={t('mweb.podDetails.openProfileOf', { vars: { name } })}
        data-testid={`contact-row-${profile.user_id}`}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        }}
        sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          {row.is_nearby && (
            <Chip size="small" color="primary" variant="outlined" label={t('mweb.contacts.nearbyBadge')} />
          )}
        </Stack>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
          {[`@${profile.username}`, savedAs].filter(Boolean).join(' · ')}
        </Typography>
      </Box>
      <FollowButton
        status={readFollowStatus(profile)}
        followsViewer={profile.follows_viewer}
        onToggle={() => onToggleFollow(row)}
      />
    </Stack>
  );
}

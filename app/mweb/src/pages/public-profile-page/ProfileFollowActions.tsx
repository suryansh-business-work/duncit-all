import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { followActionFor, readFollowStatus } from '@duncit/utils';
import FollowButton from '../../components/FollowButton';
import { AnswerButtons } from '../../components/app-header/notifications-screen/FollowRequestActions/FollowActionButtons';
import {
  ANSWER_FOLLOW_REQUEST,
  CANCEL_FOLLOW_REQUEST,
  FOLLOW_USER,
  REJECT_FOLLOW_REQUEST,
  UNFOLLOW_USER,
} from '../hosts-venues-page/queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  profile: {
    user_id: string;
    follow_status?: string | null;
    is_following?: boolean | null;
    /** The other direction of the edge — this person follows the viewer. */
    follows_viewer?: boolean | null;
    /** Their OPEN ask to follow the viewer, answerable right here. */
    inbound_request_id?: string | null;
  };
  /** Re-read the profile once anything changed; the server is the authority. */
  onChanged: () => Promise<unknown>;
}

type Busy = 'follow' | 'answer' | null;

/**
 * Everything the viewer can do about the follow relationship from a profile.
 *
 * Both directions are read from the profile itself, never from a notification:
 * `follow_status` drives Follow / Follow Back / Requested / Following, and
 * `inbound_request_id` — the owner's open ask to follow the viewer — renders
 * Accept / Deny above it. Answering here and answering in the inbox act on the
 * same FollowRequest, so whichever the viewer reaches first is the one that
 * counts. Twin of native's ProfileFollowActions (rule 27).
 */
export default function ProfileFollowActions({ profile, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [follow] = useMutation<any>(FOLLOW_USER);
  const [unfollow] = useMutation<any>(UNFOLLOW_USER);
  const [cancelRequest] = useMutation<any>(CANCEL_FOLLOW_REQUEST);
  const [accept] = useMutation<any>(ANSWER_FOLLOW_REQUEST);
  const [reject] = useMutation<any>(REJECT_FOLLOW_REQUEST);
  // Which action is in flight, so only the tapped control wears the spinner.
  const [busy, setBusy] = useState<Busy>(null);

  const status = readFollowStatus(profile);
  const mutations = { FOLLOW: follow, UNFOLLOW: unfollow, CANCEL_REQUEST: cancelRequest };

  const run = async (kind: Exclude<Busy, null>, send: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await send();
      await onChanged();
    } catch {
      // The server is re-read either way; a failed tap simply leaves the
      // button on the state the server still reports.
    } finally {
      setBusy(null);
    }
  };

  const toggleFollow = () =>
    run('follow', () =>
      mutations[followActionFor(status)]({ variables: { user_id: profile.user_id } })
    );
  const answer = (mutate: typeof accept) =>
    run('answer', () => mutate({ variables: { request_id: profile.inbound_request_id } }));

  return (
    <Stack spacing={1} sx={{ alignItems: 'center' }}>
      {profile.inbound_request_id && (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t('mweb.follow.wantsToFollowYou')}
          </Typography>
          <AnswerButtons
            accentInk="primary.main"
            quietInk="text.secondary"
            dimQuiet={false}
            busy={busy !== null}
            spinning={busy === 'answer'}
            acceptLabel={t('mweb.follow.accept')}
            denyLabel={t('mweb.follow.reject')}
            onAccept={() => answer(accept).catch(() => undefined)}
            onDeny={() => answer(reject).catch(() => undefined)}
          />
        </Stack>
      )}
      <FollowButton
        status={status}
        followsViewer={profile.follows_viewer}
        loading={busy === 'follow'}
        disabled={busy !== null}
        onToggle={() => toggleFollow().catch(() => undefined)}
      />
    </Stack>
  );
}

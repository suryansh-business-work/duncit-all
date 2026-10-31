import { useId, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import type { SocialAccount } from '../queries';
import {
  CREATE_SCHEDULED_SOCIAL_POST,
  PUBLISH_LISTS,
  UPDATE_SCHEDULED_SOCIAL_POST,
  type SocialPublishMode,
  type SocialScheduledPost,
} from '../publish.queries';
import {
  SocialPostForm,
  blankSocialPostValues,
  mediaFromUrl,
  postMedia,
  sentBackNote,
  toSocialPostInput,
  type SocialPostFormValues,
} from '../social-post-form';

/** Where the composer was opened from, and what it starts with. */
export interface ComposerRequest {
  /** Editing this post; absent for a new one. */
  post?: SocialScheduledPost;
  text?: string;
  /** One picture an idea hands over; the composer can add more. */
  media_url?: string;
  scheduled_at?: string;
  idea_id?: string;
  /** The reel the post is made from, when it came from Reel Studio; the post remembers it. */
  reel_project_id?: string;
}

const DONE: Record<SocialPublishMode, string> = {
  DRAFT: 'marketing.social.draftSaved',
  NOW: 'marketing.social.publishingNow',
  SCHEDULE: 'marketing.social.postScheduled',
};

/** What to say once it is saved: a draft is a draft, and anything else parked for a manager was sent for approval. */
const doneKey = (values: SocialPostFormValues) =>
  values.mode !== 'DRAFT' && values.needs_approval ? 'marketing.social.sentForApproval' : DONE[values.mode];

function initialValues(request: ComposerRequest) {
  const { post } = request;
  if (post) {
    return blankSocialPostValues({
      account_ids: post.targets.map((target) => target.account_id),
      text: post.text,
      media: postMedia(post),
      scheduled_at: post.scheduled_at ?? '',
      needs_approval: post.needs_approval,
      collaborators: post.collaborators,
    });
  }
  // Only what the request carries: an idea brings text, a calendar day brings a time, and a
  // spread `undefined` would otherwise wipe the blank defaults the schema needs.
  return blankSocialPostValues({
    text: request.text ?? '',
    media: request.media_url ? [mediaFromUrl(request.media_url)] : [],
    scheduled_at: request.scheduled_at ?? '',
  });
}

interface Props {
  request: ComposerRequest | null;
  accounts: SocialAccount[];
  onClose: () => void;
}

export default function ComposerDialog({ request, accounts, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const fullScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const [error, setError] = useState<string | null>(null);
  const [createMut] = useMutation(CREATE_SCHEDULED_SOCIAL_POST, { refetchQueries: PUBLISH_LISTS });
  const [updateMut] = useMutation(UPDATE_SCHEDULED_SOCIAL_POST, { refetchQueries: PUBLISH_LISTS });

  const close = () => {
    setError(null);
    onClose();
  };

  const submit = async (values: SocialPostFormValues) => {
    setError(null);
    const post = request?.post;
    const input = toSocialPostInput(values, post?.idea_id || request?.idea_id || null, request?.reel_project_id ?? null);
    try {
      if (post) await updateMut({ variables: { id: post.id, input } });
      else await createMut({ variables: { input } });
    } catch (err) {
      setError(parseApiError(err));
      return;
    }
    notify(t(doneKey(values)), 'success');
    close();
  };

  const title = request?.post ? t('marketing.social.editPost') : t('marketing.social.createPost');

  return (
    <Dialog open={!!request} onClose={close} fullWidth maxWidth="md" fullScreen={fullScreen} aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        {request && (
          <SocialPostForm
            accounts={accounts}
            initial={initialValues(request)}
            errorMessage={error}
            reviewNote={request.post ? sentBackNote(request.post) : null}
            onCancel={close}
            onSubmit={submit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

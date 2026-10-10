import { useMemo } from 'react';
import CollectionsIcon from '@mui/icons-material/Collections';
import { useConfirm } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import {
  CHALLENGE_SUBMISSIONS_FOLDER,
  acceptedMediaTypes,
  allowsCaption,
  challengeEntries,
  mediaTypeOfMime,
  type ChallengeEntry,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useImagekitUpload } from '../../utils/imagekit';
import { notifyError } from '../notify';
import ChallengeGallery from './ChallengeGallery';
import type { PanelProps } from './ChallengeToolPanels';
import ToolCard from './ToolCard';
import { SubmissionForm, type SubmissionValues } from './submission-form';

/** Statuses in which a piece can still be submitted or replaced. */
const OPEN = new Set(['SCHEDULED', 'LIVE']);
/** A host can still take an entry down until the result is published and archived. */
const HOST_REMOVABLE = new Set(['SCHEDULED', 'LIVE', 'PAUSED', 'COMPLETED']);

/**
 * A Submission tool: the gallery, and the form for whoever may add to it — a
 * competitor submits their own piece (again replaces it), a host submits on a
 * competitor's behalf. The file goes to the media store first; the server only
 * accepts a link from there.
 */
export default function ChallengeSubmissionPanel({ challenge, tool, actions, interactive }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { upload, uploading } = useImagekitUpload();
  const entries = challengeEntries(tool);
  const names = useMemo(() => new Map(challenge.competitors.map((c) => [c.competitor_id, c.name])), [challenge.competitors]);
  const accepted = useMemo(() => acceptedMediaTypes(tool), [tool]);
  const { can_manage: manages, my_competitor_id: mine } = challenge.viewer;
  const open = OPEN.has(challenge.status);
  const canSubmit = interactive && open && (manages || !!mine);

  const canRemove = (entry: ChallengeEntry) => {
    if (!interactive) return false;
    return manages ? HOST_REMOVABLE.has(challenge.status) : open && entry.competitor_id === mine;
  };
  const remove = async (entry: ChallengeEntry) => {
    const ok = await confirm({
      title: t('mweb.challenge.tools.removeEntryTitle'),
      message: t('mweb.challenge.tools.removeEntryBody', { vars: { name: names.get(entry.competitor_id) ?? '' } }),
      confirmLabel: t('mweb.challenge.removeRow'),
      cancelLabel: t('mweb.challenge.cancel'),
      destructive: true,
    });
    if (ok) await actions.removeEntry(entry.id);
  };
  const submit = async (values: SubmissionValues): Promise<boolean> => {
    const mediaType = mediaTypeOfMime(values.file?.type);
    // The form's schema has already refused a missing or unsupported file.
    if (!values.file || !mediaType) return false;
    try {
      const mediaUrl = await upload(values.file, CHALLENGE_SUBMISSIONS_FOLDER);
      return await actions.submit(tool.instance_id, {
        media_url: mediaUrl,
        media_type: mediaType,
        caption: values.caption,
        competitor_id: manages ? values.competitor_id : null,
      });
    } catch (error) {
      logs.mWeb.warn('pod-challenge', 'submission-upload', { error });
      notifyError((error as Error).message);
      return false;
    }
  };

  return (
    <ToolCard icon={<CollectionsIcon color="primary" />} title={tool.label}>
      <ChallengeGallery
        entries={entries}
        names={names}
        canRemove={canRemove}
        onRemove={(entry) => fireAndForget(remove(entry), logs.mWeb, 'pod-challenge', 'remove-entry')}
        busy={actions.busy}
      />
      {canSubmit && (
        <SubmissionForm
          accepted={accepted}
          allowCaption={allowsCaption(tool)}
          competitors={manages ? challenge.competitors : undefined}
          replacing={!manages && entries.some((e) => e.competitor_id === mine)}
          saving={uploading || actions.busy}
          onSubmit={submit}
        />
      )}
    </ToolCard>
  );
}

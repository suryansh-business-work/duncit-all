import { useMemo, useState } from 'react';
import {
  CHALLENGE_SUBMISSIONS_FOLDER,
  acceptedMediaTypes,
  allowsCaption,
  challengeEntries,
  mediaTypeOfMime,
  type ChallengeEntry,
} from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import type { SubmissionValues } from '@/forms/challenge';
import { useTranslation } from '@/hooks/useTranslation';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { fireAndForget } from '@/utils/fire-and-forget';

import { EntryGallery } from './EntryGallery';
import { SubmissionForm } from './SubmissionForm';
import { ToolCard, type PanelProps } from './ToolCard';

/** Statuses in which a piece can still be submitted or replaced. */
const OPEN = new Set(['SCHEDULED', 'LIVE']);
/** A host can still take an entry down until the challenge is archived. */
const HOST_REMOVABLE = new Set(['SCHEDULED', 'LIVE', 'PAUSED', 'COMPLETED']);

/**
 * A Submission tool — the Tamagui twin of mWeb's ChallengeSubmissionPanel
 * (rule 27): the gallery, and the form for whoever may add to it. The file
 * goes to the media store first; the server only accepts a link from there.
 */
export function SubmissionPanel({ challenge, tool, actions }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<ChallengeEntry | null>(null);
  const entries = challengeEntries(tool);
  const names = useMemo(
    () => new Map(challenge.competitors.map((c) => [c.competitor_id, c.name])),
    [challenge.competitors],
  );
  const accepted = useMemo(() => acceptedMediaTypes(tool), [tool]);
  const { can_manage: manages, my_competitor_id: mine } = challenge.viewer;
  const open = OPEN.has(challenge.status);
  const testID = `challenge-submission-${tool.instance_id}`;

  const canRemove = (entry: ChallengeEntry) =>
    manages ? HOST_REMOVABLE.has(challenge.status) : open && entry.competitor_id === mine;
  const submit = async (values: SubmissionValues): Promise<boolean> => {
    const mediaType = mediaTypeOfMime(values.file?.type);
    // The picker and the form's schema have already refused a missing or unsupported file.
    if (!values.file || !mediaType) return false;
    setUploading(true);
    try {
      const mediaUrl = await uploadToImagekitDirect(values.file, CHALLENGE_SUBMISSIONS_FOLDER);
      return await actions.submit(tool.instance_id, {
        media_url: mediaUrl,
        media_type: mediaType,
        caption: values.caption,
        competitor_id: manages ? values.competitor_id : null,
      });
    } catch (e) {
      actions.fail((e as Error).message);
      return false;
    } finally {
      setUploading(false);
    }
  };
  const confirmRemove = async () => {
    if (removing) await actions.removeEntry(removing.id);
    setRemoving(null);
  };

  return (
    <ToolCard icon="collections" title={tool.label} testID={testID}>
      {actions.error ? <NoticeCard tone="danger" title={actions.error} /> : null}
      <EntryGallery
        entries={entries}
        names={names}
        canRemove={canRemove}
        onRemove={setRemoving}
        busy={actions.busy}
      />
      {open && (manages || mine) ? (
        <SubmissionForm
          testID={testID}
          accepted={accepted}
          allowCaption={allowsCaption(tool)}
          competitors={manages ? challenge.competitors : undefined}
          replacing={!manages && entries.some((e) => e.competitor_id === mine)}
          saving={uploading || actions.busy}
          onSubmit={submit}
        />
      ) : null}
      <ConfirmDialog
        open={!!removing}
        title={t('mweb.challenge.tools.removeEntryTitle')}
        message={t('mweb.challenge.tools.removeEntryBody', {
          vars: { name: names.get(removing?.competitor_id ?? '') ?? '' },
        })}
        confirmLabel={t('mweb.challenge.removeRow')}
        cancelLabel={t('mweb.challenge.cancel')}
        destructive
        busy={actions.busy}
        onConfirm={() => fireAndForget(confirmRemove())}
        onCancel={() => setRemoving(null)}
        testID={`${testID}-remove-confirm`}
      />
    </ToolCard>
  );
}

import { useState } from 'react';
import { Separator, Text, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import { CRM_LEAD_MEDIA_GROUPS } from '@duncit/utils';

import { Card } from '@/components/Card';
import { StateView } from '@/components/StateView';
import { useTranslation } from '@/hooks/useTranslation';
import { MediaDialogs, type MediaDialog } from './MediaDialogs';
import { MediaGroup } from './MediaGroup';
import { useLeadMedia } from './MediaState';
import { TabAlert } from './TabAlert';
import type { LeadTabProps } from './TabsBTypes';

const SCOPE = 'crm-app/MediaTab';

/**
 * Lead Details › Logos & Images — the same tab on every lead kind. Logos and
 * images are kept apart (a logo is shown whole, an image fills its frame);
 * each can be previewed, replaced, renamed, moved to the other group or
 * deleted, and new ones come from the phone's library. Every change is saved
 * as it happens; there is no Save button.
 */
export function MediaTab({ kind, id }: Readonly<LeadTabProps>) {
  const { t } = useTranslation();
  const media = useLeadMedia(kind, id);
  const [dialog, setDialog] = useState<MediaDialog>({ kind: 'none' });
  // A rename error belongs to its form; any other error stays on the tab after its dialog closes.
  const close = () => {
    if (dialog.kind === 'rename') media.clearActionError();
    setDialog({ kind: 'none' });
  };

  if (media.loading || media.loadError) {
    return <StateView loading={media.loading} error={media.loadError} onRetry={media.refetch} />;
  }
  return (
    <Card title={t('crm.media.tabLabel')} testID="media-tab">
      <Text color="$muted">{t('crm.media.tabSubtitle')}</Text>
      {media.uploadErrors.length > 0 ? (
        <TabAlert tone="warning" onClose={media.clearUploadErrors} testID="media-upload-errors">
          {media.uploadErrors.map((message, index) => (
            <Text key={`${index}-${message}`} color="$warning">
              {message}
            </Text>
          ))}
        </TabAlert>
      ) : null}
      {media.actionError && dialog.kind !== 'rename' ? (
        <TabAlert tone="danger" onClose={media.clearActionError} testID="media-error">
          {media.actionError}
        </TabAlert>
      ) : null}
      {CRM_LEAD_MEDIA_GROUPS.map((group, index) => (
        <YStack key={group.kind} gap="$3">
          {index > 0 ? <Separator borderColor="$borderColor" /> : null}
          <MediaGroup
            group={group}
            items={media.items.filter((item) => item.kind === group.kind)}
            busy={media.busy}
            onUpload={() => fireAndForget(media.add(group.kind), logs.mobileApp, SCOPE, 'upload')}
            onPreview={(item) => setDialog({ kind: 'preview', item })}
            onActions={(item) => setDialog({ kind: 'menu', item })}
          />
        </YStack>
      ))}
      <MediaDialogs
        dialog={dialog}
        busy={media.busy}
        error={media.actionError}
        onOpen={setDialog}
        onClose={close}
        onReplace={(item) => fireAndForget(media.replace(item), logs.mobileApp, SCOPE, 'replace')}
        onMove={(item) => fireAndForget(media.move(item), logs.mobileApp, SCOPE, 'move')}
        onRename={media.rename}
        onDelete={media.remove}
      />
    </Card>
  );
}

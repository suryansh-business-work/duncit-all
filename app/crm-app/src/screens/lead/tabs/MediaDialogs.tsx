import { YStack } from 'tamagui';
import { CRM_LEAD_MEDIA_GROUPS, crmImageMeta } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { MediaNameForm } from '@/forms/media-name';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadMediaItem } from './MediaState';
import { MediaPicture } from './MediaTile';
import { TabSheet } from './TabSheet';

export type MediaDialog =
  { kind: 'none' } | { kind: 'menu' | 'preview' | 'rename' | 'delete'; item: LeadMediaItem };

interface Props {
  dialog: MediaDialog;
  busy: boolean;
  error: string | null;
  onOpen: (next: MediaDialog) => void;
  onClose: () => void;
  onReplace: (item: LeadMediaItem) => void;
  onMove: (item: LeadMediaItem) => void;
  onRename: (item: LeadMediaItem, name: string) => Promise<boolean>;
  onDelete: (item: LeadMediaItem) => Promise<boolean>;
}

const itemOf = (dialog: MediaDialog, kind: MediaDialog['kind']) =>
  dialog.kind === kind && 'item' in dialog ? dialog.item : null;

/** A tile's actions menu, the full-size preview, the rename form and the delete confirm. */
export function MediaDialogs(props: Readonly<Props>) {
  const { t } = useTranslation();
  const { dialog, busy, onOpen, onClose } = props;
  const menu = itemOf(dialog, 'menu');
  const preview = itemOf(dialog, 'preview');
  const renaming = itemOf(dialog, 'rename');
  const deleting = itemOf(dialog, 'delete');
  const nameOf = (item: LeadMediaItem | null) => item?.name || t('crm.media.untitled');
  const moveKey = CRM_LEAD_MEDIA_GROUPS.find((g) => g.kind === menu?.kind)?.moveKey;
  const act = (run: (item: LeadMediaItem) => void) => () => {
    if (!menu) return;
    onClose();
    run(menu);
  };

  return (
    <>
      <TabSheet
        open={Boolean(menu)}
        title={t('crm.media.actionsFor', { vars: { name: nameOf(menu) } })}
        onClose={onClose}
        testID="media-menu"
      >
        <YStack gap="$2">
          <DuncitButton
            label={t('crm.media.preview')}
            onPress={act((item) => onOpen({ kind: 'preview', item }))}
            variant="outline"
            fullWidth
            testID="media-menu-preview"
          />
          <DuncitButton
            label={t('crm.media.replace')}
            onPress={act(props.onReplace)}
            variant="outline"
            disabled={busy}
            fullWidth
            testID="media-menu-replace"
          />
          <DuncitButton
            label={t('crm.media.rename')}
            onPress={act((item) => onOpen({ kind: 'rename', item }))}
            variant="outline"
            disabled={busy}
            fullWidth
            testID="media-menu-rename"
          />
          <DuncitButton
            label={moveKey ? t(moveKey) : ''}
            onPress={act(props.onMove)}
            variant="outline"
            disabled={busy}
            fullWidth
            testID="media-menu-move"
          />
          <DuncitButton
            label={t('shell.common.delete')}
            onPress={act((item) => onOpen({ kind: 'delete', item }))}
            variant="outline"
            tone="danger"
            disabled={busy}
            fullWidth
            testID="media-menu-delete"
          />
        </YStack>
      </TabSheet>
      <TabSheet
        open={Boolean(preview)}
        title={nameOf(preview)}
        subtitle={preview ? crmImageMeta(preview) : undefined}
        onClose={onClose}
        testID="media-preview"
      >
        {preview ? (
          <YStack aspectRatio={1} width="100%" backgroundColor="$soft">
            <MediaPicture item={preview} fit="contain" />
          </YStack>
        ) : null}
      </TabSheet>
      <TabSheet
        open={Boolean(renaming)}
        title={t('crm.media.rename')}
        busy={busy}
        onClose={onClose}
        testID="media-rename"
      >
        {renaming ? (
          <MediaNameForm
            initialName={renaming.name}
            busy={busy}
            error={props.error}
            onCancel={onClose}
            onSubmit={async ({ name }) => {
              if (await props.onRename(renaming, name)) onClose();
            }}
          />
        ) : null}
      </TabSheet>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('crm.media.deleteTitle')}
        message={t('crm.media.deleteMessage', { vars: { name: nameOf(deleting) } })}
        confirmLabel={t('shell.common.delete')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={busy}
        onConfirm={() => {
          if (!deleting) return;
          const done = props.onDelete(deleting).then(onClose);
          fireAndForget(done, logs.mobileApp, 'crm-app/MediaTab', 'delete');
        }}
        onCancel={onClose}
        testID="media-delete"
      />
    </>
  );
}

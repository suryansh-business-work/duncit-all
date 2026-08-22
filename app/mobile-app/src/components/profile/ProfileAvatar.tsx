import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { StatusViewer } from '@/components/status/StatusViewer';
import { AvatarStoryButton } from './AvatarStoryButton';
import { PhotoActionSheet } from './PhotoActionSheet';
import { CropDialog } from './crop/CropDialog';
import { useProfileAvatar } from './useProfileAvatar';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  photo?: string | null;
  initial: string;
  size: number;
  /** Refresh callback after the photo or story changes (refetch the screen). */
  onChanged?: () => void | Promise<void>;
}

/**
 * The interactive profile avatar: story ring + tap-to-view, long-press/pencil
 * photo menu (View / Change / Remove), crop dialog and the own-story viewer
 * with a delete action. Shared by both profile headers.
 *
 * It does not post stories. That entrance lives on Home, with the rest of the
 * status rail — see AvatarStoryButton for why it was taken off the photo.
 */
export function ProfileAvatar({ photo, initial, size, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const a = useProfileAvatar(onChanged, !!photo);
  const deleteId = a.deleteId;

  return (
    <>
      <AvatarStoryButton
        photo={photo}
        initial={initial}
        size={size}
        hasStory={a.hasStory}
        saving={a.saving}
        onPress={a.onAvatarPress}
        onLongPress={a.openMenu}
        onEditPhoto={a.openMenu}
      />

      <PhotoActionSheet
        open={a.menuOpen}
        hasPhoto={!!photo}
        onView={a.viewPhoto}
        onChange={a.changePhoto}
        onRemove={a.askRemove}
        onClose={() => a.setMenuOpen(false)}
      />

      {photo ? (
        <ImageViewerModal
          images={[photo]}
          index={a.viewerOpen ? 0 : null}
          onClose={() => a.setViewerOpen(false)}
        />
      ) : null}

      <CropDialog photo={a.picked} saving={a.saving} onConfirm={a.upload} onCancel={a.cancelPick} />

      <ConfirmDialog
        open={a.removeOpen}
        title={t('mweb.common.removePhoto2')}
        message={t('mweb.common.yourProfilePictureWillBeRemoved')}
        confirmLabel={t('mweb.common.remove')}
        cancelLabel={t('mweb.common.cancel')}
        destructive
        onConfirm={() => void a.confirmRemove()}
        onCancel={() => a.setRemoveOpen(false)}
        testID="remove-photo-confirm"
      />

      {a.storyOpen && a.mine ? (
        <StatusViewer
          status={a.mine}
          onClose={() => a.setStoryOpen(false)}
          onDelete={a.setDeleteId}
        />
      ) : null}

      {deleteId === null ? null : (
        <ConfirmDialog
          open
          title={t('mweb.common.deleteStory')}
          message={t('mweb.common.thisStoryWillBeRemovedFor')}
          confirmLabel={t('mweb.common.delete')}
          cancelLabel={t('mweb.common.cancel')}
          destructive
          onConfirm={() => void a.confirmDeleteStory(deleteId)}
          onCancel={() => a.setDeleteId(null)}
          testID="delete-story-confirm"
        />
      )}
    </>
  );
}

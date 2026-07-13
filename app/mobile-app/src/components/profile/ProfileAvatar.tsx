import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { StatusViewer } from '@/components/status/StatusViewer';
import { AvatarStoryButton } from './AvatarStoryButton';
import { PhotoActionSheet } from './PhotoActionSheet';
import { CropDialog } from './crop/CropDialog';
import { useProfileAvatar } from './useProfileAvatar';

interface Props {
  photo?: string | null;
  initial: string;
  size: number;
  /** Refresh callback after the photo or story changes (refetch the screen). */
  onChanged?: () => void | Promise<void>;
}

/** The interactive profile avatar (items 9 + 12): story ring + tap-to-view/add,
 * long-press/pencil photo menu (View / Change / Remove), crop dialog and the
 * own-story viewer with a delete action. Shared by both profile headers. */
export function ProfileAvatar({ photo, initial, size, onChanged }: Readonly<Props>) {
  const a = useProfileAvatar(onChanged);
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
        onAddStory={() => void a.addStory()}
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
        title="Remove photo?"
        message="Your profile picture will be removed."
        confirmLabel="Remove"
        cancelLabel="Cancel"
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
          title="Delete story?"
          message="This story will be removed for everyone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          destructive
          onConfirm={() => void a.confirmDeleteStory(deleteId)}
          onCancel={() => a.setDeleteId(null)}
          testID="delete-story-confirm"
        />
      )}
    </>
  );
}

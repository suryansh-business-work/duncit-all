import { useState } from 'react';

import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { useStatus } from '@/hooks/useStatus';
import { useStatusStore } from '@/stores/status.store';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * State machine behind the profile avatar (items 9 + 12): the photo menu, the
 * full-screen viewer, crop dialog, remove confirm, the own-story viewer and the
 * delete-story confirm. Keeps <ProfileAvatar/> declarative and under the line cap.
 */
export function useProfileAvatar(onChanged?: () => void | Promise<void>, hasPhoto = false) {
  const { mine, refetch } = useStatus();
  const deleteStory = useStatusStore((s) => s.deleteStory);
  const { picked, saving, pick, upload, remove, cancelPick } = useProfilePhoto(onChanged);

  const [menuOpen, setMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const hasStory = !!mine && mine.slides.length > 0;

  /**
   * Tap the avatar: watch the live story if there is one, otherwise look at
   * the photo full-size.
   *
   * It used to open the story picker when there was no story, which made the
   * profile picture publish something. Posting a story is Home’s job now —
   * this avatar only ever SHOWS. mWeb does exactly the same (rule 27).
   */
  const onAvatarPress = () => {
    if (hasStory) {
      setStoryOpen(true);
      return;
    }
    if (hasPhoto) setViewerOpen(true);
  };

  const openMenu = () => setMenuOpen(true);

  // The View row only renders when a photo exists, so opening the viewer here is
  // always valid.
  const viewPhoto = () => {
    setMenuOpen(false);
    setViewerOpen(true);
  };

  const changePhoto = () => {
    setMenuOpen(false);
    fireAndForget(pick());
  };

  const askRemove = () => {
    setMenuOpen(false);
    setRemoveOpen(true);
  };

  const confirmRemove = async () => {
    setRemoveOpen(false);
    await remove();
  };

  const confirmDeleteStory = async (id: string) => {
    setDeleteId(null);
    await deleteStory(id);
    await refetch();
    setStoryOpen(false);
    await onChanged?.();
  };

  return {
    mine,
    hasStory,
    picked,
    saving,
    menuOpen,
    viewerOpen,
    storyOpen,
    removeOpen,
    deleteId,
    onAvatarPress,
    openMenu,
    viewPhoto,
    changePhoto,
    askRemove,
    confirmRemove,
    upload,
    cancelPick,
    setMenuOpen,
    setViewerOpen,
    setStoryOpen,
    setRemoveOpen,
    setDeleteId,
    confirmDeleteStory,
  };
}

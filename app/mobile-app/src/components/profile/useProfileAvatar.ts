import { useState } from 'react';

import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { useStatus } from '@/hooks/useStatus';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { useStatusStore } from '@/stores/status.store';

/**
 * State machine behind the profile avatar (items 9 + 12): the photo menu, the
 * full-screen viewer, crop dialog, remove confirm, the own-story viewer and the
 * delete-story confirm. Keeps <ProfileAvatar/> declarative and under the line cap.
 */
export function useProfileAvatar(onChanged?: () => void | Promise<void>) {
  const { mine, refetch } = useStatus();
  const { uploading, pickAndUpload } = useStatusUpload();
  const deleteStory = useStatusStore((s) => s.deleteStory);
  const { picked, saving, pick, upload, remove, cancelPick } = useProfilePhoto(onChanged);

  const [menuOpen, setMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const hasStory = !!mine && mine.slides.length > 0;

  const addStory = async () => {
    if (uploading) return;
    await pickAndUpload();
    await onChanged?.();
  };

  // Tap: view the active story, otherwise start adding one (item 12).
  const onAvatarPress = () => {
    if (hasStory) setStoryOpen(true);
    else void addStory();
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
    void pick();
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
    uploading,
    picked,
    saving,
    menuOpen,
    viewerOpen,
    storyOpen,
    removeOpen,
    deleteId,
    onAvatarPress,
    openMenu,
    addStory,
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

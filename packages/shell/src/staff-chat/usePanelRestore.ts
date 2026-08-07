import { useEffect, useRef } from 'react';
import type { Coworker, StaffThread } from './queries';

interface Options {
  /** True once the saved state has arrived and been applied. */
  ready: boolean;
  /** What was saved: whether the sidebar was showing, and what was open. */
  wasOpen: boolean;
  savedPeerId: string | null;
  /** What is true now. */
  open: boolean;
  peer: Coworker | null;
  threads: StaffThread[];
  coworkers: Coworker[];
  onRequestOpen?: () => void;
  onPeer: (peer: Coworker) => void;
  onPanelOpen: (open: boolean) => void;
}

/**
 * Put the panel back the way it was left, and keep it that way.
 *
 * Restoring and saving belong together because they are the same bug when they
 * are apart: the first render after the saved state loads has NOT restored
 * anything yet, so a naive save would immediately write "closed" over the
 * "open" it is about to act on.
 */
export function usePanelRestore({
  ready,
  wasOpen,
  savedPeerId,
  open,
  peer,
  threads,
  coworkers,
  onRequestOpen,
  onPeer,
  onPanelOpen,
}: Options) {
  /** Show the sidebar again if it was showing. */
  useEffect(() => {
    if (ready && wasOpen && !open) onRequestOpen?.();
  }, [ready, wasOpen, open, onRequestOpen]);

  /**
   * Reopen the conversation that was open.
   *
   * Only once the directory has arrived, and only while nobody is picked:
   * restoring later would yank somebody out of the thread they just opened.
   */
  useEffect(() => {
    if (!ready || !savedPeerId || peer) return;
    const found =
      threads.find((thread) => thread.peer.id === savedPeerId)?.peer ??
      coworkers.find((person) => person.id === savedPeerId);
    if (found) onPeer(found);
  }, [ready, savedPeerId, peer, threads, coworkers, onPeer]);

  /**
   * Remember whether it is showing.
   *
   * Watching `open` rather than saving from each button: it is opened from the
   * header, from the apps drawer and by an incoming call, and a save hung off
   * every one of those is three chances to forget the fourth.
   *
   * The ref ADOPTS the server's answer rather than writing it back — see the
   * note above about the first render.
   */
  const savedOpen = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (savedOpen.current === null) {
      savedOpen.current = wasOpen;
      return;
    }
    if (savedOpen.current === open) return;
    savedOpen.current = open;
    onPanelOpen(open);
  }, [ready, open, wasOpen, onPanelOpen]);
}

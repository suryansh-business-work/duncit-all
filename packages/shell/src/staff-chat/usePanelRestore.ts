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
  /**
   * Show the sidebar again if it was showing — ONCE.
   *
   * The latch is the whole point. Without it this effect does not restore the
   * panel, it enforces it: closing sets `open` false, this runs before the save
   * below has had a chance to write `false`, sees the saved `true` and opens it
   * straight back up. The close button worked perfectly and the panel never
   * shut, because two effects in this file were arguing about which of them
   * owned the answer.
   *
   * Restoring is something that happens when you arrive, not a rule about how
   * the panel must stay.
   */
  const restoredOpen = useRef(false);
  useEffect(() => {
    if (!ready || restoredOpen.current) return;
    restoredOpen.current = true;
    if (wasOpen && !open) onRequestOpen?.();
  }, [ready, wasOpen, open, onRequestOpen]);

  /**
   * Reopen the conversation that was open — also once.
   *
   * The latch is set only when the person is actually FOUND, because the
   * directory arrives after the saved state does; latching on `ready` alone
   * would spend the one attempt before there was anything to look them up in.
   * After that it stays shut, so pressing Back does not spring the same thread
   * open again while the server catches up with the fact that it was closed.
   */
  const restoredPeer = useRef(false);
  useEffect(() => {
    if (!ready || restoredPeer.current || !savedPeerId || peer) return;
    const found =
      threads.find((thread) => thread.peer.id === savedPeerId)?.peer ??
      coworkers.find((person) => person.id === savedPeerId);
    if (!found) return;
    restoredPeer.current = true;
    onPeer(found);
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

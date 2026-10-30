import { create } from 'zustand';

interface BlockState {
  /** Moves every time the viewer blocks or unblocks someone. */
  version: number;
  bump: () => void;
}

/**
 * Feeds hold other members' posts, and a block takes one member out of all of
 * them on the server at once (App Store 1.2). Each feed hook re-reads when this
 * moves, so a feed already open under the profile never shows them again.
 */
export const useBlockStore = create<BlockState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));

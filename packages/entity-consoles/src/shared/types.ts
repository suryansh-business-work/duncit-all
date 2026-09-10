import type { DocumentNode } from 'graphql';

/**
 * The four things Duncit keeps a directory of.
 *
 * They are one screen over four entities — a brief of how many there are and
 * where they stand, then a list, then a row's full detail — which is why they
 * share a spec rather than four near-identical consoles (rule 34). A fifth
 * entity is one more spec, not one more console.
 */
export type DirectoryEntity = 'venues' | 'clubs' | 'clubAdmins' | 'hosts';

/** Tone for a tile's icon and value. Maps onto the MUI palette. */
export type DirectoryTone = 'primary' | 'success' | 'warning' | 'error';

/** One tile on a console's brief dashboard. */
export interface DirectoryTile {
  /**
   * The tile's alias in the counts document, and its React key.
   *
   * It has to be the alias: the whole dashboard is ONE round trip with the
   * counts aliased side by side, so this is how a tile finds its own number.
   */
  key: string;
  /** Catalogue key for the label (rule 38 — never a literal). */
  labelKey: string;
  tone: DirectoryTone;
  /**
   * Query string appended to the list route when the tile is a way in, e.g.
   * `status=SUBMITTED`. Null means the tile opens the unfiltered list.
   */
  listQuery: string | null;
}

/** Everything about one directory console except the rows themselves. */
export interface DirectorySpec {
  entity: DirectoryEntity;
  /** Catalogue keys for the page heading and its one-line explanation. */
  titleKey: string;
  subtitleKey: string;
  dashboardTitleKey: string;
  /** The tiles, in the order they read left to right. */
  tiles: readonly DirectoryTile[];
  /**
   * ONE document with every tile's count aliased inside it.
   *
   * Four tiles used to mean four queries; aliasing them makes a dashboard one
   * request, so the tiles can never disagree about which moment they counted.
   */
  countsDocument: DocumentNode;
}

/** What a counts document resolves to: one `{ total }` per tile alias. */
export type DirectoryCounts = Record<string, { total: number } | null | undefined>;

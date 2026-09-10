import { DIRECTORY_SPECS, type DirectoryEntity } from '@duncit/entity-consoles';
import { defineDemo, defineDemos } from '../types';
// A whole venue record is eighty lines of realistic mock on its own, so it and
// the demo that runs on it live beside this file rather than inside it.
import { venueEditorMappingDemo } from './entity-consoles-venue';

/** Which console to inspect, and the route its list would live at. */
interface SpecMock {
  entity: DirectoryEntity;
  listPath: string;
}

/** What the counts document resolves to — one `{ total }` per tile alias. */
interface CountsMock {
  entity: DirectoryEntity;
  counts: Record<string, number>;
}

/** The tile hrefs a console builds, given a list route. */
const tileHref = (listPath: string, listQuery: string | null): string =>
  listQuery ? `${listPath}?${listQuery}` : listPath;

export default defineDemos('entity-consoles', [
  defineDemo<SpecMock>({
    id: 'spec',
    title: 'One spec drives a whole console',
    note:
      "Switch entity to clubs — the tiles change from a status lifecycle (approved / awaiting review / declined) to is_active and is_verified, because the club table has no status field to filter on. Blank the listPath and every href disappears: that is what makes the tiles render as plain figures before the list route exists.",
    mock: {
      entity: 'venues',
      listPath: '/venues',
    },
    compute: (mock) => {
      const spec = DIRECTORY_SPECS[mock.entity];
      return {
        'Entity': spec.entity,
        'Heading copy key': spec.titleKey,
        'Tiles': spec.tiles.map((tile) => tile.key).join(', '),
        'Tile labels resolve from': spec.tiles.map((tile) => tile.labelKey).join('\n'),
        'Where each tile leads': spec.tiles
          .map((tile) => `${tile.key} -> ${mock.listPath ? tileHref(mock.listPath, tile.listQuery) : '(no link)'}`)
          .join('\n'),
        'Counts document': spec.countsDocument.definitions
          .map((def) => (def.kind === 'OperationDefinition' ? def.name?.value : null))
          .filter(Boolean)
          .join(', '),
      };
    },
  }),

  defineDemo<CountsMock>({
    id: 'counts',
    title: 'Every tile counted the same moment',
    note:
      "The counts arrive as ONE aliased response, so the tiles always reconcile. Raise `pending` above `total` to see why that matters — with four separate queries a venue approved mid-flight would be counted twice and the figures would stop adding up.",
    mock: {
      entity: 'venues',
      counts: { total: 412, approved: 356, pending: 41, declined: 15 },
    },
    compute: (mock) => {
      const spec = DIRECTORY_SPECS[mock.entity];
      const total = mock.counts.total ?? 0;
      const parts = spec.tiles
        .filter((tile) => tile.key !== 'total')
        .reduce((sum, tile) => sum + (mock.counts[tile.key] ?? 0), 0);
      return {
        'Tiles on screen': spec.tiles
          .map((tile) => `${tile.key}: ${mock.counts[tile.key] ?? 0}`)
          .join('\n'),
        'Total': total,
        'Parts added up': parts,
        'Reconciles': parts === total ? 'yes' : `no — off by ${Math.abs(total - parts)}`,
      };
    },
  }),

  venueEditorMappingDemo,
]);

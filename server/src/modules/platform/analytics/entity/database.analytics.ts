import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { dbConnectionEvents, type DbConnectionEventKind } from '@config/dbConnectionLog';
import {
  collectionsOf,
  pingMs,
  storageOf,
  type TechDatabaseCollection,
} from '@modules/platform/tech/tech.database';
import {
  breakdown,
  fixedSlices,
  kpi,
  pct,
  rankedSlices,
  tally,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';

/**
 * Analytics > Tech > Database — how big the live database is and where the
 * space goes. It reads the same numbers as Tech > Database > Info, so there is
 * no period: every figure is the database as it stands now, and the connection
 * events are this API process's since it last started.
 */

const TOP = 10;

const EVENT_KINDS: readonly DbConnectionEventKind[] = [
  'CONNECTED',
  'CONNECT_FAILED',
  'DISCONNECTED',
  'RECONNECTED',
  'ERROR',
  'CLOSED',
];

type Storage = Awaited<ReturnType<typeof storageOf>>;

const totalBytes = (row: TechDatabaseCollection) => row.storageBytes + row.indexBytes;
const nameOf = (row: TechDatabaseCollection) => row.name;

function databaseKpis(storage: Storage, ping: number): AnalyticsKpi[] {
  const kpis = [
    kpi('db_documents', storage.documents, null),
    kpi('db_collections', storage.collections, null),
    kpi('db_data_size', storage.dataBytes, null, { format: 'BYTES' }),
    kpi('db_storage_size', storage.storageBytes, null, { format: 'BYTES' }),
    kpi('db_index_size', storage.indexBytes, null, { format: 'BYTES' }),
    kpi('db_avg_document', storage.avgDocumentBytes, null, { format: 'BYTES' }),
    kpi('db_ping', ping, null, { format: 'DURATION', higherIsBetter: false }),
  ];
  // Atlas' shared tiers do not report the filesystem, and a guess would be worse than no tile.
  if (storage.fsUsedBytes !== null && storage.fsTotalBytes) {
    kpis.push(
      kpi('db_disk_used', pct(storage.fsUsedBytes, storage.fsTotalBytes), null, {
        format: 'PERCENT',
        higherIsBetter: false,
      })
    );
  }
  return kpis;
}

function collectionLeaderboard(rows: readonly TechDatabaseCollection[]): AnalyticsLeaderboard {
  const ranked = [...rows].sort((a, b) => totalBytes(b) - totalBytes(a)).slice(0, TOP);
  return {
    key: 'db_collections',
    columns: [
      { key: 'documents', format: 'COUNT' },
      { key: 'data_size', format: 'BYTES' },
      { key: 'storage_size', format: 'BYTES' },
      { key: 'index_size', format: 'BYTES' },
      { key: 'indexes', format: 'COUNT' },
      { key: 'avg_document', format: 'BYTES' },
    ],
    rows: ranked.map((row) => ({
      id: row.name,
      name: row.name,
      caption: null,
      values: [row.documents, row.dataBytes, row.storageBytes, row.indexBytes, row.indexes, row.avgDocumentBytes],
    })),
  };
}

export async function databaseAnalytics(): Promise<EntityAnalyticsSections> {
  const { db } = mongoose.connection;
  if (!db) throw new GraphQLError('The database is not connected right now.', { extensions: { code: 'SERVICE_UNAVAILABLE' } });
  const [storage, ping, collections] = await Promise.all([storageOf(db), pingMs(db), collectionsOf(db)]);
  const events = tally(dbConnectionEvents().map((event) => event.kind));

  return {
    kpis: databaseKpis(storage, ping),
    trends: [],
    breakdowns: [
      breakdown('db_storage_by_collection', rankedSlices(collections, nameOf, totalBytes), {
        format: 'BYTES',
        scope: 'ALL_TIME',
      }),
      breakdown('db_documents_by_collection', rankedSlices(collections, nameOf, (row) => row.documents), {
        scope: 'ALL_TIME',
      }),
      breakdown(
        'db_space_split',
        [
          { key: 'data', label: null, value: storage.storageBytes },
          { key: 'indexes', label: null, value: storage.indexBytes },
        ],
        { format: 'BYTES', scope: 'ALL_TIME', ordered: true }
      ),
      breakdown('db_connection_events', fixedSlices(EVENT_KINDS, events), { scope: 'ALL_TIME', ordered: true }),
    ],
    leaderboard: collectionLeaderboard(collections),
  };
}

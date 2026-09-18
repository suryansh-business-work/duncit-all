import type { PageCopy } from './types';

/** Tech > Database. */
export const DATABASE_COPY: PageCopy = {
  kpis: {
    db_documents: { title: 'analytics.kpi.dbDocuments', hint: 'analytics.kpi.dbDocumentsHint' },
    db_collections: { title: 'analytics.kpi.dbCollections', hint: 'analytics.kpi.dbCollectionsHint' },
    db_data_size: { title: 'analytics.kpi.dbDataSize', hint: 'analytics.kpi.dbDataSizeHint' },
    db_storage_size: { title: 'analytics.kpi.dbStorageSize', hint: 'analytics.kpi.dbStorageSizeHint' },
    db_index_size: { title: 'analytics.kpi.dbIndexSize', hint: 'analytics.kpi.dbIndexSizeHint' },
    db_avg_document: { title: 'analytics.kpi.dbAvgDocument', hint: 'analytics.kpi.dbAvgDocumentHint' },
    db_ping: { title: 'analytics.kpi.dbPing', hint: 'analytics.kpi.dbPingHint' },
    db_disk_used: { title: 'analytics.kpi.dbDiskUsed', hint: 'analytics.kpi.dbDiskUsedHint' },
  },
  trends: {},
  series: {},
  breakdowns: {
    db_storage_by_collection: 'analytics.breakdown.dbStorageByCollection',
    db_documents_by_collection: 'analytics.breakdown.dbDocumentsByCollection',
    db_space_split: 'analytics.breakdown.dbSpaceSplit',
    db_connection_events: 'analytics.breakdown.dbConnectionEvents',
  },
  slices: {
    db_space_split: {
      data: 'analytics.slice.dbData',
      indexes: 'analytics.slice.dbIndexes',
    },
    db_connection_events: {
      CONNECTED: 'analytics.slice.dbConnected',
      CONNECT_FAILED: 'analytics.slice.dbConnectFailed',
      DISCONNECTED: 'analytics.slice.dbDisconnected',
      RECONNECTED: 'analytics.slice.dbReconnected',
      ERROR: 'analytics.slice.dbError',
      CLOSED: 'analytics.slice.dbClosed',
    },
  },
  leaderboards: {
    db_collections: {
      title: 'analytics.leaderboard.dbCollections',
      hint: 'analytics.leaderboard.dbCollectionsHint',
      name: 'analytics.leaderboard.collection',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    documents: 'analytics.leaderboard.documents',
    data_size: 'analytics.leaderboard.dataSize',
    storage_size: 'analytics.leaderboard.storageSize',
    index_size: 'analytics.leaderboard.indexSize',
    indexes: 'analytics.leaderboard.indexes',
    avg_document: 'analytics.leaderboard.avgDocument',
  },
};

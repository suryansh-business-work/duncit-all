import type { DatabaseEnvironment, DatabaseProvider } from './queries';

type ChipColor = 'success' | 'warning' | 'error' | 'info' | 'default';

export const PROVIDER_KEY: Record<DatabaseProvider, string> = {
  ATLAS: 'tech.dbInfo.providerAtlas',
  SELF_HOSTED: 'tech.dbInfo.providerSelfHosted',
};

export const ENVIRONMENT_KEY: Record<DatabaseEnvironment, string> = {
  production: 'tech.dbInfo.envProduction',
  staging: 'tech.dbInfo.envStaging',
  localhost: 'tech.dbInfo.envLocalhost',
};

/** Mongoose's connection states, as `mongoose.ConnectionStates` names them. */
export const STATE_LABEL: Record<string, { key: string; color: ChipColor }> = {
  connected: { key: 'tech.dbInfo.stateConnected', color: 'success' },
  connecting: { key: 'tech.dbInfo.stateConnecting', color: 'warning' },
  disconnected: { key: 'tech.dbInfo.stateDisconnected', color: 'error' },
  disconnecting: { key: 'tech.dbInfo.stateDisconnecting', color: 'warning' },
  uninitialized: { key: 'tech.dbInfo.stateUninitialized', color: 'default' },
};

export const EVENT_LABEL: Record<string, { key: string; color: ChipColor }> = {
  CONNECTED: { key: 'tech.dbInfo.eventConnected', color: 'success' },
  RECONNECTED: { key: 'tech.dbInfo.eventReconnected', color: 'success' },
  CONNECT_FAILED: { key: 'tech.dbInfo.eventConnectFailed', color: 'error' },
  DISCONNECTED: { key: 'tech.dbInfo.eventDisconnected', color: 'warning' },
  ERROR: { key: 'tech.dbInfo.eventError', color: 'error' },
  CLOSED: { key: 'tech.dbInfo.eventClosed', color: 'default' },
};

/**
 * Per-app configuration for the Duncit Partners console. Reusable configuration
 * only — no dynamic business data. The `key` is the stable portal identifier
 * sent as `portal_key` on login and used by the shared shell.
 */
export interface AppConfig {
  key: string;
  name: string;
  tokenKey: string;
  colorModeKey: string;
}

export const appConfig: AppConfig = {
  key: 'partners',
  name: 'Partners App',
  tokenKey: 'token',
  colorModeKey: 'partners_color_mode',
};

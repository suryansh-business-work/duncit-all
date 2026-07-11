/**
 * Per-app configuration for the Duncit Admin console. Reusable configuration
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
  key: 'admin',
  name: 'Admin',
  tokenKey: 'admin_token',
  colorModeKey: 'admin_color_mode',
};

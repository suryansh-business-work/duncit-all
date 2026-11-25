/**
 * app.json carries everything static; this adds the two native colours that
 * must match the CRM brand accent. They come from crm-accent.json — the same
 * values the CRM portal's appConfig.accent and this app's Tamagui theme use —
 * so the launcher icon, the splash and the screens cannot drift apart.
 */
const accent = require('./crm-accent.json');

module.exports = function withCrmAccent({ config }) {
  return {
    ...config,
    android: {
      ...config.android,
      adaptiveIcon: { ...config.android.adaptiveIcon, backgroundColor: accent.active },
    },
    plugins: config.plugins.map((plugin) =>
      Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
        ? [plugin[0], { ...plugin[1], backgroundColor: accent.active }]
        : plugin,
    ),
  };
};

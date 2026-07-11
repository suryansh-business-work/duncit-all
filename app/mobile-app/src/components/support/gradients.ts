/**
 * Rotating multi-hue gradient palettes for the support help-center cards
 * (mirrors mWeb's FrequentlyAsked GRADIENTS array). Each entry is a `[start, end]`
 * colour pair passed to expo-linear-gradient.
 */
export const SUPPORT_GRADIENTS: readonly [string, string][] = [
  ['#ff4f73', '#ff7a59'],
  ['#7c5cff', '#b388ff'],
  ['#2196f3', '#21cbf3'],
  ['#22c55e', '#2196f3'],
  ['#f5337a', '#ff7a59'],
  ['#06b6d4', '#7c5cff'],
];

/** The primary "Start a conversation" CTA gradient (mWeb StartConversation). */
export const START_CONVERSATION_GRADIENT: readonly [string, string] = ['#ff4f73', '#ff7a59'];

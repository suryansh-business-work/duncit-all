/**
 * The bots the Ask Bot list offers.
 *
 * Identity and wiring only. The name, the blurb, the greeting and the starter
 * questions are the console's localized copy under `shell.askBot.bots.<key>`
 * (rule 38) — a bot whose name lived here would be English in every language.
 */
export interface BotDefinition {
  key: string;
  /** A name the shell's AppIcon resolves. */
  icon: string;
  /** The system prompt in the AI Prompt Library this bot thinks with. */
  prompt_key: string;
}

export const ASK_BOTS: readonly BotDefinition[] = [
  { key: 'navigation', icon: 'hub', prompt_key: 'askbot.navigation' },
];

export const BOT_BY_KEY: ReadonlyMap<string, BotDefinition> = new Map(
  ASK_BOTS.map((bot) => [bot.key, bot])
);

import { useTranslation } from '../../i18n/useTranslation';

export interface BotCopy {
  name: string;
  description: string;
  greeting: string;
  starters: string[];
}

/**
 * What each bot is called, in the reader's language.
 *
 * The server says which bots EXIST; the words are this bundle's (rule 38). Every
 * key is written out as a literal — the localization gate greps for `t('…')`, so
 * a key built from `bot.key` would be invisible to it and would ship untranslated.
 *
 * A bot the server offers but this console has no copy for returns null and is
 * not listed: a row titled with a raw key helps nobody, and shipping the copy is
 * the same one-line change as shipping the bot.
 */
export function useBotCopy(): (botKey: string) => BotCopy | null {
  const { t } = useTranslation();
  return (botKey: string) => {
    if (botKey === 'navigation') {
      return {
        name: t('shell.askBot.bots.navigation.name'),
        description: t('shell.askBot.bots.navigation.description'),
        greeting: t('shell.askBot.bots.navigation.greeting'),
        starters: [
          t('shell.askBot.bots.navigation.suggestion1'),
          t('shell.askBot.bots.navigation.suggestion2'),
          t('shell.askBot.bots.navigation.suggestion3'),
        ],
      };
    }
    return null;
  };
}

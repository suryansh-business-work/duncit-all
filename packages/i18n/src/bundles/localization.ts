import type { NestedCatalogue } from '../catalogue';

/**
 * The Localization console's own namespace (localization.duncit.com), layered
 * over the shell's by `mountPortal`. Locales and Translations moved here from
 * the Admin console, together with AI translation, which now runs as a
 * background job the header follows.
 */
export const LOCALIZATION_BUNDLE: NestedCatalogue = {
  localization: {
    locales: {
      title: 'Locales',
      intro:
        'Languages offered across the apps, portals and websites. The default is the source language every other falls back to.',
      add: 'Add locale',
      edit: 'Edit {code}',
      empty: 'No locales yet — add one to start translating.',
      added: 'Locale added',
      updated: 'Locale updated',
      removed: '{code} removed',

      code: 'Code',
      language: 'Language',
      englishName: 'English name',
      translated: 'Translated',
      colFlags: 'Flags',
      coverage: '{done} of {total} keys',
      outdated: {
        one: '{count} out of date',
        other: '{count} out of date',
      },
      defaultChip: 'Default',
      rtlChip: 'RTL',

      // The locale picker. Choosing a language fills its tag, both names and
      // its writing direction, which is what stopped anyone adding one before.
      localeCode: 'Locale code',
      localeCodePlaceholder: 'hi-IN',
      localePickerHint:
        'Search the ISO language list, or type a BCP-47 tag such as en-IN. Picking one fills in the names and the writing direction.',
      localeCodeFixed: 'The code is stored on every profile, so it cannot be changed',
      languageName: 'Language name',
      languageNamePlaceholder: 'हिन्दी',
      languageNameHint: "Shown in the switcher, in the language's own script",
      englishNamePlaceholder: 'Hindi (India)',
      englishNameHint: 'Shown in admin lists',
      sortOrder: 'Sort order',
      sortOrderHint: 'Order in the language switcher',
      codeRequired: 'Enter a locale code',
      codeFormat: 'Use a BCP-47 tag such as en-IN or hi-IN',
      labelRequired: 'Enter the language name in its own script',

      rtl: 'Right-to-left script',
      activeHint: 'Active — offered in the language switcher',
      defaultHint: 'Default language — every other locale falls back to it',
      // The source language everything falls back to.
      defaultLocked:
        'This is the default language — the source every other one falls back to. It cannot be switched off or removed; make another language the default to move it.',
      defaultLockedSwitch: 'Locked while this is the default language',
      defaultNotRemovable: 'The default language cannot be removed',

      // Removing a language takes every translation in it with it.
      deleteTitle: 'Remove {language}?',
      deleteMessage:
        'Every translation in this language is deleted with it, and anyone reading Duncit in it falls back to the default language. This cannot be undone.',

      // AI translation, per language.
      aiTranslate: 'AI translate',
      aiTranslateDefault:
        'This is the default language — it is the source everything else is translated from.',
      aiOnAdd: 'Translate everything with AI once it is added',
      aiOnAddHint:
        'A new language starts empty. This fills every key in the background — the progress shows in the header, and you can keep working or leave the page.',
      aiOnAddDefault: 'The default language is the source, so there is nothing to translate it from.',
      aiStarted: '{language} added — AI is translating it now. Follow it from the header.',
      aiStartFailed: 'The language was added, but AI translation could not start: {reason}',
    },

    translations: {
      title: 'Translations',
      intro:
        "Every user-facing string, grouped portal-wise and page-wise. Open a page to edit its entries; untranslated ones fall back to the default language, then to each app's bundled copy.",
      add: 'Add translation',
      edit: 'Edit translation',
      added: 'Translation added',
      updated: 'Translation updated',

      import: 'Import app keys',
      importing: 'Importing…',
      importHint: 'Add every key the apps and emails ship, keeping existing translations',
      imported: {
        one: '1 new key imported',
        other: '{count} new keys imported',
      },
      upToDate: 'Already up to date',

      aiTranslate: 'AI translate',
      aiTranslatePage: 'AI translate this page',

      key: 'Key',
      keyPlaceholder: 'mweb.shop.emptyState',
      keyHint: 'Namespaced portal-wise then page-wise — this drives the Portal/Page filters',
      keyInvalid: 'Use at least portal.page.name, e.g. mweb.shop.emptyState',
      noteHint: 'What this string is and where it appears — context for translators',
      valueLabel: '{language} ({code})',
      defaultValueLabel: '{language} ({code}) — default',
      sourceHint: 'Source text — every untranslated locale falls back to this',
      fallbackHint: 'Leave blank to fall back to the default language',
      noLocale: 'Add a locale first — there is nothing to translate into.',
      noActiveLocale: 'No active locales yet — add one under Locales first.',

      portal: 'Portal',
      page: 'Page',
      colKeys: 'Keys',
      notTranslated: '— not translated',
      namespacesEmpty: 'No namespaces yet — press Import app keys to seed them.',
      entriesEmpty: 'No translations match the current filters.',
      searchNamespaces: 'Search portal or page',
      searchEntries: 'Search key or description',
      backToNamespaces: 'Back to namespaces',
      eyebrow: 'Translations / {surface}',
      keyCount: {
        one: '1 key',
        other: '{count} keys',
      },
    },

    // AI translation: syncing languages with the default one through OpenAI.
    ai: {
      title: 'AI translation',
      titlePage: 'AI translate {namespace}',
      intro:
        'OpenAI translates the default language into the languages you pick and writes the result straight into Translations. The apps, portals and websites then pick it up on their own.',
      noTargets: 'Add a second language first — the default one is the source everything is translated from.',

      scopeLabel: 'What to send',
      scopeOutdated: 'Sync with English',
      scopeOutdatedHint:
        'Keys with no text yet, plus keys whose English changed after they were translated. Leaves everything that is still current untouched.',
      scopeMissing: 'Only the keys with no text yet',
      scopeMissingHint:
        'Leaves anything already written untouched. This is also how a run that stopped part-way is picked up again.',
      scopeAll: 'Every key, replacing what is there',
      scopeAllHint: 'Re-translates keys that already carry text, hand-written ones included.',

      languages: 'Languages',
      languagesHint: 'Each language runs as its own background task.',
      languagesRequired: 'Choose at least one language',
      keys: {
        one: '1 key',
        other: '{count} keys',
      },
      nothingToSend: 'Nothing to send — the chosen languages are already in sync.',
      willSend: {
        one: 'In total 1 key will be sent.',
        other: 'In total {count} keys will be sent.',
      },
      backgroundHint:
        'This runs on the server. Refreshing, changing pages or closing the tab does not stop it — the progress stays in the header, and a server restart picks it up where it stopped.',
      start: 'Start translating',
      starting: 'Starting…',
      started: {
        one: 'AI translation started. Follow it from the header — you can leave this page.',
        other: 'AI translation started for {count} languages. Follow it from the header — you can leave this page.',
      },
    },
  },
};

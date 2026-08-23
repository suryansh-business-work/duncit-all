import type { NestedCatalogue } from '../catalogue';

/**
 * The AI Portal's own console copy — what the platform spent on OpenAI, every
 * request it made, and every image AI Monitoring screened.
 *
 * NOT here: `aiMonitoring.*`, which is the notice shown beside upload fields on
 * every surface and has a namespace of its own; and the AI Library's prompts,
 * which are rows in the database an operator edits rather than shipped copy.
 *
 * Model names, task keys, module names and status values stay verbatim — they
 * are what the server recorded, and a translated one would no longer match the
 * row it came from.
 */
export const AI_BUNDLE: NestedCatalogue = {
  ai: {
    welcome: {
      title: 'Welcome to {name}',
      greeting: 'Hi {name}',
      // Falls back to a friendly address when the account has no name on it.
      guest: 'there',
      body: 'This is the {portal}. Your console is set up and ready — features will appear here soon.',
      portalLabel: 'AI Portal',
    },

    dashboard: {
      title: 'OpenAI Dashboard',
      subtitle:
        'Every OpenAI call the platform makes, and what each task costs — moderation, support, CRM, admin tools and release notes.',
      range: 'Range',
      unpriced:
        'No rate card entry for {models} — those calls are counted but costed at zero. Add a rate below and future calls will be priced.',
      kpiSpend: 'SPEND',
      kpiSpendHint: '{amount} all time',
      kpiCalls: 'CALLS',
      kpiCallsHint: '{ms} ms average',
      kpiTokens: 'TOKENS',
      kpiTokensHint: '{input} in · {output} out',
      kpiFailures: 'NO ANSWER',
      kpiFailuresHint: '{failed} failed · {skipped} not configured',
      costPerTask: 'Cost per task',
      byArea: 'By area',
      byModel: 'By model',
      modelRates: 'Model rates',
      dailySpend: 'Daily spend',
      noCallsInRange: 'No calls in this range.',
    },

    taskSpend: {
      colTask: 'Task',
      colArea: 'Area',
      colCalls: 'Calls',
      colFailed: 'Failed',
      colTokens: 'Tokens',
      colAvgTime: 'Avg time',
      colCost: 'Cost',
      empty: 'No OpenAI calls in this range.',
      search: 'Search task or area',
    },

    rateCard: {
      addTitle: 'Add a model rate',
      editTitle: 'Rate for {model}',
      editAria: 'Edit rate for {model}',
      model: 'Model',
      inputPer1m: 'Input — USD per 1M tokens',
      outputPer1m: 'Output — USD per 1M tokens',
      modelRequired: 'Model is required',
      modelTooLong: 'Model name is too long',
      enterNumber: 'Enter a number',
      notNegative: 'Cannot be negative',
      modelHint: 'Exactly as OpenAI names it, e.g. gpt-4o-mini',
      saved: 'Rate saved for {model}',
      addModel: 'Add a model',
      // The two figures are USD amounts the server priced with; substituted,
      // never reworded, so the line matches the rate card row above it.
      rateLine: 'in ${input} · out ${output} — per 1M tokens',
    },

    openAiLogs: {
      title: 'OpenAI Logs',
      subtitle:
        'Every OpenAI request the platform made — the prompt, the answer, the tokens and what it cost. Rows are kept for 180 days.',
      colWhen: 'When',
      colStatus: 'Status',
      colTask: 'Task',
      colArea: 'Area',
      colModel: 'Model',
      colTokens: 'Tokens',
      colCost: 'Cost',
      colTook: 'Took',
      colReason: 'Reason',
      empty: 'No OpenAI calls recorded yet.',
      search: 'Search task, model, detail or reason',
      unpriced: 'unpriced',
      unpricedTooltip: 'No rate card entry for this model — add one on the Dashboard.',
      close: 'Close',
      promptSent: 'Prompt sent',
      answerReturned: 'Answer returned',
    },

    settings: {
      noticeTitle: 'What people are told',
      noticeIntro:
        'These sentences render on the AI Monitoring chip and dialog beside every upload field — in the native app, in mWeb and in all portals. A change here reaches all of them within a minute.',
      chipToggle: 'Show the AI Monitoring chip on upload fields',
      chipLabel: 'Chip label',
      dialogTitle: 'Dialog title',
      dialogIntro: 'Dialog intro',
      dialogPoints: 'Dialog bullets',
      dialogFootnote: 'Dialog footnote',
      dismissLabel: 'Dismiss button',
      blankHint: 'Leave blank to use the shipped, translated wording.',
      bulletsHint: 'One bullet per line. Leave blank to use the shipped, translated list.',
      promptTitle: 'Image upload prompt',
      // {key} is the Prompt Library row id and {shape} the JSON contract — both
      // substituted rather than written in, so neither can be reworded into
      // something the model no longer honours.
      promptWarning:
        'This is the live system prompt every uploaded image is analysed with. It is the same row the Prompt Library edits ({key}) — one prompt, one store — and the next upload uses whatever is saved here. It must keep returning strict JSON of shape {shape}, or every check will record itself as unreadable.',
      promptLabel: 'Prompt sent with every uploaded image',
      tokenCount: '≈ {count} tokens',
      submit: 'Save settings',
    },

    /**
     * The Prompt Library console — @duncit/ai-prompts, which only this portal
     * renders. Every AI feature on the platform reads its prompt from the rows
     * this screen edits.
     */
    library: {
      pageTitle: 'AI Library',
      pageSubtitle: 'Every AI feature on the platform reads its prompt from here. Edit a code prompt and the next call uses your text — there is no deploy in between.',
      kinds: {
        CODE: {
          label: 'Code Prompts',
          chip: 'Code',
          blurb: 'Declared in code and read back on every call. Edit the body or the model and the feature changes; they cannot be created or deleted here, only reset.',
        },
        AI: {
          label: 'AI Prompts',
          chip: 'AI',
          blurb: 'Written here, owned by nobody in code. Create as many as you like — they are served by the public GET API below for anything outside the server to fetch.',
        },
      },
      roles: {
        SYSTEM: 'System turn',
        USER: 'User turn',
      },
      roleHints: {
        SYSTEM: 'The standing instruction — identical on every call of this feature.',
        USER: 'The per-call payload: what the feature hands the model each time it runs.',
      },
      addPrompt: 'Add AI prompt',
      editPrompt: 'Edit prompt',
      createTitle: 'Add an AI prompt',
      emptyCode: 'No code prompts seeded yet. They appear the first time the server boots.',
      emptyAi: 'No AI prompts yet. Click "Add AI prompt" to write your first one.',
      searchPlaceholder: 'Search by name, key, category or content…',
      deleteTitle: 'Delete prompt',
      deleteConfirm: 'Delete',
      resetTitle: 'Reset prompt',
      resetConfirm: 'Reset',
      busy: 'Working…',
      codeDeleteHint: 'Code prompts power a shipped feature — reset instead of deleting',
      resetHint: 'Restore the shipped default',
      fields: {
        name: 'Name',
        description: 'Description',
        category: 'Category',
        key: 'Key',
        model: 'Model',
        content: 'Prompt content',
        active: 'Active',
      },
      hints: {
        nameCode: 'Named by the feature that runs this prompt',
        nameAi: 'A short label, e.g. "Weekly digest writer"',
        description: 'Optional — what this prompt is for',
        category: 'e.g. Summarization, Classification',
        keyAi: 'Optional — how the GET API addresses it. Slugged from the name when left blank, and fixed once saved.',
        keyCode: 'The catalogue id the call site names. Fixed in code.',
        model: 'Optional. Empty uses the configured default model.',
        content: 'The prompt body sent to the model',
      },
      usageTitle: 'Where this runs',
      usageEmpty: 'No call site recorded for this prompt.',
      variablesTitle: 'Placeholders',
      variablesEmpty: 'This prompt takes no placeholders.',
      variablesHintCode: 'The feature substitutes these at call time. Keep every required one in the body — without it the model is asked the question with the facts missing.',
      variablesHintAi: 'Read out of your body. Whatever fetches this prompt fills them in; the GET API lists them alongside the text.',
      copyVariable: 'Copy this placeholder',
      previewTitle: 'Preview',
      previewHint: 'The prompt as the model receives it, with the example values filled in.',
      apiTitle: 'Public GET API',
      apiHint: 'Open, no login and no key: anyone with the URL can read every prompt below, code ones included. Deactivate a prompt to take it off the feed.',
      apiCopyAll: 'Copy list URL',
      apiCopyOne: 'Copy prompt URL',
      apiCopied: 'Copied',
      apiOpenInNewTab: 'Open in a new tab',
      apiOpenFeed: 'Open feed in a new tab',
      resetAria: 'Reset {name}',
      editAria: 'Edit {name}',
      deleteAria: 'Delete {name}',
      colTokens: 'Tokens',
      tokensHint: 'Estimated token size of the prompt content',
      defaultModel: 'Default',
      saving: 'Saving…',
      saveChanges: 'Save changes',
      add: 'Add',
      deleteMessage:
        'Delete "{name}"? This cannot be undone, and anything fetching it by key stops finding it.',
      resetMessage:
        'Restore the shipped default for "{name}"? Your edits to this prompt will be lost, and the next call uses the original text.',
    },

    validation: {
      chipLabelMax: 'Keep the chip label under 80 characters',
      titleMax: 'Keep the title under 160 characters',
      introMax: 'Keep the intro under 1000 characters',
      bulletsMax: 'That is too many bullets — keep the list under 3600 characters',
      bulletsCount: 'Twelve bullets is the maximum a reader will take in',
      footnoteMax: 'Keep the footnote under 500 characters',
      dismissMax: 'Keep the button label under 60 characters',
      promptRequired: 'The image prompt is required',
      promptMin: 'Give the model at least 20 characters of instruction',
      promptMax: 'Prompt is too long (max 20000 characters)',
    },
    monitoringLogs: {
      title: 'Uploaded Image Logs',
      subtitle:
        'Every AI Monitoring check, from every surface — the image, who uploaded it, what the model said and what was done about it. Open a row for the full trail.',
      colImage: 'Uploaded image',
      colUser: 'User / Entity',
      colUploaded: 'Uploaded',
      colStatus: 'Monitoring status',
      colResult: 'AI result',
      colReason: 'Reason / comment',
      colAction: 'Action taken',
      colSource: 'Source / module',
      empty: 'No images have been checked yet.',
      search: 'Search file, folder, comment or failure',
      detailUser: 'User / entity',
      detailAccountId: 'Account id',
      detailUploaded: 'Uploaded',
      detailChecked: 'Checked',
      detailNotYet: 'Not yet',
      detailSource: 'Source',
      detailFolder: 'Module / folder',
      detailModel: 'Model',
      detailTook: 'Took',
      signedOutUpload: 'Signed-out upload',
    },
  },
};

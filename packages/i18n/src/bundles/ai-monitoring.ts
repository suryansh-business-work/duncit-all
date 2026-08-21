import type { NestedCatalogue } from '../catalogue';

/**
 * The AI Monitoring notice shown beside every upload field — a namespace of
 * its own, not a surface's.
 *
 * @duncit/ai-monitoring renders in the PORTALS, in mWeb AND in the native app,
 * so this copy belongs to no single bundle: putting it in each would be three
 * hand-kept copies of the same sentences, which is exactly the drift rule 27
 * exists to stop.
 *
 * These are the FALLBACK sentences. An operator can override any of them in
 * AI Portal > AI Monitoring > Settings, and that override wins on every
 * surface at once. What ships here is what renders offline, before the API
 * answers, and — because it is the only version that is translated — in every
 * language an admin has not written a custom sentence for.
 */
export const AI_MONITORING_BUNDLE: NestedCatalogue = {
  aiMonitoring: {
    chipLabel: 'AI Monitoring',
    ariaLabel: 'About AI Monitoring',
    dialogTitle: 'This upload is checked by AI',
    dialogIntro:
      'To keep Duncit safe for everyone, an AI model reviews every image and file uploaded here.',
    pointScan:
      'Your upload is scanned for nudity, violence, hate symbols, scams and other unsafe content.',
    pointPrivate:
      'The check is automatic. Nobody browses your files, and the review runs only on what you upload.',
    pointFlag:
      'If something looks risky it is flagged for a human to review — your upload is not deleted automatically.',
    pointLog:
      'Every check is recorded with its result, so a decision about your content can always be explained.',
    dialogFootnote:
      'Uploading content that breaks our community guidelines can lead to it being removed and to action on your account.',
    dismiss: 'Got it',
  },
};

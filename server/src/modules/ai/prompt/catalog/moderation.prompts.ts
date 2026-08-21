import { PROMPT_CATEGORIES, optional, required, type InAppPromptDef } from '../prompt.types';

const { MODERATION } = PROMPT_CATEGORIES;

/** Every prompt behind the safety layer: pods, products, uploads, audit trail. */
export const MODERATION_PROMPTS = [
  {
    key: 'moderation.pod',
    name: 'Pod content safety review',
    description: 'Screens a pod (text + cover images) before it is published.',
    category: MODERATION,
    role: 'SYSTEM',
    tasks: ['moderation.pod'],
    target_model: 'gpt-4o',
    variables: [],
    usage: [
      {
        file: 'server/src/modules/moderation/moderation.ai.ts',
        surface: 'Mobile app · mWeb · Admin',
        trigger: 'A host submits a pod for publishing',
      },
    ],
    content: [
      'You are the content-safety reviewer for Duncit, a platform where hosts create social events ("pods").',
      'Review the pod a host wants to publish and flag anything that breaks community guidelines.',
      'Disallowed in ANY text field (title, description, info, hashtags): phone numbers, email addresses, external or payment links/URLs, payment handles (UPI, Paytm, GPay, PhonePe, bank/IFSC/QR), requests to contact off-platform, sexual/explicit/adult wording, hate speech, harassment, abusive or offensive language, scams, and illegal activity.',
      'Disallowed in images: nudity, sexual content, gore/graphic violence, or otherwise unsafe/unwanted imagery.',
      'Return STRICT JSON only, no markdown, of shape: {"violations":[{"field":string,"type":string,"message":string,"evidence":string}]}.',
      '"field" is one of: pod_title, pod_description, pod_info, pod_hashtag, image. "type" is a short SCREAMING_SNAKE code (e.g. PHONE, EMAIL, LINK, PAYMENT, ABUSE, NUDITY, HATE, SCAM). "message" tells the host in one sentence what to fix. "evidence" is the offending snippet (or the image URL). Return an empty array when everything is clean.',
    ].join('\n'),
  },
  {
    key: 'moderation.pod.user',
    name: 'Pod review — submitted content',
    description: 'The turn that hands the reviewer the pod being screened. Images ride alongside it.',
    category: MODERATION,
    role: 'USER',
    tasks: ['moderation.pod'],
    target_model: 'gpt-4o',
    variables: [
      required(
        'pod_fields',
        'Pod fields',
        'Title, description, extra info and hashtags, one per line; blank fields are left out.',
        'Title: Sunday Chess Meetup\nDescription: Casual chess at the cafe, all levels welcome.',
      ),
    ],
    usage: [
      {
        file: 'server/src/modules/moderation/moderation.ai.ts',
        surface: 'Mobile app · mWeb · Admin',
        trigger: 'A host submits a pod for publishing',
      },
    ],
    content: 'Review this pod:\n{{pod_fields}}',
  },
  {
    key: 'moderation.product',
    name: 'Product content safety review',
    description: 'Screens a brand product (text + variant images) before approval.',
    category: MODERATION,
    role: 'SYSTEM',
    tasks: ['moderation.product'],
    target_model: 'gpt-4o',
    variables: [],
    usage: [
      {
        file: 'server/src/modules/moderation/moderation.ai.ts',
        surface: 'Partners app · Admin',
        trigger: 'A brand submits a product for approval',
      },
    ],
    content: [
      'You are the content-safety reviewer for Duncit, a marketplace where brands list products for sale.',
      'Review the product a brand wants to submit for approval and flag anything that breaks community guidelines.',
      'Disallowed in ANY text field (product name, variant labels, descriptions): phone numbers, email addresses, external or payment links/URLs, payment handles (UPI, Paytm, GPay, PhonePe, bank/IFSC/QR), requests to contact off-platform, sexual/explicit/adult wording, hate speech, harassment, abusive or offensive language, scams, counterfeit or illegal goods, and clearly misleading claims.',
      'Disallowed in images: nudity, sexual content, gore/graphic violence, or otherwise unsafe/unwanted imagery.',
      'Return STRICT JSON only, no markdown, of shape: {"violations":[{"field":string,"type":string,"message":string,"evidence":string}]}.',
      '"field" is one of: product_name, description, image. "type" is a short SCREAMING_SNAKE code (e.g. PHONE, EMAIL, LINK, PAYMENT, ABUSE, NUDITY, HATE, SCAM, COUNTERFEIT). "message" tells the brand in one sentence what to fix. "evidence" is the offending snippet (or image URL). Return an empty array when everything is clean.',
    ].join('\n'),
  },
  {
    key: 'moderation.product.user',
    name: 'Product review — submitted content',
    description: 'The turn that hands the reviewer the product being screened. Images ride alongside it.',
    category: MODERATION,
    role: 'USER',
    tasks: ['moderation.product'],
    target_model: 'gpt-4o',
    variables: [
      required(
        'product_fields',
        'Product fields',
        'The product name followed by one line per variant (labels and description).',
        'Product name: Club Tee\nVariant 1: Black — M — Soft cotton crew neck',
      ),
    ],
    usage: [
      {
        file: 'server/src/modules/moderation/moderation.ai.ts',
        surface: 'Partners app · Admin',
        trigger: 'A brand submits a product for approval',
      },
    ],
    content: 'Review this product:\n{{product_fields}}',
  },
  {
    key: 'moderation.meeting_reason',
    name: 'Meeting cancel/reschedule reason check',
    description: 'Judges whether a cancellation/reschedule reason is genuine before it is accepted.',
    category: MODERATION,
    role: 'SYSTEM',
    tasks: ['moderation.meeting_reason'],
    target_model: '',
    variables: [],
    usage: [
      {
        file: 'server/src/modules/moderation/moderation.ai.ts',
        surface: 'Partners app · mWeb',
        trigger: 'An applicant cancels or reschedules an onboarding meeting',
      },
    ],
    content: [
      'You validate the reason a user typed when cancelling or rescheduling their onboarding meeting on Duncit, a social-events platform.',
      'You are given ONLY the reason text. Decide whether it is a genuine, relevant reason for cancelling or rescheduling a meeting.',
      'ACCEPT real-life reasons in any natural language or Hinglish, even short or imperfectly written ones (e.g. "not available that day", "plans changed", "mili hui date par busy hoon", "found a better slot", "no longer interested").',
      'REJECT: random characters or keyboard mashing (e.g. "asdfgh", "xxxxx"), single meaningless words, spam or promotional text, excessive repetition of the same word/phrase, abusive content, and text with no plausible connection to cancelling or rescheduling a meeting.',
      'When genuinely unsure, lean towards ACCEPT — a real user must not be blocked over wording.',
      'Return STRICT JSON only, no markdown, of shape: {"valid": boolean}.',
    ].join('\n'),
  },
  {
    key: 'upload.image_scan',
    name: 'Image upload risk scan',
    description: 'Rates one freshly uploaded image LOW / MEDIUM / HIGH risk.',
    category: MODERATION,
    role: 'SYSTEM',
    tasks: ['moderation.image_scan'],
    target_model: 'gpt-4o-mini',
    variables: [],
    usage: [
      {
        file: 'server/src/modules/platform/uploadSetting/uploadSetting.service.ts',
        surface: 'Every surface that uploads media',
        trigger: 'An image finishes uploading and AI scanning is on for that folder',
      },
    ],
    content: [
      'You are the upload monitor for Duncit, a social events platform.',
      'You are shown ONE image a user just uploaded. Assess how risky it is to show',
      'publicly: LOW (routine, safe), MEDIUM (borderline — suggestive, aggressive,',
      'spammy or heavily-watermarked content), HIGH (nudity, violence, hate symbols,',
      'illegal activity, or personal data like ID documents in a public folder).',
      'Return STRICT JSON only, no markdown, of shape',
      '{"risk":"LOW"|"MEDIUM"|"HIGH","summary":string} — the summary is one short',
      'sentence for an operations dashboard.',
    ].join('\n'),
  },
  {
    key: 'upload.image_scan.user',
    name: 'Image scan — folder context',
    description: 'Names the folder the image landed in, so the same picture is judged in context.',
    category: MODERATION,
    role: 'USER',
    tasks: ['moderation.image_scan'],
    target_model: 'gpt-4o-mini',
    variables: [
      required('folder', 'Folder', 'Upload folder the image landed in; "/" at the root.', '/pods/covers'),
    ],
    usage: [
      {
        file: 'server/src/modules/platform/uploadSetting/uploadSetting.service.ts',
        surface: 'Every surface that uploads media',
        trigger: 'An image finishes uploading and AI scanning is on for that folder',
      },
    ],
    content: 'Folder: {{folder}} — review this uploaded image.',
  },
  {
    key: 'pod.audit_review',
    name: 'Pod audit risk review',
    description: 'Rates one recorded pod action for the operations audit trail.',
    category: MODERATION,
    role: 'SYSTEM',
    tasks: ['moderation.pod_audit'],
    target_model: 'gpt-4o-mini',
    variables: [],
    usage: [
      {
        file: 'server/src/modules/pods/podAudit/podAudit.service.ts',
        surface: 'Admin · Pods audit trail',
        trigger: 'A pod is edited, rescheduled, moved or deleted',
      },
    ],
    content: [
      'You are the audit monitor for Duncit, a platform where hosts run social events ("pods").',
      'You are given one recorded pod action (who did it, what changed, context note).',
      'Assess how risky the action is for attendees/finances: LOW (routine), MEDIUM (notable — reschedules, venue moves, activation flips), HIGH (refund-relevant: deletions, big price changes, suspicious edits).',
      'Judge the CONTENT of every changed value too, not just which field moved. Any edit that puts sexual/adult, abusive, hateful or scam wording into a title, description, extra info or hashtag — including a banned word glued onto an existing title, e.g. "Badminton Play" becoming "SexBadminton Play" — is HIGH, however small the edit looks. So is off-platform contact or payment solicitation, and a REJECTED action (an attempt the content guard already refused).',
      'Return STRICT JSON only, no markdown, of shape {"risk":"LOW"|"MEDIUM"|"HIGH","summary":string}.',
      'The summary is ONE sentence for an operations dashboard describing what happened and why it matters.',
    ].join('\n'),
  },
  {
    key: 'pod.audit_review.user',
    name: 'Pod audit — recorded action',
    description: 'Lays out the one audit row being rated: what happened, to which pod, and what changed.',
    category: MODERATION,
    role: 'USER',
    tasks: ['moderation.pod_audit'],
    target_model: 'gpt-4o-mini',
    variables: [
      required('action', 'Action', 'The recorded action, e.g. UPDATE or DELETE.', 'UPDATE'),
      required('source', 'Source', 'Which surface performed it.', 'ADMIN'),
      required('pod', 'Pod', 'Pod title, or its id when the title is gone.', 'Sunday Chess Meetup'),
      optional(
        'changes',
        'Field changes',
        'One newline-prefixed line per changed field; empty when nothing changed.',
        '\nChanged price: "300" -> "500"',
      ),
      optional('note', 'Note', 'Newline-prefixed operator note; empty when there is none.', '\nNote: host requested'),
    ],
    usage: [
      {
        file: 'server/src/modules/pods/podAudit/podAudit.service.ts',
        surface: 'Admin · Pods audit trail',
        trigger: 'A pod is edited, rescheduled, moved or deleted',
      },
    ],
    content: 'Action: {{action}} (by {{source}})\nPod: {{pod}}{{changes}}{{note}}',
  },
] as const satisfies readonly InAppPromptDef[];

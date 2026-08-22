import type { TranslateOptions } from './translator';

/**
 * The grievance escalation ladder, in the reader's language.
 *
 * Four surfaces draw this block — mWeb, the native app, the main website and
 * (as the officer's own reminder) nothing else — and it is the sentence that
 * decides whether a grievance is accepted at all, so three hand-kept copies of
 * it is exactly the drift rules 27/40 exist to stop.
 *
 * Every key is written out as a literal `t('…')` rather than composed from the
 * step name, because `scripts/verify-translation-keys.mjs` greps source for the
 * literal key — a computed key is reported as shipped-but-never-rendered and
 * fails the Shared Gates job. Same reason `captchaCopy` and `mailCategoryCopy`
 * are shaped this way.
 */

/** The `t` any surface hands in. Structural, so no surface owns this module. */
export type GrievanceTranslate = (key: string, options?: TranslateOptions) => string;

export interface GrievanceEscalationStepCopy {
  /** The shared step key from @duncit/utils — also the React list key. */
  key: 'raise' | 'wait' | 'escalate';
  title: string;
  body: string;
}

export interface GrievanceEscalationCopy {
  title: string;
  /** The consequence, stated before the person starts typing. */
  warning: string;
  steps: GrievanceEscalationStepCopy[];
}

/** The timeline above every grievance form: support first, grievance after. */
export function grievanceEscalationCopy(t: GrievanceTranslate): GrievanceEscalationCopy {
  return {
    title: t('grievance.escalationTitle'),
    warning: t('grievance.escalationWarning'),
    steps: [
      {
        key: 'raise',
        title: t('grievance.step.raise.title'),
        body: t('grievance.step.raise.body'),
      },
      {
        key: 'wait',
        title: t('grievance.step.wait.title'),
        body: t('grievance.step.wait.body'),
      },
      {
        key: 'escalate',
        title: t('grievance.step.escalate.title'),
        body: t('grievance.step.escalate.body'),
      },
    ],
  };
}

export interface GrievanceTicketFieldCopy {
  label: string;
  /** Under the dropdown on the two apps. */
  selectHint: string;
  /** Under the free-text box on the website, where there is nobody to look up. */
  refHint: string;
  /** The dropdown's closed state, on the two apps. */
  placeholder: string;
  /** The website's box, which is typed into rather than picked from. */
  refPlaceholder: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
}

/**
 * The support-ticket field's words.
 *
 * mWeb and native render it as a dropdown of the user's own tickets; the
 * website, which has no login, renders it as a required box they type the
 * number into. Same field, same label, two hints — kept together so the two
 * hints cannot start describing different things.
 */
export function grievanceTicketFieldCopy(t: GrievanceTranslate): GrievanceTicketFieldCopy {
  return {
    label: t('grievance.field.support_ticket_ref'),
    selectHint: t('grievance.ticketSelectHint'),
    refHint: t('grievance.ticketRefHint'),
    placeholder: t('grievance.ticketNonePlaceholder'),
    refPlaceholder: t('grievance.ticketRefPlaceholder'),
    emptyTitle: t('grievance.ticketEmptyTitle'),
    emptyBody: t('grievance.ticketEmptyBody'),
    emptyCta: t('grievance.ticketEmptyCta'),
  };
}

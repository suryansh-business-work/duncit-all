import { z } from 'zod';
import type { LiteQuestion } from '../../../shared/graphql/documents';
import type { LiteRegisterInput } from '../../graphql/registrations';
import type { Translate } from '../../lib/validation';

export const MAX_QUANTITY = 10;

const QUANTITY = /^([1-9]|10)$/;

export interface RegisterValues {
  ticket_id: string;
  quantity: string;
  /** Keyed by question id; a checkbox answers "Yes" or "". */
  answers: Record<string, string>;
}

/** A ticket, how many, and an answer to every required question. */
export const makeRegisterSchema = (t: Translate, questions: readonly LiteQuestion[]) =>
  z.object({
    ticket_id: z.string().min(1, t('liteWeb.register.pickTicket')),
    quantity: z.string().refine((value) => QUANTITY.test(value), t('liteWeb.register.quantityInvalid', { vars: { max: MAX_QUANTITY } })),
    answers: z.record(z.string(), z.string()).superRefine((answers, ctx) => {
      for (const question of questions) {
        if (question.required && !(answers[question.id] ?? '').trim()) {
          ctx.addIssue({ code: 'custom', path: [question.id], message: t('liteWeb.validation.required') });
        }
      }
    }),
  });

export const defaultRegisterValues = (questions: readonly LiteQuestion[], firstTicketId: string): RegisterValues => ({
  ticket_id: firstTicketId,
  quantity: '1',
  answers: Object.fromEntries(questions.map((question) => [question.id, ''])),
});

export const toRegisterInput = (values: RegisterValues, questions: readonly LiteQuestion[]): LiteRegisterInput => ({
  ticket_id: values.ticket_id,
  quantity: Number.parseInt(values.quantity, 10),
  answers: questions.map((question) => ({ question_id: question.id, answer: (values.answers[question.id] ?? '').trim() })),
});

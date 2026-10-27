import { describe, expect, it } from 'vitest';
import { createTranslator } from '@duncit/i18n';
import { WEB_FALLBACK } from '../../../../shared/i18n';
import { MAX_QUANTITY, defaultRegisterValues, makeRegisterSchema, toRegisterInput } from '../../../components/register';
import { questionFixture } from '../../test-utils';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });

const required = questionFixture({ id: 'q-1', label: 'Dietary needs', required: true });
const optional = questionFixture({ id: 'q-2', label: 'Anything else?', required: false });
const schema = makeRegisterSchema(t, [required, optional]);

const issues = (values: Parameters<typeof schema.safeParse>[0]) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
};

describe('makeRegisterSchema', () => {
  it('accepts a ticket, a quantity and every required answer', () => {
    expect(issues({ ticket_id: 'tk-1', quantity: '2', answers: { 'q-1': 'Vegan', 'q-2': '' } })).toEqual([]);
  });

  it('asks for a ticket type when none is picked', () => {
    expect(issues({ ticket_id: '', quantity: '1', answers: { 'q-1': 'Vegan' } })).toEqual([{ path: 'ticket_id', message: 'Pick a ticket type' }]);
  });

  it.each(['1', '9', String(MAX_QUANTITY)])('accepts a quantity of %s', (quantity) => {
    expect(issues({ ticket_id: 'tk-1', quantity, answers: { 'q-1': 'x' } })).toEqual([]);
  });

  it.each(['0', '11', '-1', '1.5', '01', '', 'two'])('refuses a quantity of %j with the 1-to-10 message', (quantity) => {
    expect(issues({ ticket_id: 'tk-1', quantity, answers: { 'q-1': 'x' } })).toEqual([{ path: 'quantity', message: `Pick between 1 and ${MAX_QUANTITY}` }]);
  });

  it('requires an answer to a required question, treating whitespace as blank', () => {
    expect(issues({ ticket_id: 'tk-1', quantity: '1', answers: { 'q-1': '   ' } })).toEqual([{ path: 'answers.q-1', message: 'This is required' }]);
    expect(issues({ ticket_id: 'tk-1', quantity: '1', answers: {} })).toEqual([{ path: 'answers.q-1', message: 'This is required' }]);
  });

  it('lets an optional question stay blank', () => {
    const onlyOptional = makeRegisterSchema(t, [optional]);
    expect(onlyOptional.safeParse({ ticket_id: 'tk-1', quantity: '1', answers: {} }).success).toBe(true);
  });
});

describe('defaultRegisterValues', () => {
  it('starts on the given ticket, one seat, and a blank answer per question', () => {
    expect(defaultRegisterValues([required, optional], 'tk-7')).toEqual({ ticket_id: 'tk-7', quantity: '1', answers: { 'q-1': '', 'q-2': '' } });
  });

  it('starts with no answers when the host asked nothing', () => {
    expect(defaultRegisterValues([], '')).toEqual({ ticket_id: '', quantity: '1', answers: {} });
  });
});

describe('toRegisterInput', () => {
  it('sends the quantity as a number and one trimmed answer per question, in the host’s order', () => {
    const input = toRegisterInput({ ticket_id: 'tk-1', quantity: '3', answers: { 'q-2': '  bringing a dog ', 'q-1': 'Vegan' } }, [required, optional]);
    expect(input).toEqual({
      ticket_id: 'tk-1',
      quantity: 3,
      answers: [
        { question_id: 'q-1', answer: 'Vegan' },
        { question_id: 'q-2', answer: 'bringing a dog' },
      ],
    });
  });

  it('sends a blank answer for a question the form never saw', () => {
    expect(toRegisterInput({ ticket_id: 'tk-1', quantity: '1', answers: {} }, [optional]).answers).toEqual([{ question_id: 'q-2', answer: '' }]);
  });
});

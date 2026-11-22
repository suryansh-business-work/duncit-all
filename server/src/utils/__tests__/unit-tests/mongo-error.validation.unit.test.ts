import { validationMessages } from '@utils/mongo-error';

describe('validationMessages', () => {
  it('reads every refused rule off a Mongoose ValidationError', () => {
    const error = {
      name: 'ValidationError',
      errors: {
        limit: { message: 'Path `limit` (0) is less than minimum allowed value (1).' },
        mode: { message: '`OFF` is not a valid enum value for path `mode`.' },
      },
    };
    expect(validationMessages(error)).toEqual([
      'Path `limit` (0) is less than minimum allowed value (1).',
      '`OFF` is not a valid enum value for path `mode`.',
    ]);
  });

  it.each([
    ['another error', new Error('connection reset')],
    ['a ValidationError with no rules', { name: 'ValidationError' }],
    ['a ValidationError with null rules', { name: 'ValidationError', errors: null }],
    ['nothing', null],
    ['a string', 'ValidationError'],
  ])('finds nothing in %s', (_label, value) => {
    expect(validationMessages(value)).toBeNull();
  });
});

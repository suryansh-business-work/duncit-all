import {
  checkoutFormSchema,
  checkoutInitialValues,
  toCheckoutContact,
} from './checkout.form';

describe('Checkout form schema', () => {
  it('rejects an empty phone field with a digits-only message', async () => {
    const result = await checkoutFormSchema
      .validate({ ...checkoutInitialValues, email: 'jane@example.com' }, { abortEarly: false })
      .catch((error) => error);
    expect(result.name).to.equal('ValidationError');
    expect(result.errors.join(' ')).to.match(/phone/i);
  });

  it('rejects a phone with alphabetic characters', async () => {
    const result = await checkoutFormSchema
      .validate(
        {
          ...checkoutInitialValues,
          email: 'jane@example.com',
          phone_number: '98abcde',
          billing_address: '221B Baker Street, London NW1',
        },
        { abortEarly: false },
      )
      .catch((error) => error);
    expect(result.name).to.equal('ValidationError');
    expect(result.errors.join(' ')).to.match(/digits/i);
  });

  it('rejects an invalid email', async () => {
    const result = await checkoutFormSchema
      .validate(
        {
          ...checkoutInitialValues,
          email: 'not-an-email',
          phone_number: '9876543210',
          billing_address: '221B Baker Street, London NW1',
        },
        { abortEarly: false },
      )
      .catch((error) => error);
    expect(result.name).to.equal('ValidationError');
    expect(result.errors.join(' ')).to.match(/email/i);
  });

  it('accepts a fully valid payload and normalises through toCheckoutContact', async () => {
    const values = {
      email: ' jane@example.com ',
      phone_extension: '+91',
      phone_number: '9876543210',
      billing_address: '221B Baker Street, London NW1',
      simulate_failure: false,
    } as const;
    const parsed = await checkoutFormSchema.validate(values, { abortEarly: false });
    expect(parsed.email).to.equal('jane@example.com');
    const payload = toCheckoutContact(parsed);
    expect(payload.contact_email).to.equal('jane@example.com');
    expect(payload.contact_phone_extension).to.equal('+91');
    expect(payload.contact_phone_number).to.equal('9876543210');
    expect(payload.billing_address).to.equal('221B Baker Street, London NW1');
    expect(payload.simulate_failure).to.equal(false);
  });
});

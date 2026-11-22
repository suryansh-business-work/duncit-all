import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fallbackT } from '../../../i18n/fallback';
import PaymentClaimForm from './payment-claim.form';
import { paymentClaimFormSchema } from './payment-claim.schema';
import type { PaymentClaimContact } from './payment-claim.types';

// Uploads are support's field (its own suite covers the upload itself); here
// the stub records what the claim points it at and adds one uploaded file.
const h = vi.hoisted(() => ({ field: undefined as undefined | Record<string, any> }));
vi.mock('../../../forms/support-form/AttachmentsField', () => ({
  default: (p: Record<string, any>) => {
    h.field = p;
    return (
      <div data-testid="attachments-stub">
        <span>{p.labels?.caption}</span>
        <button type="button" data-testid="stub-add" onClick={() => p.setAttachments([...p.attachments, 'https://ik/payment-evidence/shot.png'])}>
          {p.labels?.add}
        </button>
      </div>
    );
  },
}));

const contact: PaymentClaimContact = { phone: '+91 9845012345', email: 'riya@duncit.com' };

const renderForm = (over: Partial<Parameters<typeof PaymentClaimForm>[0]> = {}) => {
  const props = { submitting: false, error: null, contact, onSubmit: vi.fn(), onCancel: vi.fn(), ...over };
  render(<PaymentClaimForm {...props} />);
  return props;
};

const pick = (labelKey: string) => fireEvent.click(screen.getByRole('radio', { name: fallbackT(labelKey) }));
const submit = () => fireEvent.click(screen.getByTestId('payment-claim-submit'));
const fileOf = (type: string) => new File(['x'], 'evidence', { type });

beforeEach(() => {
  h.field = undefined;
});

describe('paymentClaimFormSchema', () => {
  it('binds the shared rules with the bundled English', () => {
    const result = paymentClaimFormSchema.safeParse({ evidence_type: 'TRANSACTION_ID', file_refs: [], transaction_id: 'pay 1' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(fallbackT('mweb.payment.claim.transactionIdInvalid'));
  });
});

describe('PaymentClaimForm — uploaded evidence', () => {
  it('opens on the screenshot option, taking only images into the private evidence folder', () => {
    renderForm();
    expect(screen.getByRole('radio', { name: fallbackT('mweb.payment.claim.optionScreenshot') })).toBeChecked();
    expect(h.field).toMatchObject({ folder: 'payment-evidence', accept: 'image/*' });
    expect(h.field?.checkFile(fileOf('image/png'))).toBeNull();
    expect(h.field?.checkFile(fileOf('application/pdf'))).toBe(fallbackT('mweb.payment.claim.wrongFileType'));
    expect(screen.getByText(fallbackT('mweb.payment.claim.filesCount', { vars: { count: 0, max: 5 } }))).toBeInTheDocument();
  });

  it('asks for a file and sends nothing when none is attached', async () => {
    const { onSubmit } = renderForm();
    submit();
    expect(await screen.findByTestId('payment-claim-files-error')).toHaveTextContent(fallbackT('mweb.payment.claim.filesRequired'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the attached screenshot', async () => {
    const { onSubmit } = renderForm();
    fireEvent.click(screen.getByTestId('stub-add'));
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      evidence_type: 'SCREENSHOT',
      file_refs: ['https://ik/payment-evidence/shot.png'],
      transaction_id: '',
    });
  });

  it('takes images or a PDF for a bank statement, and starts its files afresh', () => {
    renderForm();
    fireEvent.click(screen.getByTestId('stub-add'));
    pick('mweb.payment.claim.optionStatement');
    expect(h.field).toMatchObject({ accept: 'image/*,application/pdf', attachments: [] });
    expect(h.field?.checkFile(fileOf('application/pdf'))).toBeNull();
    expect(h.field?.checkFile(fileOf('application/msword'))).toBe(fallbackT('mweb.payment.claim.wrongFileType'));
  });
});

describe('PaymentClaimForm — transaction id', () => {
  it('swaps the upload for a transaction id box', () => {
    renderForm();
    pick('mweb.payment.claim.optionTransactionId');
    expect(screen.queryByTestId('attachments-stub')).not.toBeInTheDocument();
    expect(screen.getByTestId('field-transaction_id')).toBeInTheDocument();
  });

  it('refuses a malformed reference with the shared message', async () => {
    const { onSubmit } = renderForm();
    pick('mweb.payment.claim.optionTransactionId');
    fireEvent.change(screen.getByTestId('field-transaction_id'), { target: { value: 'UTR: 12' } });
    submit();
    expect(await screen.findByText(fallbackT('mweb.payment.claim.transactionIdInvalid'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('asks for the reference when it is left blank', async () => {
    renderForm();
    pick('mweb.payment.claim.optionTransactionId');
    submit();
    expect(await screen.findByText(fallbackT('mweb.payment.claim.transactionIdRequired'))).toBeInTheDocument();
  });

  it('submits the trimmed reference', async () => {
    const { onSubmit } = renderForm();
    pick('mweb.payment.claim.optionTransactionId');
    fireEvent.change(screen.getByTestId('field-transaction_id'), { target: { value: '  pay_29QQoUBi66xm2f ' } });
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ evidence_type: 'TRANSACTION_ID', transaction_id: 'pay_29QQoUBi66xm2f' });
  });
});

describe('PaymentClaimForm — contact, errors and actions', () => {
  it('shows the registered phone and email support will use', () => {
    renderForm();
    expect(screen.getByText(fallbackT('mweb.payment.claim.contactNotice'))).toBeInTheDocument();
    expect(screen.getByTestId('payment-claim-phone')).toHaveTextContent('+91 9845012345');
    expect(screen.getByTestId('payment-claim-email')).toHaveTextContent('riya@duncit.com');
  });

  it('says plainly when the account has no phone or email', () => {
    renderForm({ contact: { phone: '', email: '' } });
    expect(screen.getByTestId('payment-claim-phone')).toHaveTextContent(fallbackT('mweb.payment.claim.missingContact'));
    expect(screen.getByTestId('payment-claim-email')).toHaveTextContent(fallbackT('mweb.payment.claim.missingContact'));
  });

  it('shows the last submit error inline', () => {
    renderForm({ error: 'We could not open a support ticket.' });
    expect(screen.getByTestId('payment-claim-error')).toHaveTextContent('We could not open a support ticket.');
  });

  it('locks the actions while the ticket is being opened', () => {
    renderForm({ submitting: true });
    expect(screen.getByTestId('payment-claim-cancel')).toBeDisabled();
    expect(screen.getByTestId('payment-claim-submit')).toBeDisabled();
  });

  it('cancels without sending', () => {
    const { onCancel, onSubmit } = renderForm();
    fireEvent.click(screen.getByTestId('payment-claim-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

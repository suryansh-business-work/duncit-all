import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LeadFormActions from '@/components/LeadFormActions';

describe('LeadFormActions', () => {
  it('renders only the primary save when no cancel or continue handler is given', () => {
    render(<LeadFormActions submitLabel="Save host lead" />);

    expect(screen.getByRole('button', { name: 'Save host lead' })).toHaveAttribute('type', 'submit');
    expect(screen.queryByTestId('lead-form-cancel')).toBeNull();
    expect(screen.queryByTestId('lead-form-submit-continue')).toBeNull();
  });

  it('labels the continue button "Update & Continue" unless the page names it', () => {
    const onContinue = vi.fn();
    const { rerender } = render(<LeadFormActions submitLabel="Update venue lead" onContinue={onContinue} />);

    fireEvent.click(screen.getByRole('button', { name: 'Update & Continue' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    // Not a submit button: it must not also fire the form's primary submit.
    expect(screen.getByTestId('lead-form-submit-continue')).toHaveAttribute('type', 'button');

    rerender(<LeadFormActions submitLabel="Create venue lead" onContinue={onContinue} continueLabel="Create & Continue" />);
    expect(screen.getByRole('button', { name: 'Create & Continue' })).toBeInTheDocument();
  });

  it('while a continue-save runs, shows progress on that button and locks the other two', () => {
    render(<LeadFormActions submitLabel="Update host lead" submitting continuing onContinue={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByTestId('lead-form-submit-continue')).toHaveTextContent('Saving…');
    expect(screen.getByTestId('lead-form-submit-continue')).toBeDisabled();
    expect(screen.getByTestId('lead-form-submit')).toHaveTextContent('Update host lead');
    expect(screen.getByTestId('lead-form-submit')).toBeDisabled();
    expect(screen.getByTestId('lead-form-cancel')).toBeDisabled();
  });

  it('while the primary save runs, shows progress on it and locks the continue button', () => {
    render(<LeadFormActions submitLabel="Update host lead" submitting onContinue={vi.fn()} />);

    expect(screen.getByTestId('lead-form-submit')).toHaveTextContent('Saving…');
    expect(screen.getByTestId('lead-form-submit-continue')).toHaveTextContent('Update & Continue');
    expect(screen.getByTestId('lead-form-submit-continue')).toBeDisabled();
  });

  it('disables both save buttons while validation is failing, but still allows cancelling', () => {
    const onCancel = vi.fn();
    render(<LeadFormActions submitLabel="Update ecomm lead" invalid onContinue={vi.fn()} onCancel={onCancel} />);

    expect(screen.getByTestId('lead-form-submit')).toBeDisabled();
    expect(screen.getByTestId('lead-form-submit-continue')).toBeDisabled();
    fireEvent.click(screen.getByTestId('lead-form-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

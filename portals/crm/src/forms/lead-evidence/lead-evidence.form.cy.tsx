import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  LEAD_EVIDENCE_TEXT_MAX,
  LEAD_EVIDENCE_URL_MAX,
  LeadEvidenceForm,
  leadEvidenceDecision,
  leadEvidenceDefaults,
  leadEvidenceSchema,
  type LeadEvidenceFormValues,
} from '.';

// Echoing keys keeps the schema's messages assertable without the bundle.
const schema = leadEvidenceSchema(((key: string) => key) as Parameters<typeof leadEvidenceSchema>[0]);

const values = (over: Partial<LeadEvidenceFormValues> = {}): LeadEvidenceFormValues => ({
  status: 'VERIFIED',
  evidence: 'Listed on Google Maps with 120 reviews',
  source_url: '',
  notes: '',
  ...over,
});

/** Each refused field and its message key. */
const issues = (input: LeadEvidenceFormValues) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => [issue.path.join('.'), issue.message]);
};

describe('leadEvidenceSchema', () => {
  it('accepts a verified decision with evidence and trims every field', () => {
    const result = schema.safeParse(values({ evidence: '  Listed on Maps  ', source_url: ' https://maps.app/x ', notes: ' ok ' }));
    expect(result.success && result.data).toEqual({ status: 'VERIFIED', evidence: 'Listed on Maps', source_url: 'https://maps.app/x', notes: 'ok' });
  });

  it('asks what proves a verified item and why an unmet one is not met, at 3 characters or more', () => {
    expect(issues(values({ evidence: '  ab ' }))).toEqual([['evidence', 'crm.leadQualityTab.evidenceRequired']]);
    expect(issues(values({ status: 'FAILED', evidence: '' }))).toEqual([['evidence', 'crm.leadQualityTab.reasonRequired']]);
    expect(issues(values({ evidence: 'abc' }))).toEqual([]);
  });

  it('accepts the evidence and notes at the 1000-character cap and refuses one more', () => {
    const atCap = 'a'.repeat(LEAD_EVIDENCE_TEXT_MAX);
    expect(issues(values({ evidence: atCap, notes: atCap }))).toEqual([]);
    expect(issues(values({ evidence: `${atCap}a`, notes: `${atCap}a` }))).toEqual([
      ['evidence', 'crm.leadQualityTab.textTooLong'],
      ['notes', 'crm.leadQualityTab.textTooLong'],
    ]);
  });

  it('takes only http(s) source links, and an empty one', () => {
    expect(issues(values({ source_url: 'https://instagram.com/grandhall' }))).toEqual([]);
    expect(issues(values({ source_url: 'http://grandhall.example' }))).toEqual([]);
    for (const bad of ['instagram.com/grandhall', 'javascript:alert(1)', 'ftp://files.example/x']) {
      expect(issues(values({ source_url: bad }))).toEqual([['source_url', 'crm.leadQualityTab.sourceInvalid']]);
    }
    expect(issues(values({ source_url: `https://x.example/${'a'.repeat(LEAD_EVIDENCE_URL_MAX)}` }))).toEqual([
      ['source_url', 'crm.leadQualityTab.textTooLong'],
    ]);
  });

  it('lets a decision be cleared whatever the hidden fields hold', () => {
    expect(issues(values({ status: 'PENDING', evidence: '', source_url: 'not a link' }))).toEqual([]);
  });
});

describe('leadEvidenceDefaults and leadEvidenceDecision', () => {
  it('starts a fresh item as Verified and an existing one from its recorded decision', () => {
    expect(leadEvidenceDefaults()).toEqual({ status: 'VERIFIED', evidence: '', source_url: '', notes: '' });
    expect(leadEvidenceDefaults({ status: 'FAILED', evidence: 'No site', source_url: '', notes: 'Asked owner' })).toEqual({
      status: 'FAILED',
      evidence: 'No site',
      source_url: '',
      notes: 'Asked owner',
    });
  });

  it('sends the decision with empty optional fields left out, and only the status when clearing', () => {
    expect(leadEvidenceDecision('maps', values())).toEqual({
      item_key: 'maps',
      status: 'VERIFIED',
      evidence: 'Listed on Google Maps with 120 reviews',
      source_url: null,
      notes: null,
    });
    expect(leadEvidenceDecision('maps', values({ status: 'PENDING', notes: 'x' }))).toEqual({ item_key: 'maps', status: 'PENDING' });
  });
});

describe('LeadEvidenceForm', () => {
  const setup = (props: Partial<Parameters<typeof LeadEvidenceForm>[0]> = {}) => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(
      <LeadEvidenceForm
        open
        itemLabel="Google Maps listing · 40 points"
        initialValues={leadEvidenceDefaults()}
        onSubmit={onSubmit}
        onClose={onClose}
        {...props}
      />,
    );
    return { onSubmit, onClose };
  };
  const field = (name: string) => screen.getByTestId(`lead-evidence-${name}`) as HTMLInputElement;
  const decide = (status: string) => fireEvent.change(screen.getByRole('combobox', { name: 'Decision' }), { target: { value: status } });

  it('submits a verified decision with its evidence and source', async () => {
    const { onSubmit } = setup();
    expect(screen.getByRole('dialog', { name: 'Record evidence' })).toHaveTextContent('Google Maps listing · 40 points');

    fireEvent.change(field('evidence'), { target: { value: ' Listed with 120 reviews ' } });
    fireEvent.change(field('source_url'), { target: { value: 'https://maps.app/grandhall' } });
    fireEvent.click(field('submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ status: 'VERIFIED', evidence: 'Listed with 120 reviews', source_url: 'https://maps.app/grandhall', notes: '' });
  });

  it('labels the text by the decision and refuses an unmet item without a reason', async () => {
    const { onSubmit } = setup();
    expect(screen.getByText('What proves it, e.g. "Listed on Google Maps with 120 reviews".')).toBeInTheDocument();

    decide('FAILED');
    expect(screen.getByText('Why it is not met.')).toBeInTheDocument();
    fireEvent.click(field('submit'));

    expect(await screen.findByText('Say why it is not met (at least 3 characters).')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a source that is not a web link', async () => {
    const { onSubmit } = setup();
    fireEvent.change(field('evidence'), { target: { value: 'Listed with 120 reviews' } });
    fireEvent.change(field('source_url'), { target: { value: 'maps listing' } });
    fireEvent.click(field('submit'));

    expect(await screen.findByText('Enter a full http(s) link, e.g. https://instagram.com/name.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears a decision without asking for evidence, and explains what clearing does', async () => {
    const { onSubmit } = setup({ initialValues: leadEvidenceDefaults({ status: 'VERIFIED', evidence: 'Old proof', source_url: '', notes: '' }) });

    decide('PENDING');
    expect(screen.getByTestId('lead-evidence-clear-hint')).toHaveTextContent('The item counts as pending again and earns no points.');
    expect(screen.queryByTestId('lead-evidence-evidence')).not.toBeInTheDocument();
    fireEvent.click(field('submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ status: 'PENDING' });
  });

  it('lists the server refusals it is given', () => {
    setup({ errors: ['maps: say what proves it.', 'maps: sent twice.'] });
    expect(screen.getByTestId('lead-evidence-refused')).toHaveTextContent('The evidence was not saved:maps: say what proves it.maps: sent twice.');
  });

  it('closes on Cancel', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cannot be cancelled while saving', () => {
    setup({ submitting: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});

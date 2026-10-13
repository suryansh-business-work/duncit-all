import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifySuccess } from '@duncit/dialogs';
import BrandConsentPage from '../../src/pages/brand-consent/BrandConsentPage';
import { renderWithProviders } from '../testkit';
import {
  createPolicyMatchingMock,
  makePolicyBySlug,
  policyBySlugMock,
  updatePolicyMatchingMock,
} from '../mocks';

vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
}));

// The rich-text editor is a contenteditable; its own package owns that suite.
// A plain textarea gives this page's form the same value/onChange contract.
vi.mock(import('@duncit/rich-text'), async (importOriginal) => ({
  ...(await importOriginal()),
  DuncitRichTextInput: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (html: string) => void;
    ariaLabel?: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      data-testid="consent-editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

/**
 * The one policy brand partners sign at the last onboarding step. The page
 * edits the record found by its fixed slug, and creates it the first time.
 */
const LONG_TEXT = '<p>Partners must fulfil every order within the agreed handling time.</p>';

const renderPage = (mocks: MockedResponse[]) => renderWithProviders(<BrandConsentPage />, { mocks });

const title = () => screen.findByTestId('brand-consent-title');
const save = () => screen.getByTestId('brand-consent-save');

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
});

describe('BrandConsentPage — first time', () => {
  it('says nothing is written yet and keeps Save disabled until something changes', async () => {
    renderPage([policyBySlugMock(null)]);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText(/No Brand Consent has been written yet/)).toBeInTheDocument();
    expect(await title()).toHaveValue('');
    expect(save()).toBeDisabled();
    // A draft starts unpublished — nobody signs a draft.
    expect(screen.getByText(/Unpublished/)).toBeInTheDocument();
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();
  });

  it('creates the record under the fixed slug and re-reads it', async () => {
    const created = makePolicyBySlug({ title: 'Partner Consent', content: LONG_TEXT });
    renderPage([
      policyBySlugMock(null),
      createPolicyMatchingMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return (
          input.slug === 'brand-partner-consent' &&
          input.policy_type === 'Brand & Seller Policy' &&
          input.requires_signup_acceptance === false &&
          input.sort_order === 999 &&
          input.title === 'Partner Consent' &&
          input.content === LONG_TEXT &&
          input.is_active === false
        );
      }),
      policyBySlugMock(created),
    ]);

    fireEvent.change(await title(), { target: { value: 'Partner Consent' } });
    fireEvent.change(screen.getByTestId('consent-editor'), { target: { value: LONG_TEXT } });
    fireEvent.click(save());

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Brand Consent saved.'));
    // The refetch landed: the page now knows the record exists.
    expect(await screen.findByText(/every partner must sign again/)).toBeInTheDocument();
  });

  it('refuses an empty consent text', async () => {
    renderPage([policyBySlugMock(null)]);
    fireEvent.change(await title(), { target: { value: 'Partner Consent' } });
    fireEvent.click(save());

    expect(await screen.findByText('Consent text is required')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('refuses a consent text shorter than what a partner could meaningfully agree to', async () => {
    renderPage([policyBySlugMock(null)]);
    fireEvent.change(await title(), { target: { value: 'Partner Consent' } });
    fireEvent.change(screen.getByTestId('consent-editor'), { target: { value: '<p>Too short</p>' } });
    fireEvent.click(save());

    expect(await screen.findByText('Consent text must be at least 20 characters')).toBeInTheDocument();
  });

  it('refuses a missing and an over-long title', async () => {
    renderPage([policyBySlugMock(null)]);
    const field = await title();
    fireEvent.change(screen.getByTestId('consent-editor'), { target: { value: LONG_TEXT } });
    fireEvent.change(field, { target: { value: '   ' } });
    fireEvent.click(save());
    expect(await screen.findByText('Title is required')).toBeInTheDocument();

    fireEvent.change(field, { target: { value: 'x'.repeat(161) } });
    expect(await screen.findByText('Title must be 160 characters or fewer')).toBeInTheDocument();
  });

  it("shows the server's reason when the create is refused and does not claim success", async () => {
    renderPage([
      policyBySlugMock(null),
      {
        request: createPolicyMatchingMock(() => true).request,
        result: { errors: [{ message: 'Slug is reserved' }] },
      },
    ]);
    fireEvent.change(await title(), { target: { value: 'Partner Consent' } });
    fireEvent.change(screen.getByTestId('consent-editor'), { target: { value: LONG_TEXT } });
    fireEvent.click(save());

    expect(await screen.findByText('Slug is reserved')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('BrandConsentPage — editing the live record', () => {
  const live = makePolicyBySlug({ content: LONG_TEXT });

  it('seeds the form from the record and warns that rewording re-triggers signing', async () => {
    renderPage([policyBySlugMock(live)]);

    expect(await screen.findByText(/every partner must sign again/)).toBeInTheDocument();
    expect(await title()).toHaveValue('Brand Partner Consent');
    expect(screen.getByTestId('consent-editor')).toHaveValue(LONG_TEXT);
    expect(screen.getByText(/Published/)).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('treats a record with no stored content as an empty editor', async () => {
    renderPage([policyBySlugMock(makePolicyBySlug({ content: '' }))]);
    await title();
    expect(screen.getByTestId('consent-editor')).toHaveValue('');
  });

  it('updates by id with only the editable fields', async () => {
    renderPage([
      policyBySlugMock(live),
      updatePolicyMatchingMock(
        (variables) =>
          variables.id === 'consent-1' &&
          JSON.stringify(variables.input) ===
            JSON.stringify({ title: 'Brand Partner Consent v2', content: LONG_TEXT, is_active: false }),
      ),
      policyBySlugMock(makePolicyBySlug({ title: 'Brand Partner Consent v2', is_active: false })),
    ]);

    fireEvent.change(await title(), { target: { value: 'Brand Partner Consent v2' } });
    fireEvent.click(screen.getByTestId('brand-consent-active'));
    expect(screen.getByText(/Unpublished/)).toBeInTheDocument();
    fireEvent.click(save());

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Brand Consent saved.'));
    // The re-read landed and the form reseeded from the saved record.
    await waitFor(() =>
      expect(screen.getByTestId('brand-consent-title')).toHaveValue('Brand Partner Consent v2'),
    );
  });
});

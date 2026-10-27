import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import PartnerPoliciesPage from './PartnerPoliciesPage';
import PartnerPolicyArticle from './PartnerPolicyArticle';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer } from '../../__tests__/groupC-link';

afterEach(cleanup);

const policy = (over: Record<string, unknown> = {}) => ({
  __typename: 'Policy',
  id: 'pol1',
  slug: 'terms',
  title: 'Terms of Service',
  content: '<p>You agree to ship on time.</p>',
  is_active: true,
  updated_at: '2026-06-01T00:00:00.000Z',
  ...over,
});

const listed = (rows: { slug: string; title: string }[]) => ({
  publicPolicies: rows.map((row, index) => ({ __typename: 'PublicPolicy', id: `p${index}`, updated_at: '2026-06-01T00:00:00.000Z', ...row })),
});

const mountArticle = (answer: ScriptedAnswer) =>
  renderWithProviders(<PartnerPolicyArticle slug="terms" />, { link: scriptedLink({ PartnerPolicyBySlug: answer }) });

describe('PartnerPolicyArticle', () => {
  it('shows a skeleton while the policy loads', () => {
    mountArticle(STAY_PENDING);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows the policy with its content and when it was last updated', async () => {
    mountArticle({ policyBySlug: policy() });
    expect(await screen.findByRole('heading', { name: 'Terms of Service' })).toBeTruthy();
    expect(screen.getByText('You agree to ship on time.')).toBeTruthy();
    expect(screen.getByText(/Last updated .*2026/)).toBeTruthy();
  });

  it('keeps showing the cached policy, with a small spinner, while a fresh copy is being fetched', async () => {
    let reads = 0;
    function Twice() {
      const [again, setAgain] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setAgain(true)}>
            open again
          </button>
          <PartnerPolicyArticle slug="terms" />
          {again && <PartnerPolicyArticle slug="terms" />}
        </>
      );
    }
    renderWithProviders(<Twice />, {
      link: scriptedLink({
        PartnerPolicyBySlug: () => {
          reads += 1;
          return reads === 1 ? { policyBySlug: policy() } : STAY_PENDING;
        },
      }),
    });
    await screen.findByRole('heading', { name: 'Terms of Service' });
    expect(screen.queryByRole('progressbar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'open again' }));
    expect((await screen.findAllByRole('heading', { name: 'Terms of Service' })).length).toBe(2);
    expect((await screen.findAllByRole('progressbar', { name: 'Loading…' })).length).toBeGreaterThanOrEqual(1);
  });

  it('shows an empty body for a policy that has no content', async () => {
    mountArticle({ policyBySlug: policy({ content: null }) });
    expect(await screen.findByRole('heading', { name: 'Terms of Service' })).toBeTruthy();
    expect(document.querySelector('.ql-editor')?.innerHTML).toBe('');
  });

  it('shows the server message when the policy cannot be read', async () => {
    mountArticle(new Error('Policies are down'));
    expect(await screen.findByText('Could not load policy: Policies are down')).toBeTruthy();
  });

  it('says no policy was found for an unknown slug', async () => {
    mountArticle({ policyBySlug: null });
    expect(await screen.findByText('No policy found.')).toBeTruthy();
  });

  it('says a hidden policy is currently hidden', async () => {
    mountArticle({ policyBySlug: policy({ is_active: false }) });
    expect(await screen.findByText('This policy is currently hidden.')).toBeTruthy();
  });
});

describe('PartnerPoliciesPage', () => {
  const mountPage = (route: string, answers: Record<string, ScriptedAnswer>) =>
    renderWithProviders(<PartnerPoliciesPage />, { route, path: route === '/policies' ? '/policies' : '/policies/:slug', link: scriptedLink(answers) });

  it('opens the first policy when none is chosen', async () => {
    mountPage('/policies', { PartnerPublicPolicies: listed([{ slug: 'terms', title: 'Terms of Service' }, { slug: 'privacy', title: 'Privacy' }]) });
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/policies/terms'));
  });

  it('lists every policy, marks the open one and shows its article', async () => {
    mountPage('/policies/privacy', {
      PartnerPublicPolicies: listed([{ slug: 'terms', title: 'Terms of Service' }, { slug: 'privacy', title: 'Privacy' }]),
      PartnerPolicyBySlug: { policyBySlug: policy({ slug: 'privacy', title: 'Privacy' }) },
    });
    const open = await screen.findByRole('link', { name: 'Privacy' });
    expect(open.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Terms of Service' }).getAttribute('aria-current')).toBeNull();
    expect(await screen.findByRole('heading', { name: 'Privacy', level: 2 })).toBeTruthy();
  });

  it('says there are no active policies, and asks to select one when none is open', async () => {
    mountPage('/policies', { PartnerPublicPolicies: listed([]) });
    expect(await screen.findByText('No active policies yet.')).toBeTruthy();
    expect(screen.getByText('Select a policy.')).toBeTruthy();
  });

  it('shows the server message when the list cannot be read', async () => {
    mountPage('/policies', { PartnerPublicPolicies: new Error('List is down') });
    expect(await screen.findByText('List is down')).toBeTruthy();
  });

  it('shows a spinner while the list loads', () => {
    mountPage('/policies', { PartnerPublicPolicies: STAY_PENDING });
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });
});

import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import PolicyAcceptanceDialog from '../PolicyAcceptanceDialog';
import PolicyAcceptanceField from '../PolicyAcceptanceField';
import PolicyAcceptanceList from '../PolicyAcceptanceList';
import PolicyBodyDialog from '../PolicyBodyDialog';
import GoogleSignupPolicyGate from '../GoogleSignupPolicyGate';
import { fallbackT } from '../../../i18n/fallback';
import type { SignupPolicy } from '../useSignupPolicies';

const POLICIES: SignupPolicy[] = [
  { id: 'p1', slug: 'terms', title: 'Terms', content: '<p>Terms body</p>' },
  { id: 'p2', slug: 'privacy', title: 'Privacy', content: '<p>Privacy body</p>' },
];

describe('PolicyBodyDialog', () => {
  it('shows the policy title and its HTML body, and closes', () => {
    const onClose = vi.fn();
    render(<PolicyBodyDialog policy={POLICIES[0]} onClose={onClose} />);
    expect(screen.getByText('Terms')).toBeInTheDocument();
    expect(screen.getByTestId('policy-acceptance-reader')).toContainHTML('<p>Terms body</p>');
    fireEvent.click(screen.getByTestId('policy-body-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while no policy is open', () => {
    render(<PolicyBodyDialog policy={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId('policy-body-dialog')).not.toBeInTheDocument();
  });
});

describe('PolicyAcceptanceList', () => {
  const list = (over: Partial<Parameters<typeof PolicyAcceptanceList>[0]> = {}) => {
    const onToggle = vi.fn();
    render(
      <PolicyAcceptanceList policies={POLICIES} loading={false} failed={false} accepted={['p2']} onToggle={onToggle} {...over} />
    );
    return onToggle;
  };

  it('shows the failure and nothing else when the list could not load', () => {
    list({ failed: true, loading: true });
    expect(screen.getByTestId('policy-acceptance-failed')).toHaveTextContent(fallbackT('policyAcceptance.loadFailed'));
    expect(screen.queryByTestId('policy-acceptance-loading')).not.toBeInTheDocument();
  });

  it('shows a loading status while the list loads', () => {
    list({ loading: true });
    expect(screen.getByTestId('policy-acceptance-loading')).toHaveTextContent(fallbackT('policyAcceptance.loading'));
    expect(screen.queryByTestId('policy-acceptance-list')).not.toBeInTheDocument();
  });

  it('ticks the accepted rows and reports a toggle with the policy id', () => {
    const onToggle = list();
    expect(screen.getByRole('checkbox', { name: 'Terms' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Privacy' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Terms' }));
    expect(onToggle).toHaveBeenCalledWith('p1', true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Privacy' }));
    expect(onToggle).toHaveBeenCalledWith('p2', false);
  });

  it('opens the full text of a policy and closes it again', async () => {
    list();
    fireEvent.click(screen.getByTestId('policy-read-privacy'));
    expect(screen.getByTestId('policy-acceptance-reader')).toContainHTML('<p>Privacy body</p>');
    fireEvent.click(screen.getByTestId('policy-body-close'));
    await waitFor(() => expect(screen.queryByTestId('policy-acceptance-reader')).not.toBeInTheDocument());
  });
});

describe('PolicyAcceptanceDialog', () => {
  const dialog = (over: Partial<Parameters<typeof PolicyAcceptanceDialog>[0]> = {}) => {
    const props = {
      open: true,
      policies: POLICIES,
      loading: false,
      failed: false,
      accepted: ['p1'],
      onChange: vi.fn(),
      onClose: vi.fn(),
      ...over,
    };
    render(<PolicyAcceptanceDialog {...props} />);
    return props;
  };

  it('counts accepted policies, warns until all are ticked, and writes row ticks through', () => {
    const props = dialog();
    expect(screen.getByTestId('policy-acceptance-count')).toHaveTextContent(
      fallbackT('policyAcceptance.acceptedCount', { vars: { done: 1, total: 2 } })
    );
    expect(screen.getAllByText(fallbackT('policyAcceptance.mustAcceptHint'))).toHaveLength(1);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Privacy' }));
    expect(props.onChange).toHaveBeenCalledWith(['p1', 'p2']);
  });

  it('drops the warning once everything is accepted', () => {
    dialog({ accepted: ['p1', 'p2'] });
    expect(screen.queryByText(fallbackT('policyAcceptance.mustAcceptHint'))).not.toBeInTheDocument();
  });

  it('closes with the current set, and accepts all with every id', () => {
    const props = dialog();
    fireEvent.click(screen.getByTestId('policy-acceptance-close'));
    expect(props.onClose).toHaveBeenLastCalledWith(['p1']);
    fireEvent.click(screen.getByTestId('policy-acceptance-accept-all'));
    expect(props.onClose).toHaveBeenLastCalledWith(['p1', 'p2']);
  });

  it('hides the summary and disables Accept all while loading or after a failure', () => {
    dialog({ loading: true });
    expect(screen.queryByTestId('policy-acceptance-count')).not.toBeInTheDocument();
    expect(screen.getByTestId('policy-acceptance-accept-all')).toBeDisabled();
  });

  it('uses the provider wording when the dialog follows a social sign-in', () => {
    dialog({ afterProvider: 'GOOGLE' });
    expect(screen.getByText(fallbackT('policyAcceptance.googleIntro'))).toBeInTheDocument();
    expect(screen.queryByText(fallbackT('policyAcceptance.dialogIntro'))).not.toBeInTheDocument();
  });

  it('uses the default intro otherwise', () => {
    dialog();
    expect(screen.getByText(fallbackT('policyAcceptance.dialogIntro'))).toBeInTheDocument();
  });
});

describe('PolicyAcceptanceField', () => {
  const Harness = (props: Partial<Parameters<typeof PolicyAcceptanceField>[0]> & { start?: string[]; spy?: (ids: string[]) => void }) => {
    const [accepted, setAccepted] = useState<string[]>(props.start ?? []);
    return (
      <PolicyAcceptanceField
        accepted={accepted}
        onChange={(ids) => {
          props.spy?.(ids);
          setAccepted(ids);
        }}
        policies={props.policies ?? POLICIES}
        loading={props.loading ?? false}
        failed={props.failed ?? false}
        error={props.error}
      />
    );
  };

  it('renders nothing when legal narrowed the gate to no policies', () => {
    render(<Harness policies={[]} />);
    expect(screen.queryByTestId('policy-acceptance-field')).not.toBeInTheDocument();
  });

  it('keeps the field while the list is loading or has failed, even with no rows', () => {
    const { unmount } = render(<Harness policies={[]} loading />);
    expect(screen.getByTestId('policy-acceptance-field')).toBeInTheDocument();
    unmount();
    render(<Harness policies={[]} failed />);
    expect(screen.getByTestId('policy-acceptance-field')).toBeInTheDocument();
  });

  it('opens the dialog instead of ticking, and ticks once everything is accepted', () => {
    render(<Harness />);
    expect(screen.getByTestId('policy-acceptance-hint')).toHaveTextContent(fallbackT('policyAcceptance.mustAcceptHint'));
    fireEvent.click(screen.getByTestId('signup-policies-checkbox-input'));
    expect(screen.getByTestId('policy-acceptance-sheet')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('policy-acceptance-accept-all'));
    expect(screen.getByTestId('signup-policies-checkbox-input')).toBeChecked();
    expect(screen.queryByTestId('policy-acceptance-hint')).not.toBeInTheDocument();
  });

  it('clears every acceptance when unticked', () => {
    const spy = vi.fn();
    render(<Harness start={['p1', 'p2']} spy={spy} />);
    fireEvent.click(screen.getByTestId('signup-policies-checkbox-input'));
    expect(spy).toHaveBeenCalledWith([]);
    expect(screen.getByTestId('signup-policies-checkbox-input')).not.toBeChecked();
  });

  it('shows the form error in place of the hint and flags the checkbox invalid', () => {
    render(<Harness error="Accept the policies" />);
    expect(screen.getByTestId('acceptedPolicyIds-error')).toHaveTextContent('Accept the policies');
    expect(screen.getByTestId('signup-policies-checkbox-input')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('signup-policies-checkbox-input')).toHaveAttribute('aria-describedby', 'policy-acceptance-helper');
  });
});

describe('GoogleSignupPolicyGate', () => {
  const credential = { provider: 'GOOGLE', token: 't' } as never;
  const gate = (over: Partial<Parameters<typeof GoogleSignupPolicyGate>[0]> = {}) => {
    const props = {
      credential,
      policies: POLICIES,
      loading: false,
      failed: false,
      onAccepted: vi.fn(),
      onCancelled: vi.fn(),
      ...over,
    };
    const utils = render(<GoogleSignupPolicyGate {...props} />);
    return { ...props, ...utils };
  };

  it('stays closed while there is no credential', () => {
    gate({ credential: null });
    expect(screen.queryByTestId('policy-acceptance-sheet')).not.toBeInTheDocument();
  });

  it('creates the account with every id once all are accepted', () => {
    const props = gate();
    fireEvent.click(screen.getByTestId('policy-acceptance-accept-all'));
    expect(props.onAccepted).toHaveBeenCalledWith(['p1', 'p2']);
    expect(props.onCancelled).not.toHaveBeenCalled();
  });

  it('cancels when closed with only part accepted', () => {
    const props = gate();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Terms' }));
    fireEvent.click(screen.getByTestId('policy-acceptance-close'));
    expect(props.onCancelled).toHaveBeenCalledTimes(1);
    expect(props.onAccepted).not.toHaveBeenCalled();
  });

  it('never accepts vacuously while the list is unresolved', () => {
    const props = gate({ policies: [], loading: true });
    fireEvent.click(screen.getByTestId('policy-acceptance-close'));
    expect(props.onCancelled).toHaveBeenCalledTimes(1);
    expect(props.onAccepted).not.toHaveBeenCalled();
  });

  it('starts a second attempt from zero ticks', () => {
    const props = gate();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Terms' }));
    expect(screen.getByRole('checkbox', { name: 'Terms' })).toBeChecked();
    props.rerender(
      <GoogleSignupPolicyGate
        credential={{ provider: 'GOOGLE', token: 'second' } as never}
        policies={POLICIES}
        loading={false}
        failed={false}
        onAccepted={props.onAccepted}
        onCancelled={props.onCancelled}
      />
    );
    expect(screen.getByRole('checkbox', { name: 'Terms' })).not.toBeChecked();
  });
});

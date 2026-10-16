import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import AdminPodDetailsPage from '../PodDetailsPage';

type Pod = { id: string; pod_title: string; is_deleted?: boolean; is_hidden?: boolean };
interface SharedProps {
  backTo?: string;
  backLabel?: string;
  userTo: (id: string) => string;
  editTo: (id: string) => string;
  actions: (pod: Pod) => ReactNode;
  banner: (pod: Pod) => ReactNode;
  footer: (pod: Pod) => ReactNode;
}

const shared = vi.hoisted(() => ({ props: null as unknown }));

vi.mock('@duncit/pod-details', () => ({
  PodDetailsPage: (props: unknown) => {
    shared.props = props;
    return <div data-testid="shared" />;
  },
}));
vi.mock('../PodCouponsSection', () => ({
  default: ({ podId, podTitle }: { podId: string; podTitle: string }) => (
    <div data-testid="coupons">{`${podId}|${podTitle}`}</div>
  ),
}));
vi.mock('../PodRentalsSection', () => ({
  default: ({ podId, editTo }: { podId: string; editTo: string }) => (
    <div data-testid="rentals">{`${podId}|${editTo}`}</div>
  ),
}));
vi.mock('../PodCancellationRiskSection', () => ({
  default: ({ podId, cancelled }: { podId: string; cancelled: boolean }) => (
    <div data-testid="risk">{`${podId}|${cancelled}`}</div>
  ),
}));
vi.mock('../PodVisibilityAction', () => ({
  default: ({ podId, hidden }: { podId: string; hidden: boolean }) => (
    <div data-testid="visibility">{`${podId}|${hidden}`}</div>
  ),
}));
vi.mock('../../list/revoke-cancellation', () => ({
  default: ({ podId }: { podId: string }) => <div data-testid="revoke">{podId}</div>,
}));

const mountPage = (props: { backTo?: string; backLabel?: string } = {}) => {
  render(<AdminPodDetailsPage {...props} />);
  return shared.props as SharedProps;
};

describe('AdminPodDetailsPage', () => {
  it('passes Back through to the shared view and links to the admin routes', () => {
    const view = mountPage({ backTo: '/clubs/c1', backLabel: 'Back to club' });
    expect(view.backTo).toBe('/clubs/c1');
    expect(view.backLabel).toBe('Back to club');
    expect(view.userTo('u9')).toBe('/users/u9');
    expect(view.editTo('p9')).toBe('/pods/p9/edit');
  });

  it('puts the hidden banner above the risk report, which is told when the pod is cancelled', () => {
    const view = mountPage();
    render(<>{view.banner({ id: 'p1', pod_title: 'Chess', is_deleted: true, is_hidden: true })}</>);
    expect(screen.getByText(/This pod is hidden from the app\./)).toBeInTheDocument();
    expect(screen.getByTestId('risk')).toHaveTextContent('p1|true');
  });

  it('omits the hidden banner for a visible pod', () => {
    const view = mountPage();
    render(<>{view.banner({ id: 'p1', pod_title: 'Chess' })}</>);
    expect(screen.queryByText(/hidden from the app/)).not.toBeInTheDocument();
    expect(screen.getByTestId('risk')).toHaveTextContent('p1|undefined');
  });

  it('offers Revoke only on a cancelled pod, and always the visibility toggle', () => {
    const view = mountPage();
    const { unmount } = render(
      <>{view.actions({ id: 'p1', pod_title: 'Chess', is_deleted: false, is_hidden: true })}</>,
    );
    expect(screen.getByTestId('visibility')).toHaveTextContent('p1|true');
    expect(screen.queryByTestId('revoke')).not.toBeInTheDocument();
    unmount();

    render(<>{view.actions({ id: 'p2', pod_title: 'Chess', is_deleted: true })}</>);
    expect(screen.getByTestId('visibility')).toHaveTextContent('p2|false');
    expect(screen.getByTestId('revoke')).toHaveTextContent('p2');
  });

  it('injects this pod\'s offer codes as the footer', () => {
    const view = mountPage();
    render(<>{view.footer({ id: 'p1', pod_title: 'Chess Night' })}</>);
    expect(screen.getByTestId('coupons')).toHaveTextContent('p1|Chess Night');
    // The Pod Shop link opens this portal's own editor; the rented items sit beside it.
    expect(screen.getByTestId('rentals')).toHaveTextContent('p1|/pods/p1/edit');
  });
});

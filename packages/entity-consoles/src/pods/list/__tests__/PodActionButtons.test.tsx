import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PodActionButtons from '../PodActionButtons';
import usePodVisibility from '../usePodVisibility';
import type { PodRow } from '../queries';

const access = vi.hoisted(() => ({ canGovern: true }));
const visibility = vi.hoisted(() => ({
  request: vi.fn(),
  hooked: null as { kind: string; onChanged: () => void } | null,
}));

vi.mock('../../../shared/useConsoleAccess', () => ({
  useConsoleAccess: () => ({ canGovern: access.canGovern }),
}));
vi.mock('../../../shared/visibility/useVisibility', () => ({
  useVisibility: (kind: string, onChanged: () => void) => {
    visibility.hooked = { kind, onChanged };
    return { request: visibility.request, dialog: 'dialog-node' };
  },
}));

const handlers = () => ({
  onEdit: vi.fn(),
  onQuickEdit: vi.fn(),
  onDelete: vi.fn(),
  onComplete: vi.fn(),
});

describe('PodActionButtons', () => {
  it('offers complete, quick edit, edit and delete on a live pod, each acting on the pod', async () => {
    const pod = { is_deleted: false };
    const h = handlers();
    render(<PodActionButtons pod={pod} {...h} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    for (const button of buttons) await userEvent.click(button);

    expect(h.onComplete).toHaveBeenCalledWith(pod);
    expect(h.onQuickEdit).toHaveBeenCalledWith(pod);
    expect(h.onEdit).toHaveBeenCalledWith(pod);
    expect(h.onDelete).toHaveBeenCalledWith(pod);
  });

  it('keeps a cancelled pod editable but drops complete and delete, which the server would refuse', () => {
    render(<PodActionButtons pod={{ is_deleted: true }} {...handlers()} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('adds the Hide / Show icon only when the viewer was given a toggle', async () => {
    const onToggleHidden = vi.fn();
    const { rerender } = render(<PodActionButtons pod={{ is_hidden: false }} {...handlers()} />);
    expect(screen.queryByRole('button', { name: 'Hide' })).not.toBeInTheDocument();

    rerender(<PodActionButtons pod={{ is_hidden: false }} {...handlers()} onToggleHidden={onToggleHidden} />);
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);

    rerender(<PodActionButtons pod={{ is_hidden: true }} {...handlers()} onToggleHidden={onToggleHidden} />);
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
  });
});

describe('usePodVisibility', () => {
  beforeEach(() => {
    visibility.request.mockClear();
    access.canGovern = true;
  });

  const row = (over: Partial<PodRow>) => ({ id: 'p1', pod_title: 'Chess', ...over }) as PodRow;

  it('asks to hide a visible pod, naming it, on the pod\'s own flag', () => {
    const onChanged = vi.fn();
    const { result } = renderHook(() => usePodVisibility(onChanged));

    result.current.onToggle?.(row({ is_hidden: false }));
    expect(visibility.request).toHaveBeenCalledWith({ id: 'p1', name: 'Chess', hidden: false });
    expect(visibility.hooked?.kind).toBe('POD');
    expect(visibility.hooked?.onChanged).toBe(onChanged);
    expect(result.current.dialog).toBe('dialog-node');
  });

  it('asks to show a pod hidden on its own, and to hide one hidden only with its club', () => {
    const { result } = renderHook(() => usePodVisibility(vi.fn()));

    result.current.onToggle?.(row({ is_hidden: true }));
    expect(visibility.request).toHaveBeenLastCalledWith({ id: 'p1', name: 'Chess', hidden: true });

    result.current.onToggle?.(row({ is_hidden: false, hidden_by_club: true }));
    expect(visibility.request).toHaveBeenLastCalledWith({ id: 'p1', name: 'Chess', hidden: false });
  });

  it('gives a viewer who cannot govern no toggle at all', () => {
    access.canGovern = false;
    const { result } = renderHook(() => usePodVisibility(vi.fn()));
    expect(result.current.onToggle).toBeUndefined();
  });
});

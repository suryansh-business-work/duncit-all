import { vi } from 'vitest';

/** Stubs for @duncit/dialogs — spies tests can assert on. */

export const notifySuccess = vi.fn();
export const notifyError = vi.fn();
export const notify = vi.fn();

/**
 * A real dialog, not a spy: the pages under test drive their destructive flows
 * through its buttons, so a stub that rendered nothing left them with no way to
 * confirm — and omitting it entirely made the element type `undefined`.
 */
export { ConfirmDialog } from '../../../../../packages/dialogs/src/ConfirmDialog';

export const NotifyHost = () => null;
export const NotifyProvider = ({ children }: any) => children;
export const ConfirmProvider = ({ children }: any) => children;
export const useConfirm = () => vi.fn().mockResolvedValue(true);
export const useNotify = () => ({ notify, notifySuccess, notifyError });

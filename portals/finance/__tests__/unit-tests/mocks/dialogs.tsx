import { vi } from 'vitest';

/** Stubs for @duncit/dialogs — spies tests can assert on. */

export const notifySuccess = vi.fn();
export const notifyError = vi.fn();
export const notify = vi.fn();

export const NotifyHost = () => null;
export const NotifyProvider = ({ children }: any) => children;
export const ConfirmProvider = ({ children }: any) => children;
export const useConfirm = () => vi.fn().mockResolvedValue(true);
export const useNotify = () => ({ notify, notifySuccess, notifyError });

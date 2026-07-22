import { fireAndForget } from '../fire-and-forget';
import { logs } from '@duncit/logs';

jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));

const errorMock = logs.mobileApp.error as jest.Mock;

describe('fireAndForget', () => {
  beforeEach(() => errorMock.mockClear());

  it('leaves a resolving promise alone', async () => {
    const promise = Promise.resolve('ok');
    fireAndForget(promise);
    await expect(promise).resolves.toBe('ok');
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('reports a rejection to the structured logger instead of dropping it', async () => {
    const failure = new Error('upload failed');
    fireAndForget(Promise.reject(failure));
    // Let the rejection settle through the attached catch handler.
    await Promise.resolve();
    await Promise.resolve();
    expect(errorMock).toHaveBeenCalledWith('fire-and-forget', 'fireAndForget', { error: failure });
  });
});

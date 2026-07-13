import { fireAndForget } from '../fire-and-forget';

describe('fireAndForget', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('leaves a resolving promise alone', async () => {
    const promise = Promise.resolve('ok');
    fireAndForget(promise);
    await expect(promise).resolves.toBe('ok');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reports a rejection instead of dropping it', async () => {
    const failure = new Error('upload failed');
    fireAndForget(Promise.reject(failure));
    // Let the rejection settle through the attached catch handler.
    await Promise.resolve();
    await Promise.resolve();
    expect(errorSpy).toHaveBeenCalledWith(failure);
  });
});

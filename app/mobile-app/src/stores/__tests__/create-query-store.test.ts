import { createQueryStore } from '@/stores/create-query-store';

describe('createQueryStore', () => {
  it('fetches once, dedupes, refetches and resets', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce('A').mockResolvedValueOnce('B');
    const useStore = createQueryStore<string>(fetcher);

    await useStore.getState().fetch();
    expect(useStore.getState().data).toBe('A');

    // Already loaded → no second call.
    await useStore.getState().fetch();
    expect(fetcher).toHaveBeenCalledTimes(1);

    // refetch forces a fresh call.
    await useStore.getState().refetch();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(useStore.getState().data).toBe('B');

    useStore.getState().reset();
    expect(useStore.getState().data).toBeUndefined();
  });

  it('captures fetch errors', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    const useStore = createQueryStore<string>(fetcher);
    await useStore.getState().fetch();
    expect(useStore.getState().error).toBeInstanceOf(Error);
    expect(useStore.getState().isLoading).toBe(false);
  });
});

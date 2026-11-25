import { inSequence } from '../../in-sequence';

describe('inSequence', () => {
  it('runs each item only after the one before it has finished, and keeps their order', async () => {
    const log: string[] = [];
    // The first item takes longest: run side by side, it would finish last.
    const delays = [30, 0, 10];
    const results = await inSequence(['a', 'b', 'c'], async (item, index) => {
      log.push(`start ${item}`);
      await new Promise((resolve) => setTimeout(resolve, delays[index]));
      log.push(`end ${item}`);
      return `${item}${index}`;
    });
    expect(results).toEqual(['a0', 'b1', 'c2']);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  it('resolves to an empty list without calling the work when there is nothing to do', async () => {
    const work = jest.fn(async () => 1);
    await expect(inSequence([], work)).resolves.toEqual([]);
    expect(work).not.toHaveBeenCalled();
  });

  it('rejects with the first failure and does not start the items after it', async () => {
    const started: number[] = [];
    const run = inSequence([1, 2, 3], async (item) => {
      started.push(item);
      if (item === 2) throw new Error('two failed');
      return item;
    });
    await expect(run).rejects.toThrow('two failed');
    expect(started).toEqual([1, 2]);
  });
});

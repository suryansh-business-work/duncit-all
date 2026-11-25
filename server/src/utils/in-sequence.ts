/**
 * Runs `work` on each item one after another, in the items' order, and
 * resolves to the results in that order. For work whose order matters, such
 * as one person's messages stored oldest first or the events of one webhook,
 * where running them side by side would race. Independent work belongs in
 * `Promise.all` instead.
 *
 * A failed item rejects the whole run and stops the items after it, so callers
 * that must keep going catch inside `work`.
 */
export function inSequence<T, R>(items: readonly T[], work: (item: T, index: number) => Promise<R>): Promise<R[]> {
  return items.reduce<Promise<R[]>>(
    (done, item, index) => done.then(async (results) => [...results, await work(item, index)]),
    Promise.resolve([])
  );
}

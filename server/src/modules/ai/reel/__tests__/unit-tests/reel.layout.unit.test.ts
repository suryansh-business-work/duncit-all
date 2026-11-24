import { ReelStudioLayoutModel, cleanPanes, reelLayoutService, type ReelStudioPane } from '../../reel.layout';

const pane = (over: Partial<ReelStudioPane> = {}): ReelStudioPane => ({ id: 'SOURCES', mode: 'DOCKED', size: 320.4, x: 10, y: 20, width: 480, height: 560, ...over });
const BAD_INPUT = { extensions: { code: 'BAD_USER_INPUT' } };

afterEach(() => jest.restoreAllMocks());

describe('cleanPanes', () => {
  it('keeps each pane as given, every size a whole pixel', () => {
    expect(cleanPanes([pane(), pane({ id: 'TIMELINE', mode: 'POPPED', size: 0 })])).toEqual([
      { id: 'SOURCES', mode: 'DOCKED', size: 320, x: 10, y: 20, width: 480, height: 560 },
      { id: 'TIMELINE', mode: 'POPPED', size: 0, x: 10, y: 20, width: 480, height: 560 },
    ]);
  });

  it('refuses a pane that does not exist, a mode that does not exist, and a pane listed twice', () => {
    expect(() => cleanPanes([pane({ id: 'SIDEBAR' as ReelStudioPane['id'] })])).toThrow(expect.objectContaining(BAD_INPUT));
    expect(() => cleanPanes([pane({ mode: 'HIDDEN' as ReelStudioPane['mode'] })])).toThrow('docked, popped or closed');
    expect(() => cleanPanes([pane(), pane()])).toThrow('listed twice');
  });

  it.each([
    ['size', -1],
    ['width', 10_001],
    ['x', Number.NaN],
  ] as const)('refuses a %s of %s', (field, value) => {
    expect(() => cleanPanes([pane({ [field]: value })])).toThrow('between 0 and 10000');
  });
});

describe('reelLayoutService', () => {
  const at = new Date('2026-11-24T10:00:00Z');

  it('reads the caller\'s arrangement, or null when they never saved one', async () => {
    const findOne = jest.spyOn(ReelStudioLayoutModel, 'findOne').mockResolvedValueOnce({ panes: [pane()], updated_at: at } as never).mockResolvedValueOnce(null);
    await expect(reelLayoutService.mine('u1')).resolves.toEqual({ panes: [pane()], updated_at: at.toISOString() });
    await expect(reelLayoutService.mine('u2')).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledWith({ user_id: 'u1' });
  });

  it('replaces the caller\'s arrangement with the cleaned panes, creating it the first time', async () => {
    const upsert = jest.spyOn(ReelStudioLayoutModel, 'findOneAndUpdate').mockResolvedValue({ panes: [pane({ size: 320 })], updated_at: at } as never);
    await expect(reelLayoutService.save('u1', [pane()])).resolves.toMatchObject({ updated_at: at.toISOString() });
    expect(upsert).toHaveBeenCalledWith({ user_id: 'u1' }, { $set: { panes: [expect.objectContaining({ size: 320 })] } }, { upsert: true, new: true, runValidators: true });
  });

  it('never writes an arrangement it refused', async () => {
    const upsert = jest.spyOn(ReelStudioLayoutModel, 'findOneAndUpdate');
    await expect(reelLayoutService.save('u1', [pane(), pane()])).rejects.toMatchObject(BAD_INPUT);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('forgets only the caller\'s arrangement', async () => {
    const remove = jest.spyOn(ReelStudioLayoutModel, 'deleteOne').mockResolvedValue({ acknowledged: true, deletedCount: 0 } as never);
    await expect(reelLayoutService.reset('u1')).resolves.toBe(true);
    expect(remove).toHaveBeenCalledWith({ user_id: 'u1' });
  });
});

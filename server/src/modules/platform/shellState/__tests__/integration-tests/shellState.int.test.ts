import { Types } from 'mongoose';
import { shellStateService } from '../../shellState.service';
import { ShellStateModel } from '../../shellState.model';

/**
 * The console arrangement is written straight from a browser, so what matters
 * is that a read always answers a complete shape, that a write touches only the
 * fields it was given, and that nonsense is narrowed rather than stored.
 */
const userId = () => new Types.ObjectId().toString();

describe('shellStateService integration', () => {
  it('answers with defaults for somebody who has never arranged anything', async () => {
    const state = await shellStateService.state(userId());
    expect(state).toEqual({
      agent_edge: 'RIGHT',
      agent_offset: 0.5,
      clock_zone: '',
      clock_seconds: false,
      minimised: [],
    });
  });

  it('writes only the fields it was given', async () => {
    const me = userId();
    await shellStateService.save(me, { agent_edge: 'LEFT', agent_offset: 0.25 });
    const after = await shellStateService.save(me, { clock_zone: 'Asia/Kolkata' });

    expect(after.agent_edge).toBe('LEFT');
    expect(after.agent_offset).toBe(0.25);
    expect(after.clock_zone).toBe('Asia/Kolkata');
    expect(await ShellStateModel.countDocuments({ user_id: me })).toBe(1);
  });

  it('clamps an offset and drops an edge it does not know', async () => {
    const me = userId();
    const state = await shellStateService.save(me, { agent_offset: 40, agent_edge: 'MIDDLE' });
    expect(state.agent_offset).toBe(1);
    expect(state.agent_edge).toBe('RIGHT');

    const low = await shellStateService.save(me, { agent_offset: -3 });
    expect(low.agent_offset).toBe(0);

    // Not a number at all — the field is simply not written.
    const untouched = await shellStateService.save(me, { agent_offset: 'half' });
    expect(untouched.agent_offset).toBe(0);
  });

  it('de-duplicates the minimised list, drops blanks and caps its length', async () => {
    const me = userId();
    const state = await shellStateService.save(me, {
      minimised: ['staff-chat', 'staff-chat', '', 7, 'staff-call'],
    });
    expect(state.minimised).toEqual(['staff-chat', 'staff-call']);

    const many = await shellStateService.save(me, {
      minimised: Array.from({ length: 40 }, (_v, index) => `window-${index}`),
    });
    expect(many.minimised).toHaveLength(20);
  });

  it('trims a zone and stores the seconds flag as given', async () => {
    const me = userId();
    const state = await shellStateService.save(me, {
      clock_zone: '  Europe/London  ',
      clock_seconds: true,
    });
    expect(state.clock_zone).toBe('Europe/London');
    expect(state.clock_seconds).toBe(true);
  });

  it('ignores an empty input rather than blanking the arrangement', async () => {
    const me = userId();
    await shellStateService.save(me, { agent_edge: 'LEFT', clock_seconds: true });
    const after = await shellStateService.save(me, {});
    expect(after.agent_edge).toBe('LEFT');
    expect(after.clock_seconds).toBe(true);
  });
});

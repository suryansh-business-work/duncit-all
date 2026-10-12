import { Types } from 'mongoose';
import { challengeToolService } from '../../tools/challengeTool.service';
import { ChallengeToolModel, ChallengeToolPresetModel } from '../../tools/challengeTool.model';
import { TOOL_DEFINITIONS } from '../../tools/challengeTool.catalogue';

const missingId = () => String(new Types.ObjectId());

async function tool(tool_type: string, extra: Record<string, unknown> = {}) {
  return ChallengeToolModel.create({ tool_type, name: tool_type, ...extra });
}

describe('challengeToolService seeding', () => {
  it('seeds every catalogue tool once and never overwrites admin edits', async () => {
    await challengeToolService.seedDefaults();
    expect(await ChallengeToolModel.countDocuments()).toBe(TOOL_DEFINITIONS.length);
    const timer = TOOL_DEFINITIONS.find((d) => d.type === 'TIMER');
    await ChallengeToolModel.updateOne({ tool_type: 'TIMER' }, { name: 'Edited' });
    await challengeToolService.seedDefaults();
    expect(await ChallengeToolModel.countDocuments()).toBe(TOOL_DEFINITIONS.length);
    const seeded = await ChallengeToolModel.findOne({ tool_type: 'TIMER' });
    expect(seeded?.name).toBe('Edited');
    expect(seeded?.status).toBe(timer?.engine_ready ? 'ACTIVE' : 'INACTIVE');
  });

  it('activates newly runnable tools once, and leaves an admin "off" alone afterwards', async () => {
    await tool('QUIZ', { status: 'INACTIVE', default_config: { stale: true } });
    await tool('POLL', { status: 'INACTIVE', engine_activated: true });
    await tool('TIMER', { status: 'INACTIVE' });
    await challengeToolService.activateNewlyRunnable();
    const quiz = await ChallengeToolModel.findOne({ tool_type: 'QUIZ' });
    expect(quiz?.status).toBe('ACTIVE');
    expect(quiz?.engine_activated).toBe(true);
    expect(quiz?.default_config).not.toHaveProperty('stale');
    expect(quiz?.default_config).toHaveProperty('questions');
    expect((await ChallengeToolModel.findOne({ tool_type: 'POLL' }))?.status).toBe('INACTIVE');
    expect((await ChallengeToolModel.findOne({ tool_type: 'TIMER' }))?.status).toBe('INACTIVE');
  });
});

describe('challengeToolService reads', () => {
  it('lists in sort order with catalogue metadata', async () => {
    await tool('TIMER', { sort_order: 2, status: 'ACTIVE' });
    await tool('SCORE_COUNTER', { sort_order: 1 });
    const list = await challengeToolService.list();
    expect(list.map((t) => t.tool_type)).toEqual(['SCORE_COUNTER', 'TIMER']);
    expect(list[1]).toMatchObject({ engine_ready: true, status: 'ACTIVE', produces_score: true });
    expect(JSON.parse(list[1].config_schema_json).length).toBeGreaterThan(0);
  });

  it('survives a legacy row with an unknown type and no optional fields', async () => {
    await ChallengeToolModel.collection.insertOne({ tool_type: 'LEGACY', name: 'Old', status: 'ACTIVE' } as never);
    const [row] = await challengeToolService.list();
    expect(row).toMatchObject({
      description: '',
      version: 1,
      engine_ready: false,
      live_updates: false,
      produces_score: false,
      input_types: [],
      output_types: [],
      config_schema_json: '[]',
      default_config_json: '{}',
      created_at: '',
      updated_at: '',
    });
  });

  it('getById rejects a malformed id and returns null for a missing one', async () => {
    await expect(challengeToolService.getById('nope')).rejects.toThrow('Invalid id');
    expect(await challengeToolService.getById(missingId())).toBeNull();
    const t = await tool('TIMER');
    expect((await challengeToolService.getById(String(t._id)))?.tool_type).toBe('TIMER');
  });

  it('activeByIds returns only ACTIVE engine-ready tools', async () => {
    const active = await tool('TIMER', { status: 'ACTIVE' });
    const off = await tool('POLL', { status: 'INACTIVE' });
    await ChallengeToolModel.collection.insertOne({ _id: new Types.ObjectId(), tool_type: 'LEGACY', name: 'x', status: 'ACTIVE' } as never);
    const legacy = await ChallengeToolModel.collection.findOne({ tool_type: 'LEGACY' });
    const found = await challengeToolService.activeByIds([String(active._id), String(off._id), String(legacy?._id)]);
    expect(found.map((d) => d.tool_type)).toEqual(['TIMER']);
  });
});

describe('challengeToolService.update', () => {
  it('validates the id and reports a missing tool', async () => {
    await expect(challengeToolService.update('x', {})).rejects.toThrow('Invalid id');
    await expect(challengeToolService.update(missingId(), {})).rejects.toMatchObject({
      message: 'Tool not found',
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('renames, redescribes, normalises config and bumps the version', async () => {
    const t = await tool('SCORE_COUNTER');
    const out = await challengeToolService.update(String(t._id), {
      name: '  Runs  ',
      description: 'Counts runs',
      default_config: { weight: 4, junk: 1 },
      status: 'ACTIVE',
    });
    expect(out).toMatchObject({ name: 'Runs', description: 'Counts runs', status: 'ACTIVE', version: 2 });
    const cfg = JSON.parse(out.default_config_json);
    expect(cfg.weight).toBe(4);
    expect(cfg).not.toHaveProperty('junk');
  });

  it('leaves untouched fields alone when inputs are null', async () => {
    const t = await tool('SCORE_COUNTER', { description: 'keep' });
    const out = await challengeToolService.update(String(t._id), { name: null, description: null, default_config: null, status: null });
    expect(out).toMatchObject({ name: 'SCORE_COUNTER', description: 'keep', version: 1, status: 'INACTIVE' });
  });

  it('refuses a blank name, an invalid config, and activating a roadmap tool', async () => {
    const t = await tool('SCORE_COUNTER');
    await expect(challengeToolService.update(String(t._id), { name: '   ' })).rejects.toThrow('A tool name is required');
    await expect(challengeToolService.update(String(t._id), { default_config: { weight: 9999 } })).rejects.toThrow(
      'weight must be at most 100'
    );
    const legacy = await ChallengeToolModel.collection.insertOne({ tool_type: 'LEGACY', name: 'x', status: 'INACTIVE' } as never);
    await expect(
      challengeToolService.update(String(legacy.insertedId), { status: 'ACTIVE', default_config: null })
    ).rejects.toThrow('This tool is not available yet');
  });
});

describe('challengeToolService presets', () => {
  it('creates a preset normalised against the tool defaults', async () => {
    const t = await tool('SCORE_COUNTER', { default_config: { weight: 2 } });
    const p = await challengeToolService.createPreset({ tool_id: String(t._id), name: ' Cricket ', config: { increments: [1, 4, 6] } });
    expect(p).toMatchObject({ name: 'Cricket', tool_id: String(t._id), version: 1, is_active: true });
    expect(JSON.parse(p.config_json)).toMatchObject({ weight: 2, increments: [1, 4, 6] });
  });

  it('createPreset guards id, tool, name and config', async () => {
    const t = await tool('SCORE_COUNTER');
    await expect(challengeToolService.createPreset({ tool_id: 'x', name: 'a' })).rejects.toThrow('Invalid id');
    await expect(challengeToolService.createPreset({ tool_id: missingId(), name: 'a' })).rejects.toThrow('Tool not found');
    await expect(challengeToolService.createPreset({ tool_id: String(t._id), name: '  ' })).rejects.toThrow(
      'A preset name is required'
    );
    await expect(
      challengeToolService.createPreset({ tool_id: String(t._id), name: 'a', config: { weight: 500 } })
    ).rejects.toThrow('weight must be at most 100');
  });

  it('createPreset works for a tool without stored default_config', async () => {
    const raw = await ChallengeToolModel.collection.insertOne({ tool_type: 'SCORE_COUNTER', name: 'x', status: 'ACTIVE' } as never);
    const p = await challengeToolService.createPreset({ tool_id: String(raw.insertedId), name: 'p', config: null });
    expect(JSON.parse(p.config_json).increments).toEqual([1, 2, 3]);
  });

  it('lists presets filtered by tool, name-ordered, and validates the filter id', async () => {
    const a = await tool('SCORE_COUNTER');
    const b = await tool('TIMER');
    await ChallengeToolPresetModel.create([
      { tool_id: a._id, name: 'Zed' },
      { tool_id: a._id, name: 'Alpha' },
      { tool_id: b._id, name: 'Other' },
    ]);
    expect((await challengeToolService.presets(String(a._id))).map((p) => p.name)).toEqual(['Alpha', 'Zed']);
    expect(await challengeToolService.presets()).toHaveLength(3);
    await expect(challengeToolService.presets('bad')).rejects.toThrow('Invalid id');
  });

  it('presetsByIds returns only active presets', async () => {
    const a = await tool('SCORE_COUNTER');
    const on = await ChallengeToolPresetModel.create({ tool_id: a._id, name: 'on' });
    const off = await ChallengeToolPresetModel.create({ tool_id: a._id, name: 'off', is_active: false });
    const found = await challengeToolService.presetsByIds([String(on._id), String(off._id)]);
    expect(found.map((p) => p.name)).toEqual(['on']);
  });

  it('updatePreset renames, re-normalises, bumps version and toggles activity', async () => {
    const t = await tool('SCORE_COUNTER');
    const p = await ChallengeToolPresetModel.create({ tool_id: t._id, name: 'old', config: { weight: 2 } });
    const out = await challengeToolService.updatePreset(String(p._id), {
      name: ' new ',
      config: { increments: [2] },
      is_active: false,
    });
    expect(out).toMatchObject({ name: 'new', version: 2, is_active: false });
    expect(JSON.parse(out.config_json)).toMatchObject({ weight: 2, increments: [2] });
  });

  it('updatePreset ignores null inputs and guards bad ones', async () => {
    const t = await tool('SCORE_COUNTER');
    const p = await ChallengeToolPresetModel.create({ tool_id: t._id, name: 'keep' });
    const same = await challengeToolService.updatePreset(String(p._id), { name: null, config: null, is_active: null });
    expect(same).toMatchObject({ name: 'keep', version: 1, is_active: true });
    await expect(challengeToolService.updatePreset('x', {})).rejects.toThrow('Invalid id');
    await expect(challengeToolService.updatePreset(missingId(), {})).rejects.toThrow('Preset not found');
    await expect(challengeToolService.updatePreset(String(p._id), { name: ' ' })).rejects.toThrow('A preset name is required');
  });

  it('updatePreset reports a preset whose tool is gone', async () => {
    const p = await ChallengeToolPresetModel.create({ tool_id: new Types.ObjectId(), name: 'orphan' });
    await expect(challengeToolService.updatePreset(String(p._id), { config: { weight: 1 } })).rejects.toThrow('Tool not found');
  });

  it('duplicatePreset copies the config under a "(copy)" name', async () => {
    const t = await tool('SCORE_COUNTER');
    const p = await ChallengeToolPresetModel.create({ tool_id: t._id, name: 'Base', config: { weight: 3 } });
    const copy = await challengeToolService.duplicatePreset(String(p._id));
    expect(copy.id).not.toBe(String(p._id));
    expect(copy.name).toBe('Base (copy)');
    expect(JSON.parse(copy.config_json)).toEqual({ weight: 3 });
    await expect(challengeToolService.duplicatePreset('x')).rejects.toThrow('Invalid id');
    await expect(challengeToolService.duplicatePreset(missingId())).rejects.toThrow('Preset not found');
  });

  it('presets tolerate a legacy row without config or version', async () => {
    const t = await tool('SCORE_COUNTER');
    await ChallengeToolPresetModel.collection.insertOne({ tool_id: t._id, name: 'old' } as never);
    const [row] = await challengeToolService.presets(String(t._id));
    expect(row).toMatchObject({ config_json: '{}', version: 1, is_active: false, updated_at: '' });
  });
});

/**
 * The two helpers around the editor: Claude's draft of a saved step (the
 * model call faked), and the WhatsApp campaigns a step may pick, each marked
 * approved only when AiSensy says so (the Project API faked).
 */
jest.mock('../../../social/social.llm', () => ({
  ...jest.requireActual('../../../social/social.llm'),
  askForJson: jest.fn(),
}));
jest.mock('@modules/platform/aisensy/aisensy.project', () => ({
  isProjectApiConfigured: jest.fn(),
  listCampaigns: jest.fn(),
  listTemplates: jest.fn(),
}));

import { askForJson } from '../../../social/social.llm';
import { isProjectApiConfigured, listCampaigns, listTemplates } from '@modules/platform/aisensy/aisensy.project';
import { WaCampaignNameModel } from '../../../waCampaignName.model';
import { MarketingLeadModel } from '../../../leads/marketingLead.model';
import { outreachService } from '../../outreach.service';
import { draftSequenceStep } from '../../outreach.draft';
import { outreachWaTemplates } from '../../outreach.templates';

const askMock = askForJson as jest.Mock;
const configuredMock = isProjectApiConfigured as jest.Mock;

const saved = () =>
  outreachService.save(
    null,
    {
      name: 'Hosts',
      description: 'Trainers who could host',
      steps: [
        { kind: 'EMAIL', subject: 'Hello', body: 'First note' },
        { kind: 'WAIT', wait_days: 2 },
        { kind: 'DM_TASK', body: 'Hey' },
      ],
      daily_limit: 5,
    },
    { id: 'u1' },
    true
  );

describe('draftSequenceStep', () => {
  it('asks Claude with the sequence, the step, the earlier steps and the lead, and returns the words', async () => {
    const seq = await saved();
    const lead = await MarketingLeadModel.create({ name: 'Paws', company: 'Paws Co', city: 'Pune', source: 'MANUAL' });
    askMock.mockResolvedValue({ subject: 'ignored', body: '  Hi Paws  ' });
    await expect(draftSequenceStep(seq.id, 2, String(lead._id))).resolves.toEqual({ subject: '', body: 'Hi Paws' });
    const call = askMock.mock.calls[0][0];
    expect(call).toMatchObject({ task: 'marketing.outreach_draft', systemKey: 'outreach.step', userKey: 'outreach.step.user' });
    expect(call.variables.step).toBe('Step 3 of 3: an Instagram DM a person will send by hand (body only)');
    expect(call.variables.earlier).toBe('1. EMAIL: Hello — First note');
    expect(call.variables.lead).toBe('Paws, Paws Co, Pune');

    askMock.mockResolvedValue({ subject: 'A subject', body: 'Body' });
    await expect(draftSequenceStep(seq.id, 0, null)).resolves.toEqual({ subject: 'A subject', body: 'Body' });
    expect(askMock.mock.calls[1][0].variables).toMatchObject({ earlier: 'none', lead: 'none — use {name} and {company}' });
  });

  it('refuses a wait, a missing step, an unknown lead and an unreadable answer', async () => {
    const seq = await saved();
    await expect(draftSequenceStep(seq.id, 1)).rejects.toThrow('A wait has no words to draft.');
    await expect(draftSequenceStep(seq.id, 9)).rejects.toThrow('That step does not exist');
    await expect(draftSequenceStep(seq.id, 0, 'nope')).rejects.toThrow('Lead not found');
    askMock.mockResolvedValue({ body: 42 });
    await expect(draftSequenceStep(seq.id, 0)).rejects.toThrow('could not be read');
    await expect(draftSequenceStep('nope', 0)).rejects.toThrow('Sequence not found');
  });
});

describe('outreachWaTemplates', () => {
  it('lists the Communications portal campaigns, approved ones first', async () => {
    await WaCampaignNameModel.create([{ name: 'a_pending', description: 'Pending one' }, { name: 'b_live' }]);
    configuredMock.mockResolvedValue(true);
    (listCampaigns as jest.Mock).mockResolvedValue([
      { name: 'a_pending', template_name: 'tpl_a' },
      { name: 'b_live', template_name: 'tpl_b' },
    ]);
    (listTemplates as jest.Mock).mockResolvedValue([
      { name: 'tpl_a', status: 'PENDING', param_count: 1, body: 'A {{1}}' },
      { name: 'tpl_b', status: 'approved', param_count: 2, body: 'B {{1}} {{2}}' },
    ]);
    await expect(outreachWaTemplates()).resolves.toEqual([
      { key: 'b_live', description: '', template_name: 'tpl_b', status: 'approved', approved: true, param_count: 2, body: 'B {{1}} {{2}}' },
      { key: 'a_pending', description: 'Pending one', template_name: 'tpl_a', status: 'PENDING', approved: false, param_count: 1, body: 'A {{1}}' },
    ]);
  });

  it('marks nothing approved when the Project API is missing or unreadable', async () => {
    await WaCampaignNameModel.create({ name: 'promo' });
    configuredMock.mockResolvedValue(false);
    expect((await outreachWaTemplates())[0]).toMatchObject({ key: 'promo', approved: false, status: '' });
    configuredMock.mockResolvedValue(true);
    (listCampaigns as jest.Mock).mockRejectedValue(new Error('HTTP 401'));
    (listTemplates as jest.Mock).mockResolvedValue([]);
    expect((await outreachWaTemplates())[0]).toMatchObject({ approved: false });
  });
});

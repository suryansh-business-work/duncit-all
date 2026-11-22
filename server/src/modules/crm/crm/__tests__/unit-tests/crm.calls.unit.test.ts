/**
 * Starting a call from any lead page. Newer portals send `entity_type` (any
 * lead kind, including creator and community); older ones still send
 * `entity` (venue / host / ecomm) and must keep working. The result carries
 * the server's reason code so the portal can offer "Configure Twilio".
 */
jest.mock('@modules/crm/call/call.service', () => ({
  callService: { startPortalCall: jest.fn(), startAiCall: jest.fn() },
}));

import { makeContext } from '@test/harness';
import { callService } from '@modules/crm/call/call.service';
import { crmResolvers } from '../../crm.resolver';

const calls = callService as unknown as Record<string, jest.Mock>;
const Mutation = crmResolvers.Mutation as Record<string, (p: unknown, a: Record<string, unknown>, c: unknown) => Promise<unknown>>;
const ctx = () => makeContext({ id: 'agent1', roles: ['CRM_MANAGER'] });
const placed = { ok: true, message: 'Calling', code: null, log: { id: 'log1', external_id: 'CA1' } };

beforeEach(() => {
  calls.startPortalCall.mockResolvedValue(placed);
  calls.startAiCall.mockResolvedValue(placed);
});

describe('startCrmPortalCall', () => {
  it('places a call for a creator lead via entity_type', async () => {
    const result = await Mutation.startCrmPortalCall({}, { entity_type: 'CREATOR_LEAD', id: 'c1', contact_number: '98000' }, ctx());

    expect(calls.startPortalCall).toHaveBeenCalledWith({
      entity_type: 'CREATOR_LEAD',
      entity_id: 'c1',
      to: '98000',
      agent_number: null,
      contact_name: null,
      user_id: 'agent1',
    });
    expect(result).toEqual({ ok: true, message: 'Calling', code: null, log_id: 'log1', external_id: 'CA1' });
  });

  it('still accepts the older entity argument', async () => {
    await Mutation.startCrmPortalCall({}, { entity: 'VENUE_LEAD', id: 'v1', contact_number: '98000', agent_number: '9', contact_name: 'Meera' }, ctx());
    expect(calls.startPortalCall).toHaveBeenCalledWith(expect.objectContaining({ entity_type: 'VENUE_LEAD', agent_number: '9', contact_name: 'Meera' }));
  });

  it('lets entity_type win when both are sent', async () => {
    await Mutation.startCrmPortalCall({}, { entity: 'VENUE_LEAD', entity_type: 'COMMUNITY_LEAD', id: 'x', contact_number: '1' }, ctx());
    expect(calls.startPortalCall).toHaveBeenCalledWith(expect.objectContaining({ entity_type: 'COMMUNITY_LEAD' }));
  });

  it('refuses a call for no lead kind at all', async () => {
    await expect(Mutation.startCrmPortalCall({}, { id: 'x', contact_number: '1' }, ctx())).rejects.toThrow(/entity_type is required/);
    expect(calls.startPortalCall).not.toHaveBeenCalled();
  });

  it('passes the refusal code through with no log', async () => {
    calls.startPortalCall.mockResolvedValue({ ok: false, message: 'Twilio is not configured.', code: 'TWILIO_NOT_CONFIGURED', log: null });

    const result = await Mutation.startCrmPortalCall({}, { entity_type: 'HOST_LEAD', id: 'h1', contact_number: '1' }, ctx());

    expect(result).toEqual({ ok: false, message: 'Twilio is not configured.', code: 'TWILIO_NOT_CONFIGURED', log_id: null, external_id: null });
  });

  it('reports no code when the service gave none', async () => {
    calls.startPortalCall.mockResolvedValue({ ok: true, message: 'ok', log: { id: 'log1' } });
    const result = await Mutation.startCrmPortalCall({}, { entity_type: 'HOST_LEAD', id: 'h1', contact_number: '1' }, ctx());
    expect(result).toEqual({ ok: true, message: 'ok', code: null, log_id: 'log1', external_id: null });
  });

  it('is closed to anyone outside CRM', async () => {
    await expect(
      Mutation.startCrmPortalCall({}, { entity_type: 'HOST_LEAD', id: 'h1', contact_number: '1' }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});

describe('startCrmAiCall', () => {
  it('places an AI call for any lead kind', async () => {
    await Mutation.startCrmAiCall({}, { entity_type: 'ECOMM_LEAD', id: 'e1', contact_number: '98000', prompt_id: 'p1', voice: 'anushka' }, ctx());

    expect(calls.startAiCall).toHaveBeenCalledWith({
      entity_type: 'ECOMM_LEAD',
      entity_id: 'e1',
      to: '98000',
      prompt_id: 'p1',
      voice: 'anushka',
      contact_name: null,
      user_id: 'agent1',
    });
  });

  it('still accepts the older entity argument', async () => {
    await Mutation.startCrmAiCall({}, { entity: 'HOST_LEAD', id: 'h1', contact_number: '1', prompt_id: 'p1', contact_name: 'Bob' }, ctx());
    expect(calls.startAiCall).toHaveBeenCalledWith(expect.objectContaining({ entity_type: 'HOST_LEAD', voice: null, contact_name: 'Bob' }));
  });
});

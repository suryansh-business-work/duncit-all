import { waAutomationResolvers } from '../../whatsapp.resolver';
import { whatsappAdminService } from '../../whatsapp.admin';
import { whatsappPreferenceService } from '../../whatsapp.preference.service';
import { createCampaign, createTemplate, deleteTemplate } from '@modules/platform/aisensy/aisensy.project';
import { LOGS_READER } from '@middleware/rbac';
import { makeContext } from '@test/harness';

jest.mock('../../whatsapp.admin', () => ({
  whatsappAdminService: {
    scenarios: jest.fn(), logById: jest.fn(), defaultMedia: jest.fn(), setEnabled: jest.fn(), reconcile: jest.fn(),
    provision: jest.fn(), setMedia: jest.fn(), setDefaultMedia: jest.fn(),
  },
}));
jest.mock('../../whatsapp.preference.service', () => ({
  whatsappPreferenceService: { mine: jest.fn(), setMine: jest.fn(), setAllMine: jest.fn() },
}));
jest.mock('@modules/platform/aisensy/aisensy.project', () => ({
  createCampaign: jest.fn(), createTemplate: jest.fn(), deleteTemplate: jest.fn(),
}));

const admin = whatsappAdminService as unknown as Record<string, jest.Mock>;
const prefs = whatsappPreferenceService as unknown as Record<string, jest.Mock>;
const Q = waAutomationResolvers.Query as Record<string, (...a: any[]) => any>;
const M = waAutomationResolvers.Mutation as Record<string, (...a: any[]) => any>;
const comms = makeContext({ id: 'c1', roles: ['COMMUNICATIONS_MANAGER'] });
const logsReader = makeContext({ id: 'l1', roles: [LOGS_READER] });
const member = makeContext({ id: 'm1', roles: ['USER'] });
const anonymous = makeContext(null);

beforeEach(() => jest.clearAllMocks());

describe('the Communications console', () => {
  it('reads scenarios and default media, and refuses everyone else', () => {
    Q.whatsappScenarios({}, {}, comms);
    Q.whatsappDefaultMedia({}, {}, comms);
    expect(admin.scenarios).toHaveBeenCalledTimes(1);
    expect(admin.defaultMedia).toHaveBeenCalledTimes(1);
    for (const name of ['whatsappScenarios', 'whatsappDefaultMedia']) {
      expect(() => Q[name]({}, {}, logsReader)).toThrow();
      expect(() => Q[name]({}, {}, member)).toThrow();
    }
  });

  it('opens one message log row for the console and for the Logs console', () => {
    Q.whatsappMessageLog({}, { id: 'r1' }, comms);
    Q.whatsappMessageLog({}, { id: 'r2' }, logsReader);
    expect(admin.logById).toHaveBeenNthCalledWith(1, 'r1');
    expect(admin.logById).toHaveBeenNthCalledWith(2, 'r2');
    expect(() => Q.whatsappMessageLog({}, { id: 'r3' }, member)).toThrow();
  });

  it('switches, reconciles and provisions as the signed-in user', () => {
    M.setWhatsappScenarioEnabled({}, { event_key: 'K', enabled: false }, comms);
    M.reconcileWhatsappScenarios({}, {}, comms);
    M.provisionWhatsappScenario({}, { event_key: 'K' }, comms);
    expect(admin.setEnabled).toHaveBeenCalledWith('K', false, 'c1');
    expect(admin.reconcile).toHaveBeenCalledWith('c1');
    expect(admin.provision).toHaveBeenCalledWith('K', 'c1');
    expect(() => M.setWhatsappScenarioEnabled({}, { event_key: 'K', enabled: true }, member)).toThrow();
    expect(() => M.reconcileWhatsappScenarios({}, {}, member)).toThrow();
    expect(() => M.provisionWhatsappScenario({}, { event_key: 'K' }, member)).toThrow();
  });

  it('sets scenario and default media, an absent filename becoming empty', () => {
    M.setWhatsappScenarioMedia({}, { event_key: 'K', url: 'https://i/x.png', filename: 'x.png' }, comms);
    expect(admin.setMedia).toHaveBeenLastCalledWith('K', 'https://i/x.png', 'x.png', 'c1');
    M.setWhatsappScenarioMedia({}, { event_key: 'K', url: 'https://i/x.png' }, comms);
    expect(admin.setMedia).toHaveBeenLastCalledWith('K', 'https://i/x.png', '', 'c1');
    M.setWhatsappScenarioMedia({}, { event_key: 'K', url: '', filename: null }, comms);
    expect(admin.setMedia).toHaveBeenLastCalledWith('K', '', '', 'c1');
    M.setWhatsappDefaultMedia({}, { kind: 'IMAGE', url: 'https://i/y.png', filename: 'y.png' }, comms);
    expect(admin.setDefaultMedia).toHaveBeenLastCalledWith('IMAGE', 'https://i/y.png', 'y.png', 'c1');
    M.setWhatsappDefaultMedia({}, { kind: 'DOCUMENT', url: '' }, comms);
    expect(admin.setDefaultMedia).toHaveBeenLastCalledWith('DOCUMENT', '', '', 'c1');
    expect(() => M.setWhatsappScenarioMedia({}, { event_key: 'K', url: 'u' }, member)).toThrow();
    expect(() => M.setWhatsappDefaultMedia({}, { kind: 'IMAGE', url: 'u' }, member)).toThrow();
  });
});

describe('AiSensy templates and campaigns', () => {
  const input = { name: 'welcome', category: 'UTILITY', language: 'en', type: 'TEXT', body: 'Hi {{1}}', sample: 'Hi Asha' };

  it('creates a template with the optional header and footer when given, and without when null or absent', () => {
    M.createAisensyTemplate({}, { input: { ...input, header_text: 'Welcome', footer_text: 'Team' } }, comms);
    expect(createTemplate).toHaveBeenLastCalledWith({ ...input, headerText: 'Welcome', footerText: 'Team' });
    M.createAisensyTemplate({}, { input: { ...input, header_text: null, footer_text: null } }, comms);
    expect(createTemplate).toHaveBeenLastCalledWith({ ...input, headerText: undefined, footerText: undefined });
    M.createAisensyTemplate({}, { input }, comms);
    expect(createTemplate).toHaveBeenLastCalledWith({ ...input, headerText: undefined, footerText: undefined });
    expect(() => M.createAisensyTemplate({}, { input }, member)).toThrow();
  });

  it('creates a campaign and deletes a template for the console only', () => {
    M.createAisensyCampaign({}, { input: { template_name: 't', campaign_name: 'c' } }, comms);
    M.deleteAisensyTemplate({}, { template_id: 'tid' }, comms);
    expect(createCampaign).toHaveBeenCalledWith('t', 'c');
    expect(deleteTemplate).toHaveBeenCalledWith('tid');
    expect(() => M.createAisensyCampaign({}, { input: {} }, member)).toThrow();
    expect(() => M.deleteAisensyTemplate({}, { template_id: 'x' }, member)).toThrow();
  });
});

describe('a person’s own switches', () => {
  it('need only a signed-in account, and act on that account', () => {
    Q.myWhatsappPreference({}, {}, member);
    M.setMyWhatsappPreference({}, { category: 'marketing', enabled: false }, member);
    M.setAllMyWhatsappPreferences({}, { enabled: true }, member);
    expect(prefs.mine).toHaveBeenCalledWith('m1');
    expect(prefs.setMine).toHaveBeenCalledWith('m1', 'marketing', false);
    expect(prefs.setAllMine).toHaveBeenCalledWith('m1', true);
  });

  it('refuse a signed-out caller', () => {
    expect(() => Q.myWhatsappPreference({}, {}, anonymous)).toThrow();
    expect(() => M.setMyWhatsappPreference({}, { category: 'marketing', enabled: false }, anonymous)).toThrow();
    expect(() => M.setAllMyWhatsappPreferences({}, { enabled: true }, anonymous)).toThrow();
    expect(prefs.mine).not.toHaveBeenCalled();
  });
});

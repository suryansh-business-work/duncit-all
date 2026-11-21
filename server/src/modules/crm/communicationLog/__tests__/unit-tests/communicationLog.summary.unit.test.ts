/**
 * The summary mutation forces a fresh run (the agent asked for it), and a
 * transcript fetched from a recording starts the automatic summary only
 * when the transcript actually came back.
 */
jest.mock('../../communicationLog.service', () => ({
  communicationLogService: { requestTranscript: jest.fn() },
}));
jest.mock('@modules/crm/call/call.summary', () => ({
  summarizeCall: jest.fn(),
  summarizeCallInBackground: jest.fn(),
}));

import { makeContext } from '@test/harness';
import { communicationLogService } from '../../communicationLog.service';
import { summarizeCall, summarizeCallInBackground } from '@modules/crm/call/call.summary';
import { communicationLogResolvers } from '../../communicationLog.resolver';

const store = communicationLogService as unknown as Record<string, jest.Mock>;
const summarize = summarizeCall as jest.Mock;
const background = summarizeCallInBackground as jest.Mock;
const { Mutation } = communicationLogResolvers;
const crm = () => makeContext({ roles: ['CRM_MANAGER'] });

describe('summarizeCommunicationLog', () => {
  it('forces a run and returns the log', async () => {
    summarize.mockResolvedValue({ id: 'log1', summary: { status: 'READY' } });

    await expect(Mutation.summarizeCommunicationLog({}, { id: 'log1' }, crm())).resolves.toEqual({ id: 'log1', summary: { status: 'READY' } });
    expect(summarize).toHaveBeenCalledWith('log1', { force: true });
  });

  it('answers NOT_FOUND for a log that does not exist', async () => {
    summarize.mockResolvedValue(null);
    await expect(Mutation.summarizeCommunicationLog({}, { id: 'gone' }, crm())).rejects.toThrow(/log not found/i);
  });

  it('is closed to anyone outside CRM', async () => {
    await expect(Mutation.summarizeCommunicationLog({}, { id: 'log1' }, makeContext({ roles: ['USER'] }))).rejects.toThrow(/access denied/i);
    expect(summarize).not.toHaveBeenCalled();
  });
});

describe('requestCommunicationTranscript', () => {
  it('starts the automatic summary once the transcript is ready', async () => {
    store.requestTranscript.mockResolvedValue({ id: 'log1', transcript_status: 'READY' });

    await Mutation.requestCommunicationTranscript({}, { id: 'log1' }, crm());

    expect(background).toHaveBeenCalledWith('log1');
  });

  it.each(['FAILED', 'PENDING'])('starts no summary when the transcript is %s', async (status) => {
    store.requestTranscript.mockResolvedValue({ id: 'log1', transcript_status: status });

    await expect(Mutation.requestCommunicationTranscript({}, { id: 'log1' }, crm())).resolves.toEqual({ id: 'log1', transcript_status: status });
    expect(background).not.toHaveBeenCalled();
  });
});

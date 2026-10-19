import { Types } from 'mongoose';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { notifySupportReply, SUPPORT_CHAT_LINK } from '../../supportChat.notify';
import { ChatMuteModel } from '../../../rooms/chatState.model';

describe('notifySupportReply', () => {
  let fanOut: jest.SpyInstance;

  beforeEach(() => {
    fanOut = jest.spyOn(notificationService, 'fanOutPush').mockResolvedValue({ delivered: 1, failed: 0 });
  });

  afterEach(() => {
    fanOut.mockRestore();
  });

  const reply = (overrides: Partial<Parameters<typeof notifySupportReply>[0]> = {}) => ({
    sessionId: new Types.ObjectId().toString(),
    userId: new Types.ObjectId().toString(),
    messageId: new Types.ObjectId().toString(),
    senderName: 'Priya',
    text: 'We have refunded your booking.',
    hasAttachment: false,
    ...overrides,
  });

  it('pushes the customer once, tagged per session, linking to the support chat', async () => {
    const input = reply();
    await notifySupportReply(input);
    await notifySupportReply(input);
    expect(fanOut).toHaveBeenCalledTimes(1);
    expect(fanOut).toHaveBeenCalledWith(
      {
        _id: `support:${input.messageId}`,
        title: 'Duncit Support',
        body: 'Priya: We have refunded your booking.',
        link_url: SUPPORT_CHAT_LINK,
        tag: `support:${input.sessionId}`,
      },
      [input.userId]
    );
  });

  it('names an attachment-only reply', async () => {
    await notifySupportReply(reply({ text: '  ', hasAttachment: true }));
    expect(fanOut.mock.calls[0][0].body).toBe('Priya: Attachment');
  });

  it('stays silent for a customer who muted their support chat', async () => {
    const input = reply();
    await ChatMuteModel.create({
      user_id: input.userId,
      room_kind: 'SUPPORT',
      room_id: input.sessionId,
      muted_until: null,
    });
    await notifySupportReply(input);
    expect(fanOut).not.toHaveBeenCalled();
  });
});

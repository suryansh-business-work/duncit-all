import { Types } from 'mongoose';
import { chatService } from '../../chat.service';

describe('chatService integration', () => {
  it('returns no chat rooms for a user with no pods', async () => {
    expect(await chatService.listMyChatRooms(new Types.ObjectId().toString())).toEqual([]);
  });
});

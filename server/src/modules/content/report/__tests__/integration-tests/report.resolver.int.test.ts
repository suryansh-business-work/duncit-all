/**
 * The reported-content resolvers invoked directly against a real database:
 * the name columns resolved at read time, filing a report on a post or a
 * profile (the reporter always comes from the session, the snapshot from the
 * stored record), and the Legal-only guard on the desk's reads.
 */
jest.mock('../../report.email', () => ({
  sendReportNotice: jest.fn().mockResolvedValue(undefined),
  sendContentReportMessage: jest.fn().mockResolvedValue(null),
}));

import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';

import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { PostModel } from '@modules/engagement/post/post.model';
import { contentReportResolvers } from '../../report.resolver';
import { reportCategoryService } from '../../reportCategory.service';
import { ContentReportModel } from '../../contentReport.model';

const { ContentReport, ContentReportAction, Query, Mutation } = contentReportResolvers;

async function rejectionOf(run: () => unknown): Promise<GraphQLError> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(GraphQLError);
    return error as GraphQLError;
  }
  throw new Error('expected a rejection');
}

async function insertUser(first: string, last: string, extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await UserModel.collection.insertOne({ _id, profile: { first_name: first, last_name: last, ...extra } });
  return _id;
}

beforeEach(async () => {
  await reportCategoryService.seedDefaults();
});

describe('name columns', () => {
  it('resolves every stored person to their current display name', async () => {
    const reporter = await insertUser('Asha', 'Rao');
    const owner = await insertUser('Vik', 'Das');
    const handler = await insertUser('Lee', 'Legal');

    expect(await ContentReport.reporter_name({ reporter_id: reporter })).toBe('Asha Rao');
    // A string id (as an older row stored it) resolves the same way.
    expect(await ContentReport.target_owner_name({ target_owner_id: owner.toString() })).toBe('Vik Das');
    expect(await ContentReport.handled_by_name({ handled_by: handler })).toBe('Lee Legal');
    expect(await ContentReportAction.by_name({ by: handler })).toBe('Lee Legal');
  });

  it('answers an empty name for no id and for a deleted account', async () => {
    expect(await ContentReport.reporter_name({ reporter_id: null })).toBe('');
    expect(await ContentReport.handled_by_name({})).toBe('');
    expect(await ContentReportAction.by_name({ by: new Types.ObjectId() })).toBe('');
  });
});

describe('reportPost', () => {
  it('files a report described by the stored post, as the signed-in reporter', async () => {
    const author = new Types.ObjectId();
    const postId = new Types.ObjectId();
    await PostModel.collection.insertOne({
      _id: postId,
      author_id: author,
      image_url: 'https://img.example.com/p.jpg',
      caption: 'hello',
    });
    const reporter = new Types.ObjectId().toString();

    const receipt = await Mutation.reportPost(
      null,
      { post_doc_id: postId.toString(), reason: 'SPAM', details: '  spammy  ' },
      makeContext({ id: reporter })
    );

    const stored = await ContentReportModel.findById(receipt.id).lean();
    expect(stored).toMatchObject({
      target_type: 'POST',
      reason: 'SPAM',
      details: 'spammy',
      target_preview_url: 'https://img.example.com/p.jpg',
      target_caption: 'hello',
    });
    expect(String(stored?.reporter_id)).toBe(reporter);
    expect(String(stored?.target_id)).toBe(postId.toString());
    expect(String(stored?.target_owner_id)).toBe(author.toString());
  });

  it('refuses a signed-out caller and files nothing', async () => {
    const err = await rejectionOf(() =>
      Mutation.reportPost(null, { post_doc_id: new Types.ObjectId().toString(), reason: 'SPAM' }, makeContext())
    );
    expect(err.extensions.code).toBe('UNAUTHENTICATED');
    expect(await ContentReportModel.countDocuments()).toBe(0);
  });

  it('refuses a post that does not exist', async () => {
    const err = await rejectionOf(() =>
      Mutation.reportPost(
        null,
        { post_doc_id: new Types.ObjectId().toString(), reason: 'SPAM' },
        makeContext({ id: new Types.ObjectId().toString() })
      )
    );
    expect(err.extensions.code).toBe('NOT_FOUND');
    expect(await ContentReportModel.countDocuments()).toBe(0);
  });
});

describe('reportProfile', () => {
  it('files a report on the profile as it looks now, with the account as its own owner', async () => {
    const target = await insertUser('Riya', 'Sen', { username: 'riya', bio: 'hi there' });
    const reporter = new Types.ObjectId().toString();

    const receipt = await Mutation.reportProfile(
      null,
      { user_id: target.toString(), reason: 'SPAM' },
      makeContext({ id: reporter })
    );

    const stored = await ContentReportModel.findById(receipt.id).lean();
    expect(stored).toMatchObject({ target_type: 'PROFILE', target_caption: 'Riya Sen · @riya\nhi there' });
    expect(String(stored?.target_owner_id)).toBe(target.toString());
    expect(String(stored?.reporter_id)).toBe(reporter);
  });

  it('refuses a report on your own profile', async () => {
    const me = await insertUser('Me', 'Self');
    const err = await rejectionOf(() =>
      Mutation.reportProfile(null, { user_id: me.toString(), reason: 'SPAM' }, makeContext({ id: me.toString() }))
    );
    expect(err.message).toBe('You cannot report your own content');
    expect(await ContentReportModel.countDocuments()).toBe(0);
  });
});

describe('Legal-only desk reads', () => {
  it('serves the queue stats to Legal and refuses everyone else', async () => {
    const stats = await Query.contentReportStats(null, null, makeContext({ roles: ['LEGAL_MANAGER'] }));
    expect(stats.total).toBe(0);

    const member = await rejectionOf(() => Query.contentReportStats(null, null, makeContext({ roles: ['USER'] })));
    expect(member.extensions.code).toBe('FORBIDDEN');
  });
});

import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const MODERATE = gql`
  mutation Moderate($input: ModeratePodContentInput!) {
    moderatePodContent(input: $input) {
      allowed
      violations {
        field
        step
        type
        message
      }
    }
  }
`;

type ModResult = {
  moderatePodContent: {
    allowed: boolean;
    violations: { field: string; step: string; type: string; message: string }[];
  };
};

describe('moderatePodContent e2e', () => {
  it('allows clean pod content', async () => {
    const user = server.client(signToken({ id: new Types.ObjectId().toString(), roles: ['USER'] }));
    const res = await user.request<ModResult>(MODERATE, {
      input: { pod_title: 'Chess night', pod_description: 'A relaxed evening of chess', pod_hashtag: ['chess'] },
    });
    expect(res.moderatePodContent).toEqual({ allowed: true, violations: [] });
  });

  it('blocks content with a phone number, email and payment handle', async () => {
    const user = server.client(signToken({ id: new Types.ObjectId().toString(), roles: ['USER'] }));
    const res = await user.request<ModResult>(MODERATE, {
      input: {
        pod_title: 'Deal',
        pod_description: 'mail me at seller@gmail.com or call 9876543210',
        pod_hashtag: ['paytm'],
      },
    });
    expect(res.moderatePodContent.allowed).toBe(false);
    const types = res.moderatePodContent.violations.map((v) => v.type);
    expect(types).toEqual(expect.arrayContaining(['EMAIL', 'PHONE', 'PAYMENT']));
    expect(res.moderatePodContent.violations.every((v) => v.step === 'REGEX')).toBe(true);
  });

  it('requires authentication', async () => {
    const anon = server.client();
    await expect(
      anon.request(MODERATE, { input: { pod_title: 'x', pod_description: 'y' } })
    ).rejects.toThrow();
  });
});

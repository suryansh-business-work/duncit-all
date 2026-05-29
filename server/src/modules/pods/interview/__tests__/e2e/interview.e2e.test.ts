jest.mock('@services/email/email.service', () => ({
  sendInterviewApplicantEmail: jest.fn().mockResolvedValue(undefined),
  sendInterviewAdminEmail: jest.fn().mockResolvedValue(undefined),
  sendInterviewScheduledEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

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

const CREATE = gql`
  mutation Create($input: CreateInterviewInput!) {
    createInterview(input: $input) {
      id
      status
    }
  }
`;

const input = {
  type: 'HOST',
  applicant_name: 'Asha',
  applicant_email: 'asha@x.com',
  applicant_phone: '+919999999999',
  about: 'Hosting pods',
  preferred_slots: [
    { start: new Date(Date.now() + 86_400_000).toISOString(), end: new Date(Date.now() + 90_000_000).toISOString() },
  ],
};

describe('interview e2e', () => {
  it('lets a user request an interview and see it under myInterviews', async () => {
    const user = server.client(signToken({ id: new Types.ObjectId().toString(), roles: ['USER'] }));
    const created = await user.request<{ createInterview: { status: string } }>(CREATE, { input });
    expect(created.createInterview.status).toBe('PENDING');

    const mine = await user.request<{ myInterviews: unknown[] }>(gql`query { myInterviews { id status } }`);
    expect(mine.myInterviews).toHaveLength(1);
  });

  it('forbids a normal user from the admin interviews list', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { interviews { id } }`)).rejects.toThrow();
  });
});

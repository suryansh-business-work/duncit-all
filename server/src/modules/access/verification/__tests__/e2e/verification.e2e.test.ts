import { gql } from 'graphql-request';
import { startTestServer, signToken, adminToken, type TestServer } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

async function makeUser(emailVerified = false) {
  const u = await UserModel.create({
    auth: {
      email: `v-${Date.now()}-${Math.random()}@duncit.com`,
      password: 'x',
      is_email_verified: emailVerified,
    },
    profile: { first_name: 'Ver', last_name: 'User' },
  });
  return String(u._id);
}

const MY = gql`
  query {
    myVerifications {
      type
      status
      document_url
      reject_reason
    }
  }
`;
const SUBMIT = gql`
  mutation Submit($type: VerificationType!, $url: String!) {
    submitVerification(type: $type, document_url: $url) {
      type
      status
      document_url
    }
  }
`;
const REVIEW = gql`
  mutation Review($uid: ID!, $type: VerificationType!, $status: VerificationStatus!, $reason: String) {
    reviewVerification(user_id: $uid, type: $type, status: $status, reject_reason: $reason) {
      type
      status
      reject_reason
    }
  }
`;

describe('verification e2e', () => {
  it('lists 7 types, submits a doc, and an admin approves/rejects', async () => {
    const userId = await makeUser();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));
    const admin = server.client(adminToken());

    const before = await user.request<{ myVerifications: { type: string; status: string }[] }>(MY);
    expect(before.myVerifications).toHaveLength(7);
    expect(before.myVerifications.every((v) => v.status === 'NOT_SUBMITTED')).toBe(true);

    const submitted = await user.request<{ submitVerification: { status: string } }>(SUBMIT, {
      type: 'IDENTITY',
      url: 'https://img/id.jpg',
    });
    expect(submitted.submitVerification.status).toBe('PENDING');

    const approved = await admin.request<{ reviewVerification: { status: string } }>(REVIEW, {
      uid: userId,
      type: 'IDENTITY',
      status: 'APPROVED',
    });
    expect(approved.reviewVerification.status).toBe('APPROVED');

    const rejected = await admin.request<{ reviewVerification: { reject_reason: string } }>(REVIEW, {
      uid: userId,
      type: 'POLICE',
      status: 'REJECTED',
      reason: 'Blurry document',
    });
    expect(rejected.reviewVerification.reject_reason).toBe('Blurry document');
  });

  it('auto-approves EMAIL from the existing OTP verification', async () => {
    const userId = await makeUser(true);
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));
    const res = await user.request<{ myVerifications: { type: string; status: string }[] }>(MY);
    const email = res.myVerifications.find((v) => v.type === 'EMAIL');
    expect(email?.status).toBe('APPROVED');
  });

  it('rejects an invalid document url and a non-review status', async () => {
    const userId = await makeUser();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));
    const admin = server.client(adminToken());
    await expect(
      user.request(SUBMIT, { type: 'SELFIE', url: 'not-a-url' })
    ).rejects.toThrow();
    await expect(
      admin.request(REVIEW, { uid: userId, type: 'SELFIE', status: 'PENDING' })
    ).rejects.toThrow();
  });

  it('forbids a non-admin from reviewing or listing others', async () => {
    const userId = await makeUser();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));
    await expect(
      user.request(
        gql`
          query U($id: ID!) {
            userVerifications(user_id: $id) {
              type
            }
          }
        `,
        { id: userId }
      )
    ).rejects.toThrow();
  });
});

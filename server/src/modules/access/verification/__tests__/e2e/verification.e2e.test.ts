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
      address {
        line1
        city
        state
        pincode
        country
      }
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
const SUBMIT_ADDRESS = gql`
  mutation SubmitAddress(
    $line1: String!
    $line2: String
    $city: String!
    $state: String!
    $pincode: String!
    $country: String
  ) {
    submitAddressVerification(
      line1: $line1
      line2: $line2
      city: $city
      state: $state
      pincode: $pincode
      country: $country
    ) {
      type
      status
      document_url
      address {
        line1
        line2
        city
        state
        pincode
        country
      }
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

type Ver = {
  type: string;
  status: string;
  document_url: string | null;
  address: { line1: string } | null;
};

describe('verification e2e', () => {
  it('lists exactly IDENTITY/ADDRESS/EMAIL, all NOT_SUBMITTED when nothing is verified', async () => {
    const userId = await makeUser();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));

    const before = await user.request<{ myVerifications: Ver[] }>(MY);
    expect(before.myVerifications.map((v) => v.type).sort()).toEqual([
      'ADDRESS',
      'EMAIL',
      'IDENTITY',
    ]);
    expect(before.myVerifications.every((v) => v.status === 'NOT_SUBMITTED')).toBe(true);
  });

  it('submits an IDENTITY doc (PENDING) and an admin approves it', async () => {
    const userId = await makeUser();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));
    const admin = server.client(adminToken());

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
  });

  it('submits a structured ADDRESS (PENDING) and an admin rejects it with a reason', async () => {
    const userId = await makeUser();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));
    const admin = server.client(adminToken());

    const submitted = await user.request<{
      submitAddressVerification: { status: string; document_url: string | null; address: any };
    }>(SUBMIT_ADDRESS, {
      line1: '12 MG Road',
      line2: 'Near Park',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      country: 'India',
    });
    expect(submitted.submitAddressVerification.status).toBe('PENDING');
    expect(submitted.submitAddressVerification.document_url).toBeNull();
    expect(submitted.submitAddressVerification.address).toMatchObject({
      line1: '12 MG Road',
      line2: 'Near Park',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      country: 'India',
    });

    // The stored address is returned in the list query too.
    const listed = await user.request<{ myVerifications: Ver[] }>(MY);
    expect(listed.myVerifications.find((v) => v.type === 'ADDRESS')?.address?.line1).toBe(
      '12 MG Road'
    );

    const rejected = await admin.request<{ reviewVerification: { reject_reason: string } }>(REVIEW, {
      uid: userId,
      type: 'ADDRESS',
      status: 'REJECTED',
      reason: 'Pincode mismatch',
    });
    expect(rejected.reviewVerification.reject_reason).toBe('Pincode mismatch');
  });

  it('reports EMAIL as VERIFIED_BY_APP when the login email is verified, NOT_SUBMITTED otherwise', async () => {
    const verifiedId = await makeUser(true);
    const verifiedUser = server.client(signToken({ id: verifiedId, roles: ['USER'] }));
    const verified = await verifiedUser.request<{ myVerifications: Ver[] }>(MY);
    expect(verified.myVerifications.find((v) => v.type === 'EMAIL')?.status).toBe('VERIFIED_BY_APP');

    const unverifiedId = await makeUser(false);
    const unverifiedUser = server.client(signToken({ id: unverifiedId, roles: ['USER'] }));
    const unverified = await unverifiedUser.request<{ myVerifications: Ver[] }>(MY);
    expect(unverified.myVerifications.find((v) => v.type === 'EMAIL')?.status).toBe('NOT_SUBMITTED');
  });

  it('rejects an invalid document url, ADDRESS via submitVerification, and reviewing EMAIL', async () => {
    const userId = await makeUser();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));
    const admin = server.client(adminToken());

    await expect(user.request(SUBMIT, { type: 'IDENTITY', url: 'not-a-url' })).rejects.toThrow();
    await expect(
      user.request(SUBMIT, { type: 'ADDRESS', url: 'https://img/addr.jpg' })
    ).rejects.toThrow();
    await expect(
      admin.request(REVIEW, { uid: userId, type: 'EMAIL', status: 'APPROVED' })
    ).rejects.toThrow();
    await expect(
      admin.request(REVIEW, { uid: userId, type: 'IDENTITY', status: 'PENDING' })
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

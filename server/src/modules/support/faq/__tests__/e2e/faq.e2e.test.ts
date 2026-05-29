import { gql } from 'graphql-request';
import { startTestServer, adminToken, type TestServer } from '@test/harness';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.stop();
});

const CREATE = gql`
  mutation Create($input: CreateFaqInput!) {
    createFaq(input: $input) {
      id
      question
      answer
      audience
    }
  }
`;

const LIST = gql`
  query {
    faqs {
      id
      question
    }
  }
`;

describe('faq e2e', () => {
  it('creates a faq as admin and lists it over HTTP', async () => {
    const admin = server.client(adminToken());
    const created = await admin.request<{ createFaq: { id: string; question: string } }>(CREATE, {
      input: { question: 'E2E question?', answer: 'E2E answer.' },
    });
    expect(created.createFaq.id).toBeTruthy();

    const pub = server.client();
    const listed = await pub.request<{ faqs: Array<{ id: string; question: string }> }>(LIST);
    expect(listed.faqs).toHaveLength(1);
    expect(listed.faqs[0].question).toBe('E2E question?');
  });

  it('rejects createFaq without an auth token', async () => {
    const pub = server.client();
    await expect(
      pub.request(CREATE, { input: { question: 'x', answer: 'y' } })
    ).rejects.toThrow();
  });
});

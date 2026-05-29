import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const CREATE = gql`
  mutation Create($input: CreateLegalDocumentInput!) {
    createLegalDocument(input: $input) {
      id
      name
      document_type
    }
  }
`;
const LIST = gql`
  query {
    legalDocuments {
      id
      name
    }
  }
`;

describe('legalDocument e2e', () => {
  it('lets a legal manager create and list documents', async () => {
    const legal = server.client(signToken({ roles: ['LEGAL_MANAGER'] }));
    const created = await legal.request<{ createLegalDocument: { name: string } }>(CREATE, {
      input: { name: 'Partner Agreement', document_type: 'MSA' },
    });
    expect(created.createLegalDocument.name).toBe('Partner Agreement');

    const list = await legal.request<{ legalDocuments: unknown[] }>(LIST);
    expect(list.legalDocuments).toHaveLength(1);
  });

  it('forbids a non-legal user from listing documents', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(LIST)).rejects.toThrow();
  });
});

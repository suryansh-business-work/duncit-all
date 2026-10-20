import { print } from 'graphql';
import { TRUECALLER_REQUEST_TTL_MS, TruecallerRequestModel } from '../../truecaller.model';
import { truecallerTypeDefs } from '../../truecaller.schema';

describe('TruecallerRequestModel', () => {
  const paths = TruecallerRequestModel.schema.paths;

  it('keys every request uniquely, so a nonce or an iOS profile can be recorded only once', () => {
    expect(paths.key.options).toMatchObject({ required: true, unique: true });
  });

  it('never reads the posted access token back unless asked for', () => {
    expect(paths.access_token.options.select).toBe(false);
  });

  it('starts a request PENDING and allows only the four handshake states', () => {
    expect(paths.state.options.default).toBe('PENDING');
    expect(paths.state.options.enum).toEqual(['PENDING', 'READY', 'REJECTED', 'USED']);
    expect(paths.kind.options.enum).toEqual(['WEB', 'IOS']);
  });

  it('lets Mongo drop a request an hour after it expires; a request lives ten minutes', () => {
    expect(paths.expires_at.options.index).toEqual({ expireAfterSeconds: 3600 });
    expect(TRUECALLER_REQUEST_TTL_MS).toBe(10 * 60 * 1000);
  });

  it('rejects a document with an unknown kind', () => {
    const doc = new TruecallerRequestModel({ key: 'k', kind: 'ANDROID', expires_at: new Date() });
    expect(doc.validateSync()?.errors.kind).toBeDefined();
  });
});

describe('truecallerTypeDefs', () => {
  it('declares the three operations both apps call', () => {
    const sdl = print(truecallerTypeDefs);
    expect(sdl).toContain('loginWithTruecaller(input: TruecallerAuthInput!): TruecallerAuthResult!');
    expect(sdl).toContain('startTruecallerWebLogin(intent: TruecallerIntent!, lang: String): TruecallerWebRequest!');
    expect(sdl).toContain('truecallerWebState(request_nonce: String!): TruecallerWebState!');
  });
});

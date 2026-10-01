import { probeDriveAccount } from '@modules/ai/reel/reel.drive';
import { googleDriveConnection } from '../../envEntry.connection';

jest.mock('@modules/ai/reel/reel.drive', () => ({ probeDriveAccount: jest.fn() }));

const mockProbe = probeDriveAccount as jest.Mock;
const EMAIL = 'reels@duncit-drive.iam.gserviceaccount.com';

/** The entry's fields, read the way the connection test reads them. */
const entry = (fields: Record<string, string>) => (name: string) => fields[name] ?? '';

describe('googleDriveConnection', () => {
  it('asks for the key before trying anything', async () => {
    await expect(googleDriveConnection(entry({}))).resolves.toEqual({
      ok: false,
      message: 'The service account key is required',
      details: [],
    });
    expect(mockProbe).not.toHaveBeenCalled();
  });

  it('names the account to share folders with once Drive accepts the key', async () => {
    mockProbe.mockResolvedValue(EMAIL);
    const result = await googleDriveConnection(entry({ service_account_json: '{"type":"service_account"}' }));
    expect(mockProbe).toHaveBeenCalledWith('{"type":"service_account"}');
    expect(result.ok).toBe(true);
    expect(result.message).toBe(`Connected to Google Drive as ${EMAIL}`);
    expect(result.details[0]).toContain(EMAIL);
  });

  it.each([
    [new Error('Google Drive refused the request (HTTP 403): Drive API has not been used'), 'Google Drive refused the request (HTTP 403): Drive API has not been used'],
    ['socket hang up', 'socket hang up'],
  ])('repeats why the key was refused: %p', async (failure, message) => {
    mockProbe.mockRejectedValue(failure);
    const result = await googleDriveConnection(entry({ service_account_json: '{"type":"service_account"}' }));
    expect(result).toMatchObject({ ok: false, message });
    expect(result.details[0]).toContain('enable the Google Drive API');
  });
});

import { userService } from '../../user.service';

describe('userService integration', () => {
  it('rejects login for a non-existent account', async () => {
    await expect(
      userService.login({ email: 'nobody@duncit.com', password: 'whatever' } as any)
    ).rejects.toThrow();
  });

  it('rejects registration that is missing required fields', async () => {
    await expect(
      userService.register({ email: 'incomplete@duncit.com', password: 'StrongPass123' } as any)
    ).rejects.toThrow();
  });
});

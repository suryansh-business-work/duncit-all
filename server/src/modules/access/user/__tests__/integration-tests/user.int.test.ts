// Stub the email transport: register() fires a welcome email as fire-and-forget,
// which otherwise hits Mongo after the per-suite teardown closes the client and
// surfaces a spurious unhandled rejection (non-zero exit despite green tests).
jest.mock("@services/email/email.service", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminCredentialsEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailVerificationOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminAccessGrantedEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminAccessRevokedEmail: jest.fn().mockResolvedValue(undefined),
}));

import { userService } from "../../user.service";

describe("userService integration", () => {
  it("rejects login for a non-existent account", async () => {
    await expect(
      userService.login({
        email: "nobody@duncit.com",
        password: "whatever",
      } as any),
    ).rejects.toThrow();
  });

  it("rejects registration that is missing required fields", async () => {
    await expect(
      userService.register({
        email: "incomplete@duncit.com",
        password: "StrongPass123",
      } as any),
    ).rejects.toThrow();
  });

  it("registers an account without a phone number (simplified signup)", async () => {
    const res = await userService.register({
      first_name: "Riya",
      last_name: "Sharma",
      email: "nophone@duncit.com",
      password: "StrongPass123",
      dob: new Date("1995-01-01").toISOString(),
    } as any);
    expect(res.token).toBeTruthy();
    expect(res.user.email).toBe("nophone@duncit.com");
    // No phone collected -> resolver falls back to empty string, not null.
    expect(res.user.phone_number).toBe("");
  });

  it("registers an account with a single-word name (no last_name)", async () => {
    const res = await userService.register({
      first_name: "Madonna",
      email: "oneword@duncit.com",
      password: "StrongPass123",
      dob: new Date("1990-06-15").toISOString(),
    } as any);
    expect(res.token).toBeTruthy();
    expect(res.user.first_name).toBe("Madonna");
    expect(res.user.last_name).toBe("");
  });

  it("allows multiple phone-less accounts without unique-index collisions", async () => {
    const a = await userService.register({
      first_name: "NoPhoneOne",
      email: "nophone1@duncit.com",
      password: "StrongPass123",
      dob: new Date("1992-03-03").toISOString(),
    } as any);
    const b = await userService.register({
      first_name: "NoPhoneTwo",
      email: "nophone2@duncit.com",
      password: "StrongPass123",
      dob: new Date("1993-04-04").toISOString(),
    } as any);
    expect(a.user.user_id).toBeTruthy();
    expect(b.user.user_id).toBeTruthy();
    expect(a.user.user_id).not.toBe(b.user.user_id);
  });

  it("stores an optional phone when supplied", async () => {
    const res = await userService.register({
      first_name: "WithPhone",
      email: "with-phone@duncit.com",
      password: "StrongPass123",
      dob: new Date("1992-02-02").toISOString(),
      phone_number: "9876500001",
      phone_extension: "+91",
    } as any);
    expect(res.user.phone_number).toBe("9876500001");
  });

  it("enforces phone uniqueness only when a phone is supplied", async () => {
    await userService.register({
      first_name: "PhoneOwner",
      email: "phone-owner@duncit.com",
      password: "StrongPass123",
      dob: new Date("1990-01-01").toISOString(),
      phone_number: "9876512345",
      phone_extension: "+91",
    } as any);

    await expect(
      userService.register({
        first_name: "PhoneDup",
        email: "phone-dup@duncit.com",
        password: "StrongPass123",
        dob: new Date("1990-01-01").toISOString(),
        phone_number: "9876512345",
        phone_extension: "+91",
      } as any),
    ).rejects.toThrow(/already registered/i);
  });

  it("logs in successfully with the correct credentials", async () => {
    await userService.register({
      first_name: "Login",
      email: "login-ok@duncit.com",
      password: "StrongPass123",
      dob: new Date("1991-01-01").toISOString(),
    } as any);

    const res = await userService.login({
      email: "login-ok@duncit.com",
      password: "StrongPass123",
    } as any);

    expect(res.token).toBeTruthy();
    expect(res.user.email).toBe("login-ok@duncit.com");
  });

  it("rejects login with an incorrect password", async () => {
    await userService.register({
      first_name: "BadPass",
      email: "login-bad@duncit.com",
      password: "StrongPass123",
      dob: new Date("1991-02-02").toISOString(),
    } as any);

    await expect(
      userService.login({
        email: "login-bad@duncit.com",
        password: "WrongPass999",
      } as any),
    ).rejects.toThrow(/invalid credentials/i);
  });

  it("rejects registering a duplicate email", async () => {
    await userService.register({
      first_name: "Dup",
      email: "dup@duncit.com",
      password: "StrongPass123",
      dob: new Date("1990-01-01").toISOString(),
    } as any);

    await expect(
      userService.register({
        first_name: "DupTwo",
        email: "dup@duncit.com",
        password: "StrongPass123",
        dob: new Date("1990-01-01").toISOString(),
      } as any),
    ).rejects.toThrow();
  });

  it("protects the root super admin from revocation", async () => {
    await userService.register({
      first_name: "Root",
      email: "admin@duncit.com",
      password: "StrongPass123",
      dob: new Date("1990-01-01").toISOString(),
    } as any);
    const root = await userService.list({ search: "admin@duncit.com" });
    await expect(userService.revokeAdmin(root[0]!.user_id)).rejects.toThrow(/root super admin/i);
  });
});

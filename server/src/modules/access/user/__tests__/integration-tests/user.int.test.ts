// Stub the email transport: register() fires a welcome email as fire-and-forget,
// which otherwise hits Mongo after the per-suite teardown closes the client and
// surfaces a spurious unhandled rejection (non-zero exit despite green tests).
jest.mock("@services/email/email.service", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminCredentialsEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailVerificationOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminAccessGrantedEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminAccessRevokedEmail: jest.fn().mockResolvedValue(undefined),
}));

import { userService } from "../../user.service";
import { UserModel } from "../../user.model";
import { RoleModel } from "@modules/access/rbac/rbac.model";
import { LocationModel } from "@modules/platform/location/location.model";
import { Types } from "mongoose";

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

  describe("password reset", () => {
    it("resets the password end-to-end via OTP and logs in with the new one", async () => {
      await userService.register({
        first_name: "Reset",
        email: "reset-ok@duncit.com",
        password: "OldPass123",
        dob: new Date("1991-01-01").toISOString(),
      } as any);

      const req = await userService.requestPasswordResetOtp({ email: "reset-ok@duncit.com" } as any);
      expect(req.ok).toBe(true);
      expect(req.dev_otp).toMatch(/^\d{6}$/);

      const done = await userService.resetPasswordWithOtp({
        email: "reset-ok@duncit.com",
        otp: req.dev_otp as string,
        new_password: "BrandNew123",
      } as any);
      expect(done).toBe(true);

      const res = await userService.login({
        email: "reset-ok@duncit.com",
        password: "BrandNew123",
      } as any);
      expect(res.token).toBeTruthy();
      await expect(
        userService.login({ email: "reset-ok@duncit.com", password: "OldPass123" } as any),
      ).rejects.toThrow(/invalid credentials/i);
    });

    it("returns ok without an OTP for an unknown email (no enumeration)", async () => {
      const req = await userService.requestPasswordResetOtp({ email: "ghost@duncit.com" } as any);
      expect(req).toEqual({ ok: true, dev_otp: null });
    });

    it("rejects a wrong OTP", async () => {
      await userService.register({
        first_name: "WrongOtp",
        email: "reset-wrong@duncit.com",
        password: "OldPass123",
        dob: new Date("1991-01-01").toISOString(),
      } as any);
      await userService.requestPasswordResetOtp({ email: "reset-wrong@duncit.com" } as any);
      await expect(
        userService.resetPasswordWithOtp({
          email: "reset-wrong@duncit.com",
          otp: "000000",
          new_password: "BrandNew123",
        } as any),
      ).rejects.toThrow(/invalid otp/i);
    });

    it("rejects a reset when no OTP was requested", async () => {
      await userService.register({
        first_name: "NoOtp",
        email: "reset-none@duncit.com",
        password: "OldPass123",
        dob: new Date("1991-01-01").toISOString(),
      } as any);
      await expect(
        userService.resetPasswordWithOtp({
          email: "reset-none@duncit.com",
          otp: "123456",
          new_password: "BrandNew123",
        } as any),
      ).rejects.toThrow(/otp expired/i);
    });

    it("rejects a reset for an unknown email", async () => {
      await expect(
        userService.resetPasswordWithOtp({
          email: "ghost2@duncit.com",
          otp: "123456",
          new_password: "BrandNew123",
        } as any),
      ).rejects.toThrow(/invalid otp/i);
    });
  });

  describe("selected location", () => {
    const newUser = async (email: string) => {
      const res = await userService.register({
        first_name: "Loc",
        email,
        password: "StrongPass123",
        dob: new Date("1990-01-01").toISOString(),
      } as any);
      return res.user.user_id;
    };

    it("persists, then clears, the user's selected location", async () => {
      const userId = await newUser("loc-set@duncit.com");
      const loc = await LocationModel.create({
        location_id: "mumbai",
        location_name: "Mumbai",
        country: "India",
        country_code: "IN",
        city: "Mumbai",
        location_image: "https://img/mumbai.jpg",
        location_pincode: "400001",
      });

      const set = await userService.setMySelectedLocation(userId, String(loc._id));
      expect(set!.selected_location_id).toBe(String(loc._id));

      const me = await userService.me(userId);
      expect(me!.selected_location_id).toBe(String(loc._id));

      const cleared = await userService.setMySelectedLocation(userId, null);
      expect(cleared!.selected_location_id).toBeNull();
    });

    it("rejects an invalid or unknown location id", async () => {
      const userId = await newUser("loc-bad@duncit.com");
      await expect(userService.setMySelectedLocation(userId, "not-an-id")).rejects.toThrow(
        /invalid location/i,
      );
      await expect(
        userService.setMySelectedLocation(userId, new Types.ObjectId().toString()),
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("list search by role (B10)", () => {
    it("matches users by Role name via metadata.role_keys", async () => {
      await RoleModel.create({ key: "CRM_MANAGER", name: "CRM Manager", is_system: true });

      const res = await userService.register({
        first_name: "Crm",
        email: "crm-person@duncit.com",
        password: "StrongPass123",
        dob: new Date("1990-01-01").toISOString(),
      } as any);
      await UserModel.updateOne(
        { _id: res.user.user_id },
        { $set: { "metadata.role_keys": ["USER", "CRM_MANAGER"] } },
      );

      // Resolvable by the Role's display name...
      const byName = await userService.list({ search: "CRM Manager" });
      expect(byName.map((u) => u.user_id)).toContain(res.user.user_id);

      // ...and by the role key itself.
      const byKey = await userService.list({ search: "CRM_MANAGER" });
      expect(byKey.map((u) => u.user_id)).toContain(res.user.user_id);

      // The match is driven by the denormalized role_keys cache.
      const stored = await UserModel.findById(res.user.user_id)
        .select("metadata.role_keys")
        .lean();
      expect((stored as any).metadata.role_keys).toContain("CRM_MANAGER");
    });

    it("escapes regex special characters in the search term", async () => {
      await userService.register({
        first_name: "Regex",
        email: "regex-test@duncit.com",
        password: "StrongPass123",
        dob: new Date("1990-01-01").toISOString(),
      } as any);
      // '.*' must be treated literally, not as a wildcard that matches everyone.
      const res = await userService.list({ search: ".*" });
      expect(res).toHaveLength(0);
    });
  });

  describe("update persists state + pincode (B15)", () => {
    it("stores and returns profile.state and profile.pincode", async () => {
      const reg = await userService.register({
        first_name: "Addr",
        email: "addr@duncit.com",
        password: "StrongPass123",
        dob: new Date("1990-01-01").toISOString(),
      } as any);

      const updated = await userService.update(reg.user.user_id, {
        state: "Maharashtra",
        pincode: "400001",
      } as any);
      expect(updated!.state).toBe("Maharashtra");
      expect(updated!.pincode).toBe("400001");

      const me = await userService.me(reg.user.user_id);
      expect(me!.state).toBe("Maharashtra");
      expect(me!.pincode).toBe("400001");
    });
  });
});

// Stub the email transport: register() fires a welcome email as fire-and-forget,
// which otherwise hits Mongo after the per-suite teardown closes the client and
// surfaces a spurious unhandled rejection (non-zero exit despite green tests).
//
// Every sender, read off the real module rather than listed here. A named
// list goes stale the moment a sender is added: the missing export arrives
// undefined and the call site throws "is not a function", which is exactly
// what sendPasswordChangedEmail did to four tests here.
jest.mock("@services/email/email.service", () => {
  const actual = jest.requireActual("@services/email/email.service");
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [
      key,
      typeof value === "function" ? jest.fn().mockResolvedValue(undefined) : value,
    ]),
  );
});

import { userService } from "../../user.service";
import { accountDeletionService } from "@modules/access/accountDeletion/accountDeletion.service";
import { UserModel } from "../../user.model";
import { UserRoleModel } from "../../relations";
import { RoleModel } from "@modules/access/role/rbac.model";
import { LocationModel } from "@modules/platform/location/location.model";
import { Types } from "mongoose";
import { whatsappAuthService } from "@modules/access/auth-whatsapp/auth-whatsapp.service";

/**
 * A number that has ANSWERED its signup code, minted the way the app mints
 * one: request the code, read it back, trade it for the proof. Signup redeems
 * that proof for real, so a made-up token is refused — and going through the
 * door means these fixtures keep working when the door changes.
 */
let phoneSeq = 0;
const provenNumber = async () => {
  const phone_extension = "+91";
  phoneSeq += 1;
  const phone_number = String(9000000000 + phoneSeq);
  const requested = await whatsappAuthService.requestSignupOtp(phone_extension, phone_number, "");
  const { whatsapp_token } = await whatsappAuthService.verifySignupOtp(
    phone_extension,
    phone_number,
    String(requested.dev_otp),
  );
  return { phone_extension, phone_number, whatsapp_token };
};

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

  it("registers an account and reports the number it was signed up with", async () => {
    const proven = await provenNumber();
    const res = await userService.register({
      ...proven,
      first_name: "Riya",
      last_name: "Sharma",
      email: "nophone@duncit.com",
      password: "StrongPass123",
      dob: new Date("1995-01-01").toISOString(),
    } as any);
    expect(res.token).toBeTruthy();
    expect(res.user.email).toBe("nophone@duncit.com");
    // Signup requires a verified number: the account is identified by it as
    // well as by the email, and the unique index only means something if
    // every account created through this door carries one.
    expect(res.user.phone_number).toBe(proven.phone_number);
  });

  it("registers an account with a single-word name (no last_name)", async () => {
    const res = await userService.register({
      ...(await provenNumber()),
      first_name: "Madonna",
      email: "oneword@duncit.com",
      password: "StrongPass123",
      dob: new Date("1990-06-15").toISOString(),
    } as any);
    expect(res.token).toBeTruthy();
    expect(res.user.first_name).toBe("Madonna");
    expect(res.user.last_name).toBe("");
  });

  it("keeps two accounts apart when each brings its own number", async () => {
    const a = await userService.register({
      ...(await provenNumber()),
      first_name: "NoPhoneOne",
      email: "nophone1@duncit.com",
      password: "StrongPass123",
      dob: new Date("1992-03-03").toISOString(),
    } as any);
    const b = await userService.register({
      ...(await provenNumber()),
      first_name: "NoPhoneTwo",
      email: "nophone2@duncit.com",
      password: "StrongPass123",
      dob: new Date("1993-04-04").toISOString(),
    } as any);
    expect(a.user.user_id).toBeTruthy();
    expect(b.user.user_id).toBeTruthy();
    expect(a.user.user_id).not.toBe(b.user.user_id);
  });

  it("stores the number the account was signed up with", async () => {
    const proven = await provenNumber();
    const res = await userService.register({
      ...proven,
      first_name: "WithPhone",
      email: "with-phone@duncit.com",
      password: "StrongPass123",
      dob: new Date("1992-02-02").toISOString(),
    } as any);
    expect(res.user.phone_number).toBe(proven.phone_number);
  });

  // One proof opens ONE account: the second attempt is refused for the
  // number already having one, before the grant is even looked at.
  it("refuses a second account on a number that already has one", async () => {
    const proven = await provenNumber();
    await userService.register({
      ...proven,
      first_name: "PhoneOwner",
      email: "phone-owner@duncit.com",
      password: "StrongPass123",
      dob: new Date("1990-01-01").toISOString(),
    } as any);

    await expect(
      userService.register({
        ...proven,
        first_name: "PhoneDup",
        email: "phone-dup@duncit.com",
        password: "StrongPass123",
        dob: new Date("1990-01-01").toISOString(),
      } as any),
    ).rejects.toThrow(/already registered/i);
  });

  it("logs in successfully with the correct credentials", async () => {
    await userService.register({
      ...(await provenNumber()),
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
      ...(await provenNumber()),
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
    ).rejects.toThrow(/invalid email or password/i);
  });

  it("rejects registering a duplicate email", async () => {
    await userService.register({
      ...(await provenNumber()),
      first_name: "Dup",
      email: "dup@duncit.com",
      password: "StrongPass123",
      dob: new Date("1990-01-01").toISOString(),
    } as any);

    await expect(
      userService.register({
        ...(await provenNumber()),
        first_name: "DupTwo",
        email: "dup@duncit.com",
        password: "StrongPass123",
        dob: new Date("1990-01-01").toISOString(),
      } as any),
    ).rejects.toThrow();
  });

  it("protects the root super admin from revocation", async () => {
    await userService.register({
      ...(await provenNumber()),
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
        ...(await provenNumber()),
        first_name: "Reset",
        email: "reset-ok@duncit.com",
        password: "OldPass123",
        dob: new Date("1991-01-01").toISOString(),
      } as any);

      const req = await userService.requestPasswordResetOtp({ email: "reset-ok@duncit.com" } as any);
      expect(req.ok).toBe(true);
      expect(req.registered).toBe(true);
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
      ).rejects.toThrow(/invalid email or password/i);
    });

    it("reports an unregistered email and sends no OTP", async () => {
      const req = await userService.requestPasswordResetOtp({ email: "ghost@duncit.com" } as any);
      expect(req).toEqual({ ok: false, registered: false, dev_otp: null });
    });

    it("rejects a wrong OTP", async () => {
      await userService.register({
        ...(await provenNumber()),
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
        ...(await provenNumber()),
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

  describe("change password (knows current password)", () => {
    const registerUser = async (email: string, password = "OldPass123") => {
      const res = await userService.register({
        ...(await provenNumber()),
        first_name: "Change",
        email,
        password,
        dob: new Date("1991-01-01").toISOString(),
      } as any);
      return res.user.user_id;
    };

    it("changes the password end-to-end via OTP and logs in with the new one", async () => {
      const userId = await registerUser("change-ok@duncit.com");

      const req = await userService.requestPasswordChangeOtp(userId, {
        current_password: "OldPass123",
      } as any);
      expect(req.ok).toBe(true);
      expect(req.dev_otp).toMatch(/^\d{6}$/);

      const done = await userService.changePasswordWithOtp(userId, {
        otp: req.dev_otp as string,
        new_password: "BrandNew123",
      } as any);
      expect(done).toBe(true);

      const res = await userService.login({
        email: "change-ok@duncit.com",
        password: "BrandNew123",
      } as any);
      expect(res.token).toBeTruthy();
      await expect(
        userService.login({ email: "change-ok@duncit.com", password: "OldPass123" } as any),
      ).rejects.toThrow(/invalid email or password/i);
    });

    it("rejects requesting an OTP with the wrong current password", async () => {
      const userId = await registerUser("change-wrong-cur@duncit.com");
      await expect(
        userService.requestPasswordChangeOtp(userId, { current_password: "WrongPass999" } as any),
      ).rejects.toThrow(/current password is incorrect/i);
    });

    it("rejects a wrong OTP at confirmation", async () => {
      const userId = await registerUser("change-wrong-otp@duncit.com");
      await userService.requestPasswordChangeOtp(userId, { current_password: "OldPass123" } as any);
      await expect(
        userService.changePasswordWithOtp(userId, {
          otp: "000000",
          new_password: "BrandNew123",
        } as any),
      ).rejects.toThrow(/invalid otp/i);
    });

    it("rejects a change when no OTP was requested", async () => {
      const userId = await registerUser("change-no-otp@duncit.com");
      await expect(
        userService.changePasswordWithOtp(userId, {
          otp: "123456",
          new_password: "BrandNew123",
        } as any),
      ).rejects.toThrow(/otp expired/i);
    });
  });

  /**
   * Deleting an account is a REQUEST now, not an instant purge: the emailed
   * code proves who is asking, and the Tech portal carries the erasure out.
   * The proof required did not change — only what happens once it checks out,
   * which is why these still start at `requestAccountDeletionOtp`.
   */
  describe("request account deletion (self-serve, OTP)", () => {
    const registerUser = async (email: string) => {
      const res = await userService.register({
        ...(await provenNumber()),
        first_name: "Del",
        email,
        password: "StrongPass123",
        dob: new Date("1991-01-01").toISOString(),
      } as any);
      return res.user.user_id;
    };

    it("files a pending request and closes the account to sign-in", async () => {
      const userId = await registerUser("delete-ok@duncit.com");

      const req = await userService.requestAccountDeletionOtp(userId);
      expect(req.ok).toBe(true);
      expect(req.dev_otp).toMatch(/^\d{6}$/);

      const filed = await accountDeletionService.submitRequest(userId, {
        otp: req.dev_otp as string,
        reason: "Not using it any more",
      });
      expect(filed).toMatchObject({ status: "PENDING", reason: "Not using it any more" });
      expect(filed?.request_id).toBeTruthy();

      // Nothing is ERASED yet — the row is still there for the thirty days,
      // so somebody who changes their mind has something to come back to.
      const stored = await UserModel.findById(userId)
        .select("metadata.status metadata.deleted_at auth.email")
        .lean();
      expect((stored as any).metadata.deleted_at).toBeFalsy();
      expect((stored as any).auth.email).toBe("delete-ok@duncit.com");
      // But filing it ENDS the account: every sign-in door refuses from that
      // moment, and refuses generically — an account being mid-deletion is not
      // something a stranger typing an address gets told.
      await expect(
        userService.login({ email: "delete-ok@duncit.com", password: "StrongPass123" } as any),
      ).rejects.toThrow(/invalid email or password/i);

      // Their own open request is what the apps read to show the banner.
      expect(await accountDeletionService.myRequest(userId)).toMatchObject({
        request_id: filed?.request_id,
      });
    });

    it("hands back the same request to somebody who asks twice", async () => {
      const userId = await registerUser("delete-again@duncit.com");

      const first = await accountDeletionService.submitRequest(userId, {
        otp: (await userService.requestAccountDeletionOtp(userId)).dev_otp as string,
      });
      const second = await accountDeletionService.submitRequest(userId, {
        otp: (await userService.requestAccountDeletionOtp(userId)).dev_otp as string,
      });

      // Asking twice is not an error — it is somebody who did not see the
      // first one land.
      expect(second?.request_id).toBe(first?.request_id);
    });

    it("withdraws an open request", async () => {
      const userId = await registerUser("delete-cancel@duncit.com");
      await accountDeletionService.submitRequest(userId, {
        otp: (await userService.requestAccountDeletionOtp(userId)).dev_otp as string,
      });

      expect(await accountDeletionService.cancelMyRequest(userId)).toMatchObject({
        status: "CANCELLED",
      });
      expect(await accountDeletionService.myRequest(userId)).toBeNull();
      await expect(accountDeletionService.cancelMyRequest(userId)).rejects.toThrow(
        /no open deletion request/i,
      );
    });

    it("rejects a wrong OTP", async () => {
      const userId = await registerUser("delete-wrong@duncit.com");
      await userService.requestAccountDeletionOtp(userId);
      await expect(
        accountDeletionService.submitRequest(userId, { otp: "000000" }),
      ).rejects.toThrow(/invalid otp/i);
    });

    it("rejects a request when no OTP was asked for", async () => {
      const userId = await registerUser("delete-no-otp@duncit.com");
      await expect(
        accountDeletionService.submitRequest(userId, { otp: "123456" }),
      ).rejects.toThrow(/otp expired/i);
    });
  });

  describe("selected location", () => {
    const newUser = async (email: string) => {
      const res = await userService.register({
        ...(await provenNumber()),
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
        ...(await provenNumber()),
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
        ...(await provenNumber()),
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

  describe("portal-gated login (server-side portal access)", () => {
    const registerUser = async (email: string) => {
      const res = await userService.register({
        ...(await provenNumber()),
        first_name: "Gate",
        email,
        password: "StrongPass123",
        dob: new Date("1991-01-01").toISOString(),
      } as any);
      return res.user.user_id;
    };

    it("rejects a console login when the user lacks the portal's role", async () => {
      await registerUser("gate-deny@duncit.com");
      await expect(
        userService.login({
          email: "gate-deny@duncit.com",
          password: "StrongPass123",
          portal_key: "tech",
        } as any),
      ).rejects.toThrow(/do not have access to this portal/i);
    });

    it("logs in fine with no portal_key (consumer app unaffected)", async () => {
      await registerUser("gate-open@duncit.com");
      const res = await userService.login({
        email: "gate-open@duncit.com",
        password: "StrongPass123",
      } as any);
      expect(res.token).toBeTruthy();
    });

    it("logs in fine on an exempt surface even without console roles", async () => {
      await registerUser("gate-exempt@duncit.com");
      const res = await userService.login({
        email: "gate-exempt@duncit.com",
        password: "StrongPass123",
        portal_key: "mweb",
      } as any);
      expect(res.token).toBeTruthy();
    });

    it("allows the console login once the portal's role is granted", async () => {
      const userId = await registerUser("gate-allow@duncit.com");
      await UserRoleModel.create({
        user_id: userId,
        role: "TECH_MANAGER",
        scope: { city: null, zone: null },
      });
      const res = await userService.login({
        email: "gate-allow@duncit.com",
        password: "StrongPass123",
        portal_key: "tech",
      } as any);
      expect(res.token).toBeTruthy();
      expect(res.user.roles).toContain("TECH_MANAGER");
    });
  });

  describe("update persists state + pincode (B15)", () => {
    it("stores and returns profile.state and profile.pincode", async () => {
      const reg = await userService.register({
        ...(await provenNumber()),
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

    it("saves and returns the structured main address via updateMyProfile", async () => {
      const reg = await userService.register({
        ...(await provenNumber()),
        first_name: "Main",
        email: "mainaddr@duncit.com",
        password: "StrongPass123",
        dob: new Date("1990-01-01").toISOString(),
      } as any);

      // A fresh account has an empty (but non-null) address.
      const before = await userService.me(reg.user.user_id);
      expect(before!.address).toEqual({
        line1: "",
        line2: "",
        landmark: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
      });

      const updated = await userService.updateMyProfile(reg.user.user_id, {
        address: { line1: "  8 Residency Rd ", city: "Bengaluru", state: "Karnataka", pincode: "560025" },
      } as any);
      expect(updated!.address.line1).toBe("8 Residency Rd");
      expect(updated!.address.city).toBe("Bengaluru");
      expect(updated!.address.pincode).toBe("560025");
      expect(updated!.address.country).toBe("India");

      const me = await userService.me(reg.user.user_id);
      expect(me!.address.state).toBe("Karnataka");
    });
  });
});

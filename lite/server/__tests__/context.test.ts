import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { buildContext, optionalUser, requireAdmin, requireUser, signToken, type AuthUser, type LiteContext } from '../context';
import { MCP_ASSERTION_HEADER, MCP_AUDIENCE, MCP_ISSUER } from '../mcp/assertion';
import { LiteUserModel } from '../models/user.model';
import { apiError } from './helpers/expect';
import { makeUser } from './helpers/fixtures';
import { withTestDatabase } from './helpers/mongo';

vi.mock('../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/env')>();
  return { ...actual, env: { ...actual.env, mcpSecret: 'mcp-shared-secret', jwtSecret: 'lite-test-jwt-secret', adminEmails: [] } };
});

withTestDatabase();

const assertion = (claims: Record<string, unknown>) =>
  jwt.sign(claims, 'mcp-shared-secret', { algorithm: 'HS256', issuer: MCP_ISSUER, audience: MCP_AUDIENCE, expiresIn: 60 });

/** A request as Express would hand it to Apollo, carrying only the given headers. */
function requestWith(headers: Record<string, string>) {
  return { req: Object.assign(Object.create(express.request), { headers }), res: Object.create(express.response) };
}

const contextFor = (user: AuthUser | null): LiteContext => ({ ...requestWith({}), user });

describe('buildContext', () => {
  it('reads the person from a Bearer session token', async () => {
    const priya = await makeUser({ email: 'priya@lite.test', is_admin: true });
    const ctx = await buildContext(requestWith({ authorization: `Bearer ${signToken(priya)}` }));
    expect(ctx.user).toEqual({ id: String(priya._id), email: 'priya@lite.test', is_admin: true });
    expect(ctx.mcp).toBeUndefined();
  });

  it('is anonymous without a token, or with one that does not verify', async () => {
    expect((await buildContext(requestWith({}))).user).toBeNull();
    expect((await buildContext(requestWith({ authorization: 'Bearer forged.token.here' }))).user).toBeNull();
  });

  it('acts as the Lite account for an MCP call assertion, making it on first use', async () => {
    const header = assertion({ purpose: 'call', email: 'Asha@Duncit.com', name: 'Asha Rao', duncit_user_id: 'dun-9', scope: 'write' });

    const first = await buildContext(requestWith({ [MCP_ASSERTION_HEADER]: header }));
    const again = await buildContext(requestWith({ [MCP_ASSERTION_HEADER]: header }));

    expect(first.mcp).toEqual({ scope: 'write' });
    expect(first.user).toMatchObject({ email: 'asha@duncit.com', is_admin: false });
    expect(again.user?.id).toBe(first.user?.id);
    const account = await LiteUserModel.findById(first.user?.id).lean();
    expect(account).toMatchObject({ name: 'Asha Rao', duncit_user_id: 'dun-9' });
    expect(await LiteUserModel.countDocuments({ email: 'asha@duncit.com' })).toBe(1);
  });

  it('keeps a read-only MCP connection read-only', async () => {
    const ctx = await buildContext(requestWith({ [MCP_ASSERTION_HEADER]: assertion({ email: 'asha@duncit.com' }) }));
    expect(ctx.mcp).toEqual({ scope: 'read' });
  });

  it('ignores a schema assertion and falls back to the session token', async () => {
    const priya = await makeUser({ email: 'priya@lite.test' });
    const ctx = await buildContext(requestWith({ [MCP_ASSERTION_HEADER]: assertion({ purpose: 'schema' }), authorization: `Bearer ${signToken(priya)}` }));
    expect(ctx.user?.id).toBe(String(priya._id));
    expect(ctx.mcp).toBeUndefined();
    expect(await LiteUserModel.countDocuments({})).toBe(1);
  });
});

describe('requireUser', () => {
  it('loads the signed-in account fresh', async () => {
    const priya = await makeUser({ email: 'priya@lite.test' });
    const user = await requireUser(contextFor({ id: String(priya._id), email: 'priya@lite.test', is_admin: false }));
    expect(String(user._id)).toBe(String(priya._id));
  });

  it('refuses no session, a deleted account and a blocked one', async () => {
    await expect(requireUser(contextFor(null))).rejects.toMatchObject(apiError('UNAUTHENTICATED', 'Please sign in to continue'));
    await expect(requireUser(contextFor({ id: '507f1f77bcf86cd799439011', email: '', is_admin: false }))).rejects.toMatchObject(
      apiError('UNAUTHENTICATED', 'Your session has ended. Please sign in again'),
    );
    const blocked = await makeUser({ is_blocked: true });
    await expect(requireUser(contextFor({ id: String(blocked._id), email: '', is_admin: false }))).rejects.toMatchObject(apiError('FORBIDDEN', 'This account has been blocked'));
  });
});

describe('requireAdmin', () => {
  it('checks the stored flag, not the token claim', async () => {
    const member = await makeUser();
    await expect(requireAdmin(contextFor({ id: String(member._id), email: '', is_admin: true }))).rejects.toMatchObject(apiError('FORBIDDEN', 'Only a Lite admin can do this'));
    const admin = await makeUser({ is_admin: true });
    await expect(requireAdmin(contextFor({ id: String(admin._id), email: '', is_admin: false }))).resolves.toBeTruthy();
  });
});

describe('optionalUser', () => {
  it('answers the account, or null for no session, a missing or a blocked account', async () => {
    const priya = await makeUser();
    const blocked = await makeUser({ is_blocked: true });
    expect(String((await optionalUser(contextFor({ id: String(priya._id), email: '', is_admin: false })))?._id)).toBe(String(priya._id));
    await expect(optionalUser(contextFor(null))).resolves.toBeNull();
    await expect(optionalUser(contextFor({ id: '507f1f77bcf86cd799439011', email: '', is_admin: false }))).resolves.toBeNull();
    await expect(optionalUser(contextFor({ id: String(blocked._id), email: '', is_admin: false }))).resolves.toBeNull();
  });
});

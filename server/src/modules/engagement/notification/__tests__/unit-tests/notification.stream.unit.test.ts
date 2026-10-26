import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { notificationStreamHandler } from '../../notification.stream';
import { notificationService } from '../../notification.service';
import { emitNotifyForUsers, notificationEvents } from '../../notification.events';
import { sealSessions } from '@modules/access/auth/session-seal';
import { lockAccount, unlockAccount } from '@modules/access/accountDeletion/accountDeletion.lock';

/** A session token as signToken mints it, issued `offsetSec` seconds from now. */
const tokenFor = (id: string, offsetSec = 0) =>
  jwt.sign(
    { id, roles: ['USER'], iat: Math.floor(Date.now() / 1000) + offsetSec },
    process.env.JWT_SECRET || 'dev-secret'
  );

const newId = () => new Types.ObjectId().toString();

/** The request side of an EventSource connection: a query and a `close`. */
function fakeReq(query: Record<string, unknown>) {
  return Object.assign(new EventEmitter(), { query }) as unknown as Request & EventEmitter;
}

function fakeRes() {
  const res = {
    status: jest.fn(),
    end: jest.fn(),
    set: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

/** Every `event:` written, paired with its parsed `data:` line. */
function eventsOf(res: ReturnType<typeof fakeRes>) {
  const lines = res.write.mock.calls.map(([chunk]) => String(chunk));
  const out: { event: string; data: Record<string, unknown> }[] = [];
  lines.forEach((line, i) => {
    if (line.startsWith('event: ')) {
      out.push({
        event: line.slice(7).trim(),
        data: JSON.parse(lines[i + 1].slice(6)) as Record<string, unknown>,
      });
    }
  });
  return out;
}

async function open(query: Record<string, unknown>) {
  const req = fakeReq(query);
  const res = fakeRes();
  await notificationStreamHandler(req, res as unknown as Response);
  return { req, res };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

let unreadSpy: jest.SpyInstance;

beforeEach(() => {
  unreadSpy = jest.spyOn(notificationService, 'unreadCountForUser').mockResolvedValue(3);
});

afterEach(() => {
  unreadSpy.mockRestore();
});

describe('GET /notifications/stream — who may open it', () => {
  it('refuses a request with no token', async () => {
    const { res } = await open({});

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.end).toHaveBeenCalled();
    expect(res.set).not.toHaveBeenCalled();
  });

  it('refuses a token signed with another secret', async () => {
    const forged = jwt.sign({ id: newId(), roles: ['USER'] }, 'not-the-secret');

    const { res } = await open({ token: forged });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.write).not.toHaveBeenCalled();
  });

  it('refuses a token minted before the account ended its sessions', async () => {
    const id = newId();
    const token = tokenFor(id, -60);
    sealSessions(id);

    const { res } = await open({ token });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.write).not.toHaveBeenCalled();
    expect(notificationEvents.listenerCount(`notify:${id}`)).toBe(0);
  });

  it('accepts a session opened after the seal', async () => {
    const id = newId();
    sealSessions(id);

    const { req, res } = await open({ token: tokenFor(id, 2) });

    expect(res.status).not.toHaveBeenCalled();
    expect(eventsOf(res)).toEqual([{ event: 'hello', data: { unread_count: 3 } }]);
    req.emit('close');
  });

  it('refuses an account that is awaiting deletion', async () => {
    const id = newId();
    const token = tokenFor(id);
    lockAccount(id);
    try {
      const { res } = await open({ token });

      expect(res.status).toHaveBeenCalledWith(401);
      expect(notificationEvents.listenerCount(`notify:${id}`)).toBe(0);
    } finally {
      unlockAccount(id);
    }
  });
});

describe('GET /notifications/stream — an open stream', () => {
  it('opens as an event stream and says hello with the unread count', async () => {
    const id = newId();

    const { req, res } = await open({ token: tokenFor(id) });

    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Content-Type': 'text/event-stream' })
    );
    expect(res.flushHeaders).toHaveBeenCalled();
    expect(unreadSpy).toHaveBeenCalledWith(id);
    expect(eventsOf(res)).toEqual([{ event: 'hello', data: { unread_count: 3 } }]);
    req.emit('close');
  });

  it('says hello with 0 when the count cannot be read, and stays open', async () => {
    unreadSpy.mockRejectedValue(new Error('mongo down'));
    const id = newId();

    const { req, res } = await open({ token: tokenFor(id) });

    expect(eventsOf(res)).toEqual([{ event: 'hello', data: { unread_count: 0 } }]);
    expect(notificationEvents.listenerCount(`notify:${id}`)).toBe(1);
    req.emit('close');
  });

  it("forwards only this account's events, re-counting when the count is unknown", async () => {
    const id = newId();
    const { req, res } = await open({ token: tokenFor(id) });
    unreadSpy.mockResolvedValue(7);

    emitNotifyForUsers([id], { unread_count: 5, kind: 'new', notification_id: 'n1' });
    emitNotifyForUsers([newId()], { unread_count: 9, kind: 'new' });
    emitNotifyForUsers([id], { unread_count: -1, kind: 'read_all' });
    await flush();

    const notifies = eventsOf(res).filter((e) => e.event === 'notify');
    expect(notifies.map((e) => [e.data.kind, e.data.unread_count])).toEqual([
      ['new', 5],
      ['read_all', 7],
    ]);
    req.emit('close');
  });

  it('pings while open and lets go of everything when the client hangs up', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    try {
      const id = newId();
      const { req, res } = await open({ token: tokenFor(id) });

      jest.advanceTimersByTime(25_000);
      expect(res.write).toHaveBeenLastCalledWith(': ping\n\n');

      req.emit('close');
      const written = res.write.mock.calls.length;
      jest.advanceTimersByTime(60_000);
      emitNotifyForUsers([id], { unread_count: 1, kind: 'new' });
      await flush();

      expect(res.write).toHaveBeenCalledTimes(written);
      expect(notificationEvents.listenerCount(`notify:${id}`)).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});

/**
 * Ask a STUN/TURN server where it thinks you are.
 *
 * This is the first thing a browser does when it starts a call, so a reply
 * proves the port is open the whole way through — the host firewall and the
 * provider's. Nothing else in the stack tells you that: a relay can be running,
 * listening and completely unreachable, and the only symptom is a call that
 * connects to nothing.
 *
 *   TURN_HOST=1.2.3.4 node scripts/stun-probe.mjs
 *   node scripts/stun-probe.mjs 1.2.3.4 3478
 *
 * See dev.md > Staff calls: the TURN relay.
 */
import { createSocket } from 'node:dgram';
import { randomBytes } from 'node:crypto';

const host = process.argv[2] ?? process.env.TURN_HOST;
const port = Number(process.argv[3] ?? process.env.TURN_PORT ?? 3478);

if (!host) {
  console.error('Usage: TURN_HOST=<host> node scripts/stun-probe.mjs [host] [port]');
  process.exit(2);
}

/** Every STUN message carries this, and a reply that does not is not STUN. */
const MAGIC_COOKIE = 0x2112a442;
const BINDING_REQUEST = 0x0001;
const XOR_MAPPED_ADDRESS = 0x0020;

const request = Buffer.alloc(20);
request.writeUInt16BE(BINDING_REQUEST, 0);
request.writeUInt16BE(0, 2);
request.writeUInt32BE(MAGIC_COOKIE, 4);
randomBytes(12).copy(request, 8);

/**
 * The address the server saw us arrive from, obfuscated with the magic cookie
 * so that middleboxes rewriting addresses in payloads cannot silently corrupt
 * it. Attributes are padded to a four-byte boundary.
 */
function mappedAddress(message) {
  let offset = 20;
  while (offset + 4 <= message.length) {
    const attribute = message.readUInt16BE(offset);
    const length = message.readUInt16BE(offset + 2);
    if (attribute === XOR_MAPPED_ADDRESS) {
      const mappedPort = message.readUInt16BE(offset + 6) ^ (MAGIC_COOKIE >>> 16);
      const raw = message.readUInt32BE(offset + 8) ^ MAGIC_COOKIE;
      const octets = [raw >>> 24, raw >>> 16, raw >>> 8, raw].map((part) => part & 255);
      return `${octets.join('.')}:${mappedPort}`;
    }
    offset += 4 + length + ((4 - (length % 4)) % 4);
  }
  return null;
}

const socket = createSocket('udp4');

const giveUp = setTimeout(() => {
  console.error(`NO REPLY from ${host}:${port} within 6s — UDP is blocked, or nothing is listening.`);
  socket.close();
  process.exitCode = 1;
}, 6000);

socket.on('message', (message) => {
  clearTimeout(giveUp);
  const type = message.readUInt16BE(0);
  const seen = mappedAddress(message);
  console.log(`reply type 0x${type.toString(16).padStart(4, '0')} (0x0101 is success)`);
  console.log(`${host}:${port} sees this machine as ${seen ?? '(no XOR-MAPPED-ADDRESS)'}`);
  socket.close();
});

socket.send(request, port, host, (error) => {
  if (!error) return;
  clearTimeout(giveUp);
  console.error(`could not send to ${host}:${port} — ${error.message}`);
  socket.close();
  process.exitCode = 1;
});

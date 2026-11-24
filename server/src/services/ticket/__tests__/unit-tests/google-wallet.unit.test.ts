import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  eventTicketClass,
  eventTicketObject,
  googleClassId,
  googleObjectId,
  googleWalletSaveUrl,
} from '../../google-wallet';
import { TICKET_ACCENT } from '../../ticket.pdf';
import { walletTicket } from '../wallet-fixtures';

const ISSUER = '3388000000022212345';
const LOGO = 'https://server.duncit.test/tickets/wallet-logo.png';
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const account = { client_email: 'wallet@duncit-test.iam.gserviceaccount.com', private_key: privateKey };

describe('google wallet ids', () => {
  it('derives one class per pod and one object per ticket under the issuer', () => {
    expect(googleClassId(ISSUER, 'pod1')).toBe(`${ISSUER}.duncit_pod_pod1`);
    expect(googleObjectId(ISSUER, 'tkt1')).toBe(`${ISSUER}.duncit_ticket_tkt1`);
  });
});

describe('eventTicketClass', () => {
  it('carries the event, venue, time window and brand', () => {
    const cls = eventTicketClass(walletTicket(), ISSUER, LOGO);

    expect(cls).toMatchObject({
      id: `${ISSUER}.duncit_pod_65f0c0ffee00000000001234`,
      issuerName: 'Duncit',
      reviewStatus: 'UNDER_REVIEW',
      eventName: { defaultValue: { language: 'en-US', value: 'Sunday Pickleball' } },
      logo: { sourceUri: { uri: LOGO } },
      hexBackgroundColor: TICKET_ACCENT,
      venue: {
        name: { defaultValue: { language: 'en-US', value: 'Smash Arena' } },
        address: { defaultValue: { language: 'en-US', value: 'Sector 62, Noida' } },
      },
      dateTime: { start: '2026-11-26T03:30:00.000Z', end: '2026-11-26T05:30:00.000Z' },
    });
    expect(cls).not.toHaveProperty('textModulesData');
  });

  it('names the meeting platform instead of a venue for a virtual pod', () => {
    const cls = eventTicketClass(walletTicket({ mode: 'VIRTUAL', meeting_platform: 'Zoom' }), ISSUER, LOGO);

    expect(cls).not.toHaveProperty('venue');
    expect(cls.textModulesData).toEqual([{ id: 'place', header: 'MEETING', body: 'Zoom' }]);
  });

  it('omits the time window when the pod has no valid start', () => {
    expect(eventTicketClass(walletTicket({ starts_at: null }), ISSUER, LOGO)).not.toHaveProperty('dateTime');
    expect(eventTicketClass(walletTicket({ ends_at: null }), ISSUER, LOGO).dateTime).toEqual({
      start: '2026-11-26T03:30:00.000Z',
    });
  });
});

describe('eventTicketObject', () => {
  it('is an active pass whose QR is the check-in token', () => {
    expect(eventTicketObject(walletTicket(), ISSUER)).toEqual({
      id: `${ISSUER}.duncit_ticket_65f0c0ffee0000000000abcd`,
      classId: `${ISSUER}.duncit_pod_65f0c0ffee00000000001234`,
      state: 'ACTIVE',
      ticketHolderName: 'Asha Rao',
      ticketNumber: 'TKT-4821',
      hexBackgroundColor: TICKET_ACCENT,
      barcode: { type: 'QR_CODE', value: 'eyJ0IjoiVEtULTQ4MjEifQ.c2ln', alternateText: 'TKT-4821' },
    });
  });

  it('says how many people a multi-seat ticket admits', () => {
    expect(eventTicketObject(walletTicket({ seats: 4 }), ISSUER).textModulesData).toEqual([
      { id: 'admits', header: 'ADMITS', body: '4 people' },
    ]);
  });
});

describe('googleWalletSaveUrl', () => {
  it('is a save link whose JWT the service account signed, holding the class and the object', () => {
    const url = googleWalletSaveUrl(walletTicket(), { issuerId: ISSUER, account }, LOGO);

    expect(url.startsWith('https://pay.google.com/gp/v/save/')).toBe(true);
    const claims = jwt.verify(url.split('/save/')[1], publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
    expect(claims).toMatchObject({ iss: account.client_email, aud: 'google', typ: 'savetowallet', origins: [] });
    expect(claims.payload.eventTicketClasses).toHaveLength(1);
    expect(claims.payload.eventTicketObjects[0].barcode.value).toBe('eyJ0IjoiVEtULTQ4MjEifQ.c2ln');
  });

  it('does not verify against another key', () => {
    const other = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const url = googleWalletSaveUrl(walletTicket(), { issuerId: ISSUER, account }, LOGO);
    expect(() => jwt.verify(url.split('/save/')[1], other.publicKey, { algorithms: ['RS256'] })).toThrow();
  });
});

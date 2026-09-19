import { env } from '../config/env';
import { optionalUser, requireUser, type LiteContext } from '../context';
import { authService } from '../services/auth.service';
import { calendarService } from '../services/calendar.service';
import { discoverService, publicCategories, publicCities } from '../services/discover.service';
import { eventService } from '../services/event.service';
import { upiLink, upiQrDataUrl } from '../services/qr';
import { registrationService } from '../services/registration.service';
import { settingsService } from '../services/settings.service';
import { UPLOAD_MAX_MB } from '../services/upload.service';
import { userService } from '../services/user.service';

type Args = Record<string, any>;

export const publicResolvers = {
  Query: {
    _lite: () => true,
    liteSettings: () => settingsService.publicSettings(),
    liteMe: async (_p: unknown, _a: Args, ctx: LiteContext) => {
      const user = await optionalUser(ctx);
      return user ? userService.me(user) : null;
    },
    liteDiscover: async (_p: unknown, args: Args, ctx: LiteContext) => discoverService.discover(args.city_slug, await optionalUser(ctx)),
    liteEvents: async (_p: unknown, args: Args, ctx: LiteContext) => discoverService.events(args.filter ?? {}, args.page ?? 1, args.page_size ?? 24, await optionalUser(ctx)),
    liteEvent: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.bySlug(args.slug, await optionalUser(ctx)),
    liteMyEvents: async (_p: unknown, args: Args, ctx: LiteContext) => {
      const user = await requireUser(ctx);
      if (args.scope === 'HOSTING') return eventService.mine(user, Boolean(args.past));
      const regs = await registrationService.mine(user, Boolean(args.past));
      // The registration rides on its own event, so a card can read either way round.
      return regs.filter((r) => r.event).map((r) => ({ ...r.event, viewer_registration: r }));
    },
    liteMyRegistrations: async (_p: unknown, args: Args, ctx: LiteContext) => registrationService.mine(await requireUser(ctx), Boolean(args.past)),
    liteRegistration: async (_p: unknown, args: Args, ctx: LiteContext) => registrationService.byId(await requireUser(ctx), args.id),
    liteEventRegistrations: async (_p: unknown, args: Args, ctx: LiteContext) => registrationService.forEvent(await requireUser(ctx), args.event_id, args.status, args.search),
    liteCalendar: async (_p: unknown, args: Args, ctx: LiteContext) => calendarService.bySlug(args.slug, await optionalUser(ctx)),
    liteCalendarEvents: async (_p: unknown, args: Args, ctx: LiteContext) => calendarService.events(args.slug, Boolean(args.past), await optionalUser(ctx)),
    liteMyCalendars: async (_p: unknown, _a: Args, ctx: LiteContext) => calendarService.mine(await requireUser(ctx)),
    liteCategories: (_p: unknown, args: Args) => publicCategories(Boolean(args.include_inactive)),
    liteCities: (_p: unknown, args: Args) => publicCities(Boolean(args.include_inactive)),
    liteCity: (_p: unknown, args: Args) => discoverService.city(args.slug),
    liteUserProfile: (_p: unknown, args: Args) => userService.byHandle(args.handle),
    liteUserEvents: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.byHandle(args.handle, Boolean(args.past), await optionalUser(ctx)),
    liteUpiQr: async (_p: unknown, args: Args) => {
      const link = upiLink(args.upi_id, args.name ?? '', args.amount ?? null, args.note ?? '');
      return { upi_link: link, data_url: await upiQrDataUrl(link) };
    },
    liteUploadTicket: async (_p: unknown, _a: Args, ctx: LiteContext) => {
      await requireUser(ctx);
      return { upload_url: `${env.siteUrl}/upload`, max_mb: UPLOAD_MAX_MB };
    },
  },
  Mutation: {
    _lite: () => true,
    liteRequestSignInCode: (_p: unknown, args: Args) => authService.requestCode(args.email),
    liteVerifySignInCode: (_p: unknown, args: Args) => authService.verifyCode(args.email, args.code, args.name),
    liteSignInWithGoogle: (_p: unknown, args: Args) => authService.signInWithGoogle(args.id_token),
    liteUpdateProfile: async (_p: unknown, args: Args, ctx: LiteContext) => userService.updateProfile(await requireUser(ctx), args.input),
    liteSetMyLocale: async (_p: unknown, args: Args, ctx: LiteContext) => userService.setLocale(await requireUser(ctx), args.locale),

    liteCreateEvent: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.create(await requireUser(ctx), args.input),
    liteUpdateEvent: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.update(await requireUser(ctx), args.id, args.input),
    litePublishEvent: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.publish(await requireUser(ctx), args.id),
    liteCancelEvent: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.cancel(await requireUser(ctx), args.id, args.reason),
    liteDuplicateEvent: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.duplicate(await requireUser(ctx), args.id),
    liteAddCoHost: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.addCoHost(await requireUser(ctx), args.event_id, args.email),
    liteRemoveCoHost: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.removeCoHost(await requireUser(ctx), args.event_id, args.user_id),
    liteSendEventUpdate: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.sendUpdate(await requireUser(ctx), args.event_id, args.subject, args.body),

    liteRegister: async (_p: unknown, args: Args, ctx: LiteContext) => registrationService.register(await requireUser(ctx), args.event_id, args.input),
    liteSubmitPaymentReference: async (_p: unknown, args: Args, ctx: LiteContext) => registrationService.submitPaymentReference(await requireUser(ctx), args.registration_id, args.reference, args.note),
    liteCancelRegistration: async (_p: unknown, args: Args, ctx: LiteContext) => registrationService.cancel(await requireUser(ctx), args.id),
    liteHostRegistrationAction: async (_p: unknown, args: Args, ctx: LiteContext) => registrationService.hostAction(await requireUser(ctx), args.id, args.action),
    liteHostCheckInByCode: async (_p: unknown, args: Args, ctx: LiteContext) => registrationService.checkInByCode(await requireUser(ctx), args.event_id, args.code),

    liteCreateCalendar: async (_p: unknown, args: Args, ctx: LiteContext) => calendarService.create(await requireUser(ctx), args.input),
    liteUpdateCalendar: async (_p: unknown, args: Args, ctx: LiteContext) => calendarService.update(await requireUser(ctx), args.id, args.input),
    liteSubscribeCalendar: async (_p: unknown, args: Args, ctx: LiteContext) => calendarService.subscribe(await requireUser(ctx), args.id, true),
    liteUnsubscribeCalendar: async (_p: unknown, args: Args, ctx: LiteContext) => calendarService.subscribe(await requireUser(ctx), args.id, false),
  },
};

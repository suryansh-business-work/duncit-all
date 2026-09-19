export type UserFlag = 'is_admin' | 'is_blocked';

export interface FlagCopy {
  title: string;
  message: string;
  done: string;
  /** The confirm button reads as destructive. */
  destructive: boolean;
}

/** The catalogue keys behind a flag change, spelled out so every key is greppable. */
export function flagCopy(flag: UserFlag, next: boolean): FlagCopy {
  if (flag === 'is_admin') {
    if (next) {
      return { title: 'litePortal.users.makeAdminTitle', message: 'litePortal.users.makeAdminMessage', done: 'litePortal.users.adminOn', destructive: false };
    }
    return { title: 'litePortal.users.removeAdminTitle', message: 'litePortal.users.removeAdminMessage', done: 'litePortal.users.adminOff', destructive: true };
  }
  if (next) {
    return { title: 'litePortal.users.blockTitle', message: 'litePortal.users.blockMessage', done: 'litePortal.users.blockedOn', destructive: true };
  }
  return { title: 'litePortal.users.unblockTitle', message: 'litePortal.users.unblockMessage', done: 'litePortal.users.blockedOff', destructive: false };
}

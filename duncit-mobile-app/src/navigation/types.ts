/** The single React Navigation stack. Auth/Survey/App screens are gated by the
 * auth store, but they share one param list for typed navigation everywhere. */
export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Survey: undefined;
  Home: undefined;
  Profile: undefined;
  Saved: undefined;
  PodHistory: undefined;
  BecomeHost: undefined;
  HostManage: undefined;
  RegisterVenue: undefined;
  VenueManage: undefined;
  Support: undefined;
  PodIdeas: undefined;
  Faqs: undefined;
  PodPlans: undefined;
  Policies: undefined;
  SupportTickets: undefined;
  Policy: { slug: string };
  ChatRoom: { podId: string; title: string };
  PodDetails: { podId: string; title: string };
  ClubDetails: { clubId: string; title: string };
};

/** Param-less destinations reachable from the account drawer menu. */
export type MenuRoute = Exclude<
  keyof RootStackParamList,
  'Policy' | 'Login' | 'Signup' | 'Survey' | 'ChatRoom' | 'PodDetails' | 'ClubDetails'
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}

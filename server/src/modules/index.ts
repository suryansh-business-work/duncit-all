import gql from 'graphql-tag';
import { userTypeDefs } from './user/user.schema';
import { userResolvers } from './user/user.resolver';
import { rbacTypeDefs } from './rbac/rbac.schema';
import { rbacResolvers } from './rbac/rbac.resolver';
import { settingsTypeDefs } from './settings/settings.schema';
import { settingsResolvers } from './settings/settings.resolver';
import { categoryTypeDefs } from './category/category.schema';
import { categoryResolvers } from './category/category.resolver';
import { locationTypeDefs } from './location/location.schema';
import { locationResolvers } from './location/location.resolver';
import { clubTypeDefs } from './club/club.schema';
import { clubResolvers } from './club/club.resolver';
import { podTypeDefs } from './pod/pod.schema';
import { podResolvers } from './pod/pod.resolver';
import { sliderTypeDefs } from './slider/slider.schema';
import { sliderResolvers } from './slider/slider.resolver';
import { notificationTypeDefs } from './notification/notification.schema';
import { notificationResolvers } from './notification/notification.resolver';
import { interviewTypeDefs } from './interview/interview.schema';
import { interviewResolvers } from './interview/interview.resolver';
import { faqTypeDefs } from './faq/faq.schema';
import { faqResolvers } from './faq/faq.resolver';
import { financeTypeDefs } from './finance/finance.schema';
import { financeResolvers } from './finance/finance.resolver';
import { paymentTypeDefs } from './payment/payment.schema';
import { paymentResolvers } from './payment/payment.resolver';
import { aiTypeDefs } from './ai/ai.schema';
import { aiResolvers } from './ai/ai.resolver';
import { postTypeDefs } from './post/post.schema';
import { postResolvers } from './post/post.resolver';
import { policyTypeDefs } from './policy/policy.schema';
import { policyResolvers } from './policy/policy.resolver';
import { podIdeaTypeDefs } from './podIdea/podIdea.schema';
import { podIdeaResolvers } from './podIdea/podIdea.resolver';
import { uploadTypeDefs } from './upload/upload.schema';
import { uploadResolvers } from './upload/upload.resolver';
import { emailTemplateTypeDefs } from './emailTemplate/emailTemplate.schema';
import { emailTemplateResolvers } from './emailTemplate/emailTemplate.resolver';
import { podMemberTypeDefs } from './podMember/podMember.schema';
import { podMemberResolvers } from './podMember/podMember.resolver';
import { badgeTypeDefs } from './badge/badge.schema';
import { badgeResolvers } from './badge/badge.resolver';
import { venueTypeDefs } from './venue/venue.schema';
import { venueResolvers } from './venue/venue.resolver';
import { hostTypeDefs } from './host/host.schema';
import { hostResolvers } from './host/host.resolver';
import { chatTypeDefs } from './chat/chat.schema';
import { chatResolvers } from './chat/chat.resolver';
import { newsletterTypeDefs } from './newsletter/newsletter.schema';
import { newsletterResolvers } from './newsletter/newsletter.resolver';
import { contactTypeDefs } from './contact/contact.schema';
import { contactResolvers } from './contact/contact.resolver';
import { analyticsTypeDefs } from './analytics/analytics.schema';
import { analyticsResolvers } from './analytics/analytics.resolver';
import { podPlanTypeDefs } from './pod-plan/pod-plan.schema';
import { podPlanResolvers } from './pod-plan/pod-plan.resolver';
import { whatsappTypeDefs } from './auth-whatsapp/auth-whatsapp.schema';
import { whatsappResolvers } from './auth-whatsapp/auth-whatsapp.resolver';

const rootTypeDefs = gql`
  type Query {
    _ping: String!
  }
  type Mutation {
    _noop: Boolean
  }
`;

const rootResolvers = {
  Query: { _ping: () => 'pong' },
  Mutation: { _noop: () => true },
};

export const typeDefs = [rootTypeDefs, userTypeDefs, rbacTypeDefs, settingsTypeDefs, categoryTypeDefs, locationTypeDefs, clubTypeDefs, podTypeDefs, sliderTypeDefs, notificationTypeDefs, interviewTypeDefs, faqTypeDefs, financeTypeDefs, paymentTypeDefs, aiTypeDefs, postTypeDefs, policyTypeDefs, podIdeaTypeDefs, uploadTypeDefs, emailTemplateTypeDefs, podMemberTypeDefs, badgeTypeDefs, venueTypeDefs, hostTypeDefs, chatTypeDefs, newsletterTypeDefs, contactTypeDefs, analyticsTypeDefs, podPlanTypeDefs, whatsappTypeDefs];

export const resolvers = [rootResolvers, userResolvers, rbacResolvers, settingsResolvers, categoryResolvers, locationResolvers, clubResolvers, podResolvers, sliderResolvers, notificationResolvers, interviewResolvers, faqResolvers, financeResolvers, paymentResolvers, aiResolvers, postResolvers, policyResolvers, podIdeaResolvers, uploadResolvers, emailTemplateResolvers, podMemberResolvers, badgeResolvers, venueResolvers, hostResolvers, chatResolvers, newsletterResolvers, contactResolvers, analyticsResolvers, podPlanResolvers, whatsappResolvers];

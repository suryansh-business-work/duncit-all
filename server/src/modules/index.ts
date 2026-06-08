import gql from 'graphql-tag';
import { userTypeDefs } from '@modules/access/user/user.schema';
import { userResolvers } from '@modules/access/user/user.resolver';
import { rbacTypeDefs } from '@modules/access/rbac/rbac.schema';
import { rbacResolvers } from '@modules/access/rbac/rbac.resolver';
import { settingsTypeDefs } from '@modules/platform/settings/settings.schema';
import { settingsResolvers } from '@modules/platform/settings/settings.resolver';
import { categoryTypeDefs } from '@modules/pods/category/category.schema';
import { categoryResolvers } from '@modules/pods/category/category.resolver';
import { locationTypeDefs } from '@modules/platform/location/location.schema';
import { locationResolvers } from '@modules/platform/location/location.resolver';
import { clubTypeDefs } from '@modules/pods/club/club.schema';
import { clubResolvers } from '@modules/pods/club/club.resolver';
import { podTypeDefs } from '@modules/pods/pod/pod.schema';
import { podResolvers } from '@modules/pods/pod/pod.resolver';
import { sliderTypeDefs } from '@modules/engagement/slider/slider.schema';
import { sliderResolvers } from '@modules/engagement/slider/slider.resolver';
import { notificationTypeDefs } from '@modules/engagement/notification/notification.schema';
import { notificationResolvers } from '@modules/engagement/notification/notification.resolver';
import { interviewTypeDefs } from '@modules/pods/interview/interview.schema';
import { interviewResolvers } from '@modules/pods/interview/interview.resolver';
import { faqTypeDefs } from '@modules/support/faq/faq.schema';
import { faqResolvers } from '@modules/support/faq/faq.resolver';
import { financeTypeDefs } from '@modules/finance/finance/finance.schema';
import { financeResolvers } from '@modules/finance/finance/finance.resolver';
import { paymentTypeDefs } from '@modules/finance/payment/payment.schema';
import { paymentResolvers } from '@modules/finance/payment/payment.resolver';
import { couponTypeDefs } from '@modules/finance/coupon/coupon.schema';
import { couponResolvers } from '@modules/finance/coupon/coupon.resolver';
import { eventTicketTypeDefs } from '@modules/pods/ticket/ticket.schema';
import { eventTicketResolvers } from '@modules/pods/ticket/ticket.resolver';
import { aiTypeDefs } from '@modules/ai/ai/ai.schema';
import { aiResolvers } from '@modules/ai/ai/ai.resolver';
import { aiPromptTypeDefs } from '@modules/ai/prompt/prompt.schema';
import { aiPromptResolvers } from '@modules/ai/prompt/prompt.resolver';
import { postTypeDefs } from '@modules/engagement/post/post.schema';
import { postResolvers } from '@modules/engagement/post/post.resolver';
import { policyTypeDefs } from '@modules/content/policy/policy.schema';
import { policyResolvers } from '@modules/content/policy/policy.resolver';
import { podIdeaTypeDefs } from '@modules/pods/podIdea/podIdea.schema';
import { podIdeaResolvers } from '@modules/pods/podIdea/podIdea.resolver';
import { uploadTypeDefs } from '@modules/platform/upload/upload.schema';
import { uploadResolvers } from '@modules/platform/upload/upload.resolver';
import { emailTemplateTypeDefs } from '@modules/content/emailTemplate/emailTemplate.schema';
import { emailTemplateResolvers } from '@modules/content/emailTemplate/emailTemplate.resolver';
import { podMemberTypeDefs } from '@modules/pods/podMember/podMember.schema';
import { podMemberResolvers } from '@modules/pods/podMember/podMember.resolver';
import { badgeTypeDefs } from '@modules/engagement/badge/badge.schema';
import { badgeResolvers } from '@modules/engagement/badge/badge.resolver';
import { venueTypeDefs } from '@modules/venues/venue/venue.schema';
import { venueResolvers } from '@modules/venues/venue/venue.resolver';
import { hostTypeDefs } from '@modules/venues/host/host.schema';
import { hostResolvers } from '@modules/venues/host/host.resolver';
import { chatTypeDefs } from '@modules/engagement/chat/chat.schema';
import { chatResolvers } from '@modules/engagement/chat/chat.resolver';
import { newsletterTypeDefs } from '@modules/crm/newsletter/newsletter.schema';
import { newsletterResolvers } from '@modules/crm/newsletter/newsletter.resolver';
import { contactTypeDefs } from '@modules/crm/contact/contact.schema';
import { contactResolvers } from '@modules/crm/contact/contact.resolver';
import { analyticsTypeDefs } from '@modules/platform/analytics/analytics.schema';
import { analyticsResolvers } from '@modules/platform/analytics/analytics.resolver';
import { podPlanTypeDefs } from '@modules/pods/pod-plan/pod-plan.schema';
import { podPlanResolvers } from '@modules/pods/pod-plan/pod-plan.resolver';
import { whatsappTypeDefs } from '@modules/access/auth-whatsapp/auth-whatsapp.schema';
import { whatsappResolvers } from '@modules/access/auth-whatsapp/auth-whatsapp.resolver';
import { inventoryTypeDefs } from '@modules/venues/inventory/inventory.schema';
import { inventoryResolvers } from '@modules/venues/inventory/inventory.resolver';
import { partnerDashboardTypeDefs } from '@modules/venues/partnerDashboard/partnerDashboard.schema';
import { partnerDashboardResolvers } from '@modules/venues/partnerDashboard/partnerDashboard.resolver';
import { websiteContentTypeDefs } from '@modules/content/websiteContent/websiteContent.schema';
import { websiteContentResolvers } from '@modules/content/websiteContent/websiteContent.resolver';
import { marketingTypeDefs } from '@modules/crm/marketing/marketing.schema';
import { marketingResolvers } from '@modules/crm/marketing/marketing.resolver';
import { crmTypeDefs } from '@modules/crm/crm/crm.schema';
import { crmResolvers } from '@modules/crm/crm/crm.resolver';
import { commsProviderTypeDefs } from '@modules/crm/commsProvider/commsProvider.schema';
import { commsProviderResolvers } from '@modules/crm/commsProvider/commsProvider.resolver';
import { communicationLogTypeDefs } from '@modules/crm/communicationLog/communicationLog.schema';
import { communicationLogResolvers } from '@modules/crm/communicationLog/communicationLog.resolver';
import { callPromptTypeDefs } from '@modules/crm/callPrompt/callPrompt.schema';
import { callPromptResolvers } from '@modules/crm/callPrompt/callPrompt.resolver';
import { serviceOfferedTypeDefs } from '@modules/crm/serviceOffered/serviceOffered.schema';
import { serviceOfferedResolvers } from '@modules/crm/serviceOffered/serviceOffered.resolver';
import { managedOptionTypeDefs } from '@modules/crm/managedOption/managedOption.schema';
import { managedOptionResolvers } from '@modules/crm/managedOption/managedOption.resolver';
import { websitePageTypeDefs } from '@modules/crm/websitePage/websitePage.schema';
import { websitePageResolvers } from '@modules/crm/websitePage/websitePage.resolver';
import { crmEmailTemplateTypeDefs } from '@modules/crm/emailTemplate/crmEmailTemplate.schema';
import { crmEmailTemplateResolvers } from '@modules/crm/emailTemplate/crmEmailTemplate.resolver';
import { reminderTypeDefs } from '@modules/crm/reminder/reminder.schema';
import { reminderResolvers } from '@modules/crm/reminder/reminder.resolver';
import { surveyTypeDefs } from '@modules/survey/survey.schema';
import { surveyResolvers } from '@modules/survey/survey.resolver';
import { meetingTypeDefs } from '@modules/survey/meeting.schema';
import { meetingResolvers } from '@modules/survey/meeting.resolver';
import { bouncerTypeDefs } from '@modules/support/bouncer/bouncer.schema';
import { bouncerResolvers } from '@modules/support/bouncer/bouncer.resolver';
import { venueSlotTypeDefs } from '@modules/venues/venueSlot/venueSlot.schema';
import { venueSlotResolvers } from '@modules/venues/venueSlot/venueSlot.resolver';
import { accountHealthTypeDefs } from '@modules/access/accountHealth/accountHealth.schema';
import { accountHealthResolvers } from '@modules/access/accountHealth/accountHealth.resolver';
import { ticketTypeDefs } from '@modules/support/ticket/ticket.schema';
import { ticketResolvers } from '@modules/support/ticket/ticket.resolver';
import { supportChatTypeDefs } from '@modules/support/supportChat/supportChat.schema';
import { supportChatResolvers } from '@modules/support/supportChat/supportChat.resolver';
import { legalDocumentTypeDefs } from '@modules/content/legalDocument/legalDocument.schema';
import { legalDocumentResolvers } from '@modules/content/legalDocument/legalDocument.resolver';
import { envEntryTypeDefs } from '@modules/platform/envEntry/envEntry.schema';
import { envEntryResolvers } from '@modules/platform/envEntry/envEntry.resolver';
import { portalModeTypeDefs } from '@modules/platform/portalMode/portalMode.schema';
import { portalModeResolvers } from '@modules/platform/portalMode/portalMode.resolver';

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

export const typeDefs = [rootTypeDefs, userTypeDefs, rbacTypeDefs, settingsTypeDefs, categoryTypeDefs, locationTypeDefs, clubTypeDefs, podTypeDefs, sliderTypeDefs, notificationTypeDefs, interviewTypeDefs, faqTypeDefs, financeTypeDefs, paymentTypeDefs, couponTypeDefs, eventTicketTypeDefs, aiTypeDefs, aiPromptTypeDefs, postTypeDefs, policyTypeDefs, podIdeaTypeDefs, uploadTypeDefs, emailTemplateTypeDefs, podMemberTypeDefs, badgeTypeDefs, venueTypeDefs, hostTypeDefs, chatTypeDefs, newsletterTypeDefs, contactTypeDefs, analyticsTypeDefs, podPlanTypeDefs, whatsappTypeDefs, inventoryTypeDefs, partnerDashboardTypeDefs, websiteContentTypeDefs, marketingTypeDefs, crmTypeDefs, commsProviderTypeDefs, communicationLogTypeDefs, callPromptTypeDefs, serviceOfferedTypeDefs, managedOptionTypeDefs, websitePageTypeDefs, crmEmailTemplateTypeDefs, reminderTypeDefs, surveyTypeDefs, meetingTypeDefs, bouncerTypeDefs, venueSlotTypeDefs, accountHealthTypeDefs, ticketTypeDefs, supportChatTypeDefs, legalDocumentTypeDefs, envEntryTypeDefs, portalModeTypeDefs];

export const resolvers = [rootResolvers, userResolvers, rbacResolvers, settingsResolvers, categoryResolvers, locationResolvers, clubResolvers, podResolvers, sliderResolvers, notificationResolvers, interviewResolvers, faqResolvers, financeResolvers, paymentResolvers, couponResolvers, eventTicketResolvers, aiResolvers, aiPromptResolvers, postResolvers, policyResolvers, podIdeaResolvers, uploadResolvers, emailTemplateResolvers, podMemberResolvers, badgeResolvers, venueResolvers, hostResolvers, chatResolvers, newsletterResolvers, contactResolvers, analyticsResolvers, podPlanResolvers, whatsappResolvers, inventoryResolvers, partnerDashboardResolvers, websiteContentResolvers, marketingResolvers, crmResolvers, commsProviderResolvers, communicationLogResolvers, callPromptResolvers, serviceOfferedResolvers, managedOptionResolvers, websitePageResolvers, crmEmailTemplateResolvers, reminderResolvers, surveyResolvers, meetingResolvers, bouncerResolvers, venueSlotResolvers, accountHealthResolvers, ticketResolvers, supportChatResolvers, legalDocumentResolvers, envEntryResolvers, portalModeResolvers];

import type { PageCopy } from './types';

/** Business > Communications. WhatsApp campaigns are named by the data, so they need no slice words. */
export const COMMUNICATIONS_COPY: PageCopy = {
  kpis: {
    com_emails_sent: { title: 'analytics.kpi.comEmailsSent', hint: 'analytics.kpi.comEmailsSentHint' },
    com_emails_failed: { title: 'analytics.kpi.comEmailsFailed', hint: 'analytics.kpi.comEmailsFailedHint' },
    com_emails_skipped: { title: 'analytics.kpi.comEmailsSkipped', hint: 'analytics.kpi.comEmailsSkippedHint' },
    com_email_delivery_rate: {
      title: 'analytics.kpi.comEmailDeliveryRate',
      hint: 'analytics.kpi.comEmailDeliveryRateHint',
    },
    com_whatsapp_sent: { title: 'analytics.kpi.comWhatsappSent', hint: 'analytics.kpi.comWhatsappSentHint' },
    com_whatsapp_failed: { title: 'analytics.kpi.comWhatsappFailed', hint: 'analytics.kpi.comWhatsappFailedHint' },
    com_whatsapp_cost: { title: 'analytics.kpi.comWhatsappCost', hint: 'analytics.kpi.comWhatsappCostHint' },
    com_whatsapp_delivery_rate: {
      title: 'analytics.kpi.comWhatsappDeliveryRate',
      hint: 'analytics.kpi.comWhatsappDeliveryRateHint',
    },
    com_notifications: { title: 'analytics.kpi.comNotifications', hint: 'analytics.kpi.comNotificationsHint' },
    com_push_delivered: { title: 'analytics.kpi.comPushDelivered', hint: 'analytics.kpi.comPushDeliveredHint' },
    com_push_failed: { title: 'analytics.kpi.comPushFailed', hint: 'analytics.kpi.comPushFailedHint' },
    com_crm_outreach: { title: 'analytics.kpi.comCrmOutreach', hint: 'analytics.kpi.comCrmOutreachHint' },
  },
  trends: {
    com_emails: { title: 'analytics.trend.comEmails', hint: 'analytics.trend.comEmailsHint' },
    com_whatsapp: { title: 'analytics.trend.comWhatsapp', hint: 'analytics.trend.comWhatsappHint' },
    com_notifications: { title: 'analytics.trend.comNotifications', hint: 'analytics.trend.comNotificationsHint' },
  },
  series: {
    com_whatsapp_skipped: 'analytics.series.comWhatsappSkipped',
  },
  breakdowns: {
    com_emails_by_category: 'analytics.breakdown.comEmailsByCategory',
    com_emails_by_source: 'analytics.breakdown.comEmailsBySource',
    com_whatsapp_by_category: 'analytics.breakdown.comWhatsappByCategory',
    com_whatsapp_by_campaign: 'analytics.breakdown.comWhatsappByCampaign',
    com_notifications_by_scope: 'analytics.breakdown.comNotificationsByScope',
  },
  slices: {
    com_emails_by_category: {
      transactional: 'analytics.slice.comCategoryTransactional',
      authentication: 'analytics.slice.comCategoryAuthentication',
      marketing: 'analytics.slice.comCategoryMarketing',
      service: 'analytics.slice.comCategoryService',
      notification: 'analytics.slice.comCategoryNotification',
      support: 'analytics.slice.comCategorySupport',
      billing: 'analytics.slice.comCategoryBilling',
      legal: 'analytics.slice.comCategoryLegal',
      internal: 'analytics.slice.comCategoryInternal',
    },
    com_emails_by_source: {
      SERVER: 'analytics.slice.comSourceServer',
      NATIVE: 'analytics.slice.comSourceNative',
      MWEB: 'analytics.slice.comSourceMweb',
      WEBSITE: 'analytics.slice.comSourceWebsite',
      PORTAL: 'analytics.slice.comSourcePortal',
      CRM: 'analytics.slice.comSourceCrm',
      TEST: 'analytics.slice.comSourceTest',
    },
    com_whatsapp_by_category: {
      MARKETING: 'analytics.slice.comWaMarketing',
      UTILITY: 'analytics.slice.comWaUtility',
      AUTHENTICATION: 'analytics.slice.comWaAuthentication',
      SERVICE: 'analytics.slice.comWaService',
    },
    com_notifications_by_scope: {
      GLOBAL: 'analytics.slice.comScopeGlobal',
      LOCATION: 'analytics.slice.comScopeLocation',
      ZONE: 'analytics.slice.comScopeZone',
      USER: 'analytics.slice.comScopeUser',
      AUDIENCE_LIST: 'analytics.slice.comScopeAudienceList',
    },
  },
  leaderboards: {
    com_top_templates: {
      title: 'analytics.leaderboard.comTopTemplates',
      hint: 'analytics.leaderboard.comTopTemplatesHint',
      name: 'analytics.leaderboard.comTemplate',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    com_emails_sent: 'analytics.leaderboard.comEmailsSent',
    com_emails_failed: 'analytics.leaderboard.comEmailsFailed',
    com_emails_skipped: 'analytics.leaderboard.comEmailsSkipped',
    com_email_delivery_rate: 'analytics.leaderboard.comEmailDeliveryRate',
    com_send_time: 'analytics.leaderboard.comSendTime',
  },
};

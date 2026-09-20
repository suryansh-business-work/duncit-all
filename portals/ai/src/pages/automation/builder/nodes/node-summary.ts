import type { Translate } from '@duncit/shell';
import { CONDITION_OP_KEYS, DELAY_UNIT_KEYS, TRIGGER_LABEL_KEYS, type NodeKind } from '../../node-kinds';
import type { NodeData } from '../../types';

const str = (value: unknown): string => String(value ?? '').trim();
const list = (value: unknown): string[] => (Array.isArray(value) ? value.map(str).filter(Boolean) : []);

/** The one line under a card's title — what this step is set to do, or what it still needs. */
export function summaryOf(kind: NodeKind, config: NodeData, t: Translate): string {
  switch (kind) {
    case 'trigger': {
      const trigger = str(config.trigger);
      const label = TRIGGER_LABEL_KEYS[trigger] ? t(TRIGGER_LABEL_KEYS[trigger]) : t('ai.automation.trigger.none');
      if (trigger === 'INBOUND_EMAIL') {
        const mailbox = str(config.mailbox);
        return mailbox ? t('ai.automation.summary.mailbox', { vars: { email: mailbox } }) : t('ai.automation.summary.noMailbox');
      }
      if (trigger === 'INBOUND_MESSAGE') {
        const keywords = str(config.keywords);
        return keywords ? t('ai.automation.summary.keywords', { vars: { list: keywords } }) : t('ai.automation.summary.keywordsAny');
      }
      return label;
    }
    case 'send_whatsapp':
      return str(config.campaign_name) || t('ai.automation.summary.pickCampaign');
    case 'send_email':
      return str(config.template_slug) || t('ai.automation.summary.pickTemplate');
    case 'ai_compose':
      return t('ai.automation.summary.aiOutput', { vars: { name: `{{${str(config.output_var) || 'ai_reply'}}}` } });
    case 'ai_classify': {
      const count = list(config.labels).length;
      return count ? t('ai.automation.summary.labels', { vars: { count } }) : t('ai.automation.summary.noLabels');
    }
    case 'condition': {
      const variable = str(config.variable);
      const operator = str(config.operator);
      if (!variable) return t('ai.automation.summary.conditionEmpty');
      const opLabel = CONDITION_OP_KEYS[operator] ? t(CONDITION_OP_KEYS[operator]) : operator;
      return t('ai.automation.summary.condition', { vars: { variable, operator: opLabel, value: str(config.value) } });
    }
    case 'wait_for_reply':
      return t('ai.automation.summary.wait', { vars: { hours: str(config.timeout_hours) || '24' } });
    case 'delay': {
      const unit = str(config.unit);
      const unitLabel = DELAY_UNIT_KEYS[unit] ? t(DELAY_UNIT_KEYS[unit]) : unit.toLowerCase();
      return t('ai.automation.summary.delay', { vars: { amount: str(config.amount) || '1', unit: unitLabel } });
    }
    case 'set_variable': {
      const name = str(config.name);
      return name ? t('ai.automation.summary.setVariable', { vars: { name: `{{${name}}}` } }) : t('ai.automation.summary.variableUnnamed');
    }
    case 'http_request':
      return str(config.url) || t('ai.automation.summary.url');
    default:
      return '';
  }
}

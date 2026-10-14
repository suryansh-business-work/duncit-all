import { useCallback, useState } from 'react';
import { Text, YStack } from 'tamagui';
import { foodCouponToggledMessage, type FoodOwnerCoupon } from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { useFoodDeskList } from '@/hooks/useFoodDesk';
import { useTranslation } from '@/hooks/useTranslation';
import {
  deleteFoodCoupon,
  fetchFoodCouponsPage,
  setFoodCouponActive,
} from '@/services/venue-food-owner';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';
import { FoodCouponCard } from './FoodCouponCard';
import { FoodCouponFormSheet } from './FoodCouponFormSheet';
import { FoodListState } from './FoodDeskBits';

type Notice = { tone: 'ok' | 'error'; text: string } | null;

/**
 * A venue's food coupons: create, edit, switch on or off, delete after a
 * confirm. The switch moves at once and is put back if the server refuses; a
 * second press on the same coupon waits for the first answer.
 */
export function VenueFoodCouponsBody({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const list = useFoodDeskList(fetchFoodCouponsPage, venueId);
  const { refetch, replaceRow } = list;
  const [editing, setEditing] = useState<FoodOwnerCoupon | 'new' | null>(null);
  const [deleting, setDeleting] = useState<FoodOwnerCoupon | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [switching, setSwitching] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<Notice>(null);

  const toggle = useCallback(
    async (coupon: FoodOwnerCoupon) => {
      const next = !coupon.is_active;
      setSwitching((ids) => new Set(ids).add(coupon.id));
      replaceRow({ ...coupon, is_active: next });
      try {
        replaceRow(await setFoodCouponActive(coupon.id, next));
        setNotice({ tone: 'ok', text: foodCouponToggledMessage(t, coupon.code, next) });
      } catch (err) {
        replaceRow(coupon);
        setNotice({ tone: 'error', text: toErrorMessage(err) });
      } finally {
        setSwitching((ids) => {
          const left = new Set(ids);
          left.delete(coupon.id);
          return left;
        });
      }
    },
    [replaceRow, t],
  );

  const confirmDelete = async (coupon: FoodOwnerCoupon) => {
    setBusyDelete(true);
    try {
      await deleteFoodCoupon(coupon.id);
      setNotice({
        tone: 'ok',
        text: t('venueFoodOwner.coupons.deleted', { vars: { code: coupon.code } }),
      });
    } catch (err) {
      setNotice({ tone: 'error', text: toErrorMessage(err) });
    } finally {
      setBusyDelete(false);
      setDeleting(null);
      // Either way the list is asked again: a refusal usually means the coupon is already gone.
      fireAndForget(refetch());
    }
  };

  return (
    <YStack gap={12} testID="food-coupons">
      <DuncitButton
        testID="food-coupon-new"
        label={t('venueFoodOwner.coupons.newCoupon')}
        onPress={() => setEditing('new')}
      />
      {notice ? (
        <Text
          role={notice.tone === 'ok' ? 'status' : 'alert'}
          testID="food-coupons-notice"
          fontSize={13}
          color={notice.tone === 'ok' ? '$success' : '$danger'}
        >
          {notice.text}
        </Text>
      ) : null}
      {list.rows.map((coupon) => (
        <FoodCouponCard
          key={coupon.id}
          coupon={coupon}
          switching={switching.has(coupon.id)}
          onToggle={(row) => fireAndForget(toggle(row))}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      ))}
      <FoodListState
        isLoading={list.isLoading}
        error={list.error}
        empty={list.rows.length === 0}
        emptyText={t('venueFoodOwner.coupons.empty')}
        hasMore={list.hasMore}
        loadingMore={list.loadingMore}
        onLoadMore={() => fireAndForget(list.loadMore())}
        testID="food-coupons"
      />
      <FoodCouponFormSheet
        venueId={venueId}
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={(coupon, created, message) => {
          // A new coupon changes which rows the list holds; an edit repaints its own card.
          if (created) fireAndForget(refetch());
          else replaceRow(coupon);
          setNotice({ tone: 'ok', text: message });
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={
          deleting ? t('venueFoodOwner.coupons.deleteTitle', { vars: { code: deleting.code } }) : ''
        }
        message={t('venueFoodOwner.coupons.deleteBody')}
        confirmLabel={t('venueFoodOwner.common.delete')}
        cancelLabel={t('venueFoodOwner.common.cancel')}
        destructive
        busy={busyDelete}
        onConfirm={() => {
          if (deleting) fireAndForget(confirmDelete(deleting));
        }}
        onCancel={() => setDeleting(null)}
        testID="food-coupon-delete-confirm"
      />
    </YStack>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { ZodError } from 'zod';
import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import {
  ASSIGN_ROLES,
  DELETE_USER,
  SET_HOST_CATEGORIES,
  STATUS_META,
  UPDATE_USER,
  USER,
  USER_HOST_PROFILE,
  type EditForm,
} from './queries';
import { isCompleteRow } from './HostCategoriesSection';
import { toUpdateUserInput, userProfileSchema } from './user-profile.form';

/** The stored triple carries its denormalized names, so the picker can be
 * hydrated without re-walking the category tree. */
const toCategoryValue = (row: {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  super_category_name?: string | null;
  category_name?: string | null;
  sub_category_name?: string | null;
}): AdminCategoryValue => ({
  ...EMPTY_CATEGORY,
  super_id: row.super_category_id ?? '',
  super_name: row.super_category_name ?? '',
  category_id: row.category_id ?? '',
  category_name: row.category_name ?? '',
  sub_id: row.sub_category_id ?? '',
  sub_name: row.sub_category_name ?? '',
});

export function useUserDetailsState(user_id: string | undefined, setToast: (m: string | null) => void) {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<any>(USER, {
    variables: { user_id },
    skip: !user_id,
    fetchPolicy: 'cache-and-network',
  });
  // Host categories live on the host PROFILE, not the role — a user can hold the
  // HOST role with no profile at all, in which case there is nothing to edit.
  const hostQuery = useQuery<any>(USER_HOST_PROFILE, {
    variables: { user_id },
    skip: !user_id,
    fetchPolicy: 'cache-and-network',
  });
  const [updateUser] = useMutation<any>(UPDATE_USER);
  const [assign] = useMutation<any>(ASSIGN_ROLES);
  const [setHostCategoriesMutation] = useMutation<any>(SET_HOST_CATEGORIES);
  const [deleteUser] = useMutation<any>(DELETE_USER);

  const [form, setForm] = useState<EditForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [hostCategories, setHostCategories] = useState<AdminCategoryValue[]>([]);
  const [delOpen, setDelOpen] = useState(false);

  const hostProfile = hostQuery.data?.hostByUser ?? null;

  const user = data?.user;
  const allRoles = data?.roles ?? [];

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        email: user.email ?? '',
        phone_extension: user.phone_extension ?? '',
        phone_number: user.phone_number ?? '',
        whatsapp_extension: user.whatsapp_extension ?? '',
        whatsapp_number: user.whatsapp_number ?? '',
        city: user.city ?? '',
        state: user.state ?? '',
        pincode: user.pincode ?? '',
        zone: user.zone ?? '',
        assigned_city: user.assigned_city ?? '',
        assigned_zones: (user.assigned_zones ?? []).join(', '),
        bio: user.bio ?? '',
        profile_photo: user.profile_photo ?? '',
        status: (user.status ?? 'ACTIVE') as EditForm['status'],
      });
    }
  }, [user]);

  const roleByKey = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of allRoles) m[r.key] = r;
    return m;
  }, [allRoles]);

  const dirty = useMemo(() => {
    if (!user || !form) return false;
    return (
      form.first_name !== (user.first_name ?? '') ||
      form.last_name !== (user.last_name ?? '') ||
      form.email !== (user.email ?? '') ||
      form.phone_extension !== (user.phone_extension ?? '') ||
      form.phone_number !== (user.phone_number ?? '') ||
      form.whatsapp_extension !== (user.whatsapp_extension ?? '') ||
      form.whatsapp_number !== (user.whatsapp_number ?? '') ||
      form.city !== (user.city ?? '') ||
      form.state !== (user.state ?? '') ||
      form.pincode !== (user.pincode ?? '') ||
      form.zone !== (user.zone ?? '') ||
      form.assigned_city !== (user.assigned_city ?? '') ||
      form.assigned_zones !== (user.assigned_zones ?? []).join(', ') ||
      form.bio !== (user.bio ?? '') ||
      form.profile_photo !== (user.profile_photo ?? '') ||
      form.status !== (user.status ?? 'ACTIVE')
    );
  }, [form, user]);

  const save = async (values?: EditForm) => {
    const nextForm = values ?? form;
    if (!user_id || !nextForm) return;
    setBusy(true);
    setOpError(null);
    try {
      const valid = await userProfileSchema.parseAsync(nextForm);
      const input = toUpdateUserInput(valid);
      await updateUser({ variables: { user_id, input } });
      setToast('User updated');
      await refetch();
    } catch (e: any) {
      const message = e instanceof ZodError ? (e.issues[0]?.message ?? 'Invalid profile') : e.message;
      setOpError(message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: EditForm['status']) => {
    if (!user_id) return;
    setBusy(true);
    setOpError(null);
    try {
      await updateUser({ variables: { user_id, input: { status } } });
      setForm((p) => (p ? { ...p, status } : p));
      setToast(`Status set to ${STATUS_META[status].label}`);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const updatePhoto = async (profile_photo: string) => {
    if (!user_id) return;
    setBusy(true);
    setOpError(null);
    try {
      await updateUser({ variables: { user_id, input: { profile_photo: profile_photo || null } } });
      setForm((previous) => (previous ? { ...previous, profile_photo } : previous));
      setToast('Profile photo updated');
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openRoles = () => {
    const next = new Set<string>(user?.roles ?? []);
    next.add('USER');
    setSelectedRoles(next);
    // Hydrate from the profile each time it opens, so a cancelled edit is not
    // still sitting there the next time the dialog is used.
    setHostCategories((hostProfile?.host_categories ?? []).map(toCategoryValue));
    setRolesOpen(true);
  };
  const toggleRole = (key: string) => {
    if (key === 'USER') return;
    setSelectedRoles((p) => {
      const n = new Set(p);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };
  const saveRoles = async () => {
    if (!user_id) return;
    setBusy(true);
    setOpError(null);
    try {
      const keys = Array.from(selectedRoles);
      if (!keys.includes('USER')) keys.push('USER');
      await assign({ variables: { user_id, role_keys: keys } });
      // Categories are a separate document, so they save separately — and only
      // when there is a profile to hold them. Half-filled rows are dropped: the
      // server rejects a partial triple.
      if (hostProfile && keys.includes('HOST')) {
        await setHostCategoriesMutation({
          variables: {
            host_doc_id: hostProfile.id,
            categories: hostCategories.filter(isCompleteRow).map((row) => ({
              super_category_id: row.super_id,
              category_id: row.category_id,
              sub_category_id: row.sub_id,
            })),
          },
        });
        await hostQuery.refetch();
      }
      setRolesOpen(false);
      setToast('Roles updated');
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!user_id) return;
    setBusy(true);
    try {
      await deleteUser({ variables: { user_id } });
      navigate('/users');
    } catch (e: any) {
      setOpError(e.message);
      setBusy(false);
    }
  };

  return {
    user,
    allRoles,
    roleByKey,
    loading,
    error,
    form,
    setForm,
    busy,
    opError,
    dirty,
    save,
    setStatus,
    updatePhoto,
    rolesOpen,
    setRolesOpen,
    selectedRoles,
    toggleRole,
    openRoles,
    saveRoles,
    hostProfile,
    hostCategories,
    setHostCategories,
    delOpen,
    setDelOpen,
    doDelete,
  };
}

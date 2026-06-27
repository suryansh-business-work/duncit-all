import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  ASSIGN_ROLES,
  DELETE_USER,
  STATUS_META,
  UPDATE_USER,
  USER,
  type EditForm,
} from './queries';
import { toUpdateUserInput, userProfileSchema } from './user-profile.form';

export function useUserDetailsState(user_id: string | undefined, setToast: (m: string | null) => void) {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(USER, {
    variables: { user_id },
    skip: !user_id,
    fetchPolicy: 'cache-and-network',
  });
  const [updateUser] = useMutation(UPDATE_USER);
  const [assign] = useMutation(ASSIGN_ROLES);
  const [deleteUser] = useMutation(DELETE_USER);

  const [form, setForm] = useState<EditForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [delOpen, setDelOpen] = useState(false);

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
      const valid = await userProfileSchema.validate(nextForm, { abortEarly: false });
      const input = toUpdateUserInput(valid);
      await updateUser({ variables: { user_id, input } });
      setToast('User updated');
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
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
    delOpen,
    setDelOpen,
    doDelete,
  };
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import {
  fetchUserById,
  updateUser,
  deleteUser,
  fetchRightsList,
  fetchUserRights,
  updateUserRights,
} from "@/services/userService";
import { fetchCabinetById, fetchCabinets } from "@/services/cabinetService";
import { getUsersRoutes } from "@/routes/sectionConfig";

const initialForm = {
  firstName: "",
  lastName: "",
  phone: "",
  website: "",
  address: "",
  zip: "",
  city: "",
  country: "",
  cabinetId: null,
  isCompany: false,
};

function formFromUser(user) {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    website: user.website ?? "",
    address: user.address ?? "",
    zip: user.zip ?? "",
    city: user.city ?? "",
    country: user.country ?? "",
    cabinetId: user.cabinetId ?? null,
    isCompany: user.isCompany ?? false,
  };
}

export function useUserDetail(userId, isCompany, currentUserId) {
  const { pathname } = useLocation();
  const toast = useToast();
  const { t } = useTranslation();
  const usersRoutes = useMemo(() => getUsersRoutes(pathname), [pathname]);
  const [user, setUser] = useState(null);
  const [cabinet, setCabinet] = useState(null);
  const [cabinets, setCabinets] = useState([]);
  const [rightsList, setRightsList] = useState([]);
  const [userRights, setUserRights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("account");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [rightsForm, setRightsForm] = useState(new Set());
  const [rightsUnsavedTarget, setRightsUnsavedTarget] = useState(null);

  const hasRightsChanges = useMemo(() => {
    if (rightsForm.size !== userRights.length) return true;
    return !userRights.every((id) => rightsForm.has(id));
  }, [rightsForm, userRights]);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const u = await fetchUserById(userId);
      setUser(u);
      setForm(formFromUser(u));
      if (u.cabinetId) {
        try {
          const cab = await fetchCabinetById(u.cabinetId);
          setCabinet(cab);
        } catch {
          setCabinet(null);
        }
      } else {
        setCabinet(null);
      }
    } catch {
      setError("Failed to load user.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadUserRights = useCallback(async () => {
    if (!userId || !isCompany) return;
    try {
      const { rights } = await fetchUserRights(userId);
      setUserRights(rights);
      setRightsForm(new Set(rights));
    } catch {
      setRightsList([]);
      setUserRights([]);
    }
  }, [userId, isCompany]);

  const loadRightsList = useCallback(async () => {
    if (!isCompany) return;
    try {
      const { rights } = await fetchRightsList();
      setRightsList(rights);
    } catch {
      setRightsList([]);
    }
  }, [isCompany]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (isCompany && user) {
      loadRightsList();
      loadUserRights();
    }
  }, [isCompany, user, loadRightsList, loadUserRights]);

  useEffect(() => {
    if (isCompany && !cabinets.length) {
      fetchCabinets({ limit: 500 })
        .then(({ cabinets: cabs }) => setCabinets(cabs || []))
        .catch(() => {});
    }
  }, [isCompany, cabinets.length]);

  const showToast = useCallback(() => {
    toast.success(t("toast.changesSaved"));
  }, [toast, t]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    if (user) setForm(formFromUser(user));
    setRightsForm(new Set(userRights));
  }, [user, userRights]);

  const handleSaveAccount = useCallback(async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      const updated = await updateUser(userId, {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        address: form.address?.trim() || null,
        zip: form.zip?.trim() || null,
        city: form.city?.trim() || null,
        country: form.country?.trim() || null,
      });
      setUser(updated);
      showToast();
    } catch (e) {
      setError(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [userId, saving, form, showToast]);

  const handleSaveDetails = useCallback(async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      const cabinetId = form.isCompany ? 0 : form.cabinetId || 0;
      const updated = await updateUser(userId, {
        cabinetId: cabinetId || null,
        isCompany: form.isCompany,
      });
      setUser(updated);
      setForm((f) => ({
        ...f,
        cabinetId: updated.cabinetId,
        isCompany: updated.isCompany,
      }));
      if (updated.cabinetId) {
        try {
          const cab = await fetchCabinetById(updated.cabinetId);
          setCabinet(cab);
        } catch {
          setCabinet(null);
        }
      } else {
        setCabinet(null);
      }
      showToast();
    } catch (e) {
      setError(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [userId, saving, form, showToast]);

  const handleSaveRights = useCallback(async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      const { rights } = await updateUserRights(userId, Array.from(rightsForm));
      setUserRights(rights);
      setRightsForm(new Set(rights));
      showToast();
    } catch (e) {
      setError(e?.message || "Failed to save rights.");
    } finally {
      setSaving(false);
    }
  }, [userId, saving, rightsForm, showToast]);

  const handleRightsUnsavedSave = useCallback(
    async (navigate, setActiveTab) => {
      const target = rightsUnsavedTarget;
      setSaving(true);
      try {
        const { rights } = await updateUserRights(
          userId,
          Array.from(rightsForm)
        );
        setUserRights(rights);
        setRightsForm(new Set(rights));
        showToast();
        setRightsUnsavedTarget(null);
        if (target === "account") setActiveTab("account");
        else if (target === "details") setActiveTab("details");
        else if (target === "back") navigate(usersRoutes.users);
      } catch (e) {
        setError(e?.message || "Failed to save rights.");
      } finally {
        setSaving(false);
      }
    },
    [rightsUnsavedTarget, userId, rightsForm, showToast, usersRoutes.users]
  );

  const handleRightsUnsavedDiscard = useCallback(
    (navigate, setActiveTab) => {
      const target = rightsUnsavedTarget;
      setRightsUnsavedTarget(null);
      setRightsForm(new Set(userRights));
      if (target === "account") setActiveTab("account");
      else if (target === "details") setActiveTab("details");
      else if (target === "back") navigate(usersRoutes.users);
    },
    [rightsUnsavedTarget, userRights, usersRoutes.users]
  );

  const requestTabSwitch = useCallback(
    (targetTab) => {
      if (activeTab === "rights" && hasRightsChanges) {
        setRightsUnsavedTarget(targetTab);
      } else {
        setActiveTab(targetTab);
      }
    },
    [activeTab, hasRightsChanges]
  );

  const requestBack = useCallback(
    (navigate) => {
      if (editing && activeTab === "rights" && hasRightsChanges) {
        setRightsUnsavedTarget("back");
      } else {
        navigate(usersRoutes.users);
      }
    },
    [editing, activeTab, hasRightsChanges, usersRoutes.users]
  );

  const toggleRight = useCallback((id) => {
    setRightsForm((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const canDelete =
    isCompany &&
    user &&
    !user.isCompany &&
    currentUserId != null &&
    user.id !== currentUserId;

  const handleDeleteUser = useCallback(
    async (navigate) => {
      if (!userId || deleting || !canDelete) return;
      setDeleting(true);
      setError(null);
      try {
        await deleteUser(userId);
        toast.success("User deleted permanently.");
        navigate(usersRoutes.users);
      } catch (e) {
        setError(e?.message || "Failed to delete user.");
        setDeleteConfirmOpen(false);
      } finally {
        setDeleting(false);
      }
    },
    [userId, deleting, canDelete, toast, usersRoutes.users]
  );

  return {
    user,
    cabinet,
    cabinets,
    rightsList,
    rightsForm,
    loading,
    error,
    activeTab,
    setActiveTab,
    editing,
    setEditing,
    saving,
    deleting,
    canDelete,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    handleDeleteUser,
    form,
    setForm,
    rightsUnsavedTarget,
    hasRightsChanges,
    loadUser,
    cancelEdit,
    handleSaveAccount,
    handleSaveDetails,
    handleSaveRights,
    handleRightsUnsavedSave,
    handleRightsUnsavedDiscard,
    requestTabSwitch,
    requestBack,
    toggleRight,
  };
}

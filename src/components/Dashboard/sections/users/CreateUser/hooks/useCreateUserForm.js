import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUsersRoutes } from "@/routes/sectionConfig";
import { createUser } from "@/services/userService";
import { fetchCabinets } from "@/services/cabinetService";

const initialForm = {
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  phone: "",
  website: "",
  address: "",
  zip: "",
  city: "",
  country: "",
  isCompany: false,
  cabinetId: null,
};

export function useCreateUserForm() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const userRoutes = useMemo(() => getUsersRoutes(pathname), [pathname]);
  const [cabinets, setCabinets] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCabinets({ limit: 500 })
      .then(({ cabinets: cabs }) => setCabinets(cabs || []))
      .catch(() => setCabinets([]));
  }, []);

  const update = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);

      const email = form.email?.trim();
      const password = form.password;
      const confirmPassword = form.confirmPassword;
      const firstName = form.firstName?.trim();
      const lastName = form.lastName?.trim();

      if (!email) {
        setError("Email is required");
        return;
      }
      if (!password || password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (!firstName) {
        setError("First name is required");
        return;
      }
      if (!lastName) {
        setError("Last name is required");
        return;
      }

      setSubmitting(true);
      try {
        const user = await createUser({
          email,
          password,
          firstName,
          lastName,
          phone: form.phone?.trim() || null,
          website: form.website?.trim() || null,
          address: form.address?.trim() || null,
          zip: form.zip?.trim() || null,
          city: form.city?.trim() || null,
          country: form.country?.trim() || null,
          isCompany: form.isCompany,
          cabinetId: form.isCompany ? null : form.cabinetId || null,
        });
        if (user?.id) {
          navigate(userRoutes.userDetail(user.id));
        } else {
          navigate(userRoutes.users);
        }
      } catch (err) {
        const msg = err?.message ?? err?.error ?? "Failed to create user";
        const details = err?.details;
        setError(details ? `${msg}: ${details}` : msg);
      } finally {
        setSubmitting(false);
      }
    },
    [form, navigate, userRoutes]
  );

  const handleCancel = useCallback(() => {
    navigate(userRoutes.users);
  }, [navigate, userRoutes.users]);

  return {
    form,
    update,
    cabinets,
    submitting,
    error,
    handleSubmit,
    handleCancel,
  };
}

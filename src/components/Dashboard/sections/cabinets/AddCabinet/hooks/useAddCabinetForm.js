import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes/sectionConfig";
import { createCabinet } from "@/services/cabinetService";
import { loadCabinetsFromApi } from "@/data/cabinets";

const initialForm = {
  name: "",
  legalName: "",
  phone: "",
  email: "",
  website: "",
  fax: "",
  addressNum: "",
  address: "",
  zip: "",
  city: "",
  country: "",
};

export function useAddCabinetForm(onBack) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const name = form.name?.trim();
      if (!name) {
        setError("Cabinet name is required");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const res = await createCabinet(form);
        const slug = res?.cabinet?.slug ?? res?.cabinet?.id;
        await loadCabinetsFromApi();
        if (slug) {
          navigate(ROUTES.cabinetEdit(slug));
        } else {
          onBack?.();
        }
      } catch (err) {
        setError(err?.message ?? "Failed to create cabinet");
      } finally {
        setSubmitting(false);
      }
    },
    [form, navigate, onBack]
  );

  return {
    form,
    update,
    submitting,
    error,
    handleSubmit,
    onBack,
  };
}

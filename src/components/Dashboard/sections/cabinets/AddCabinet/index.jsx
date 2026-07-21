import { useAddCabinetForm } from "./hooks/useAddCabinetForm";
import AddCabinetForm from "./components/AddCabinetForm";
import "../AddCabinet.css";

export default function AddCabinet({ onBack }) {
  const {
    form,
    update,
    submitting,
    error,
    handleSubmit,
    onBack: handleCancel,
  } = useAddCabinetForm(onBack);

  return (
    <section className="dashboard-section add-cabinet">
      <h1 className="section-title add-cabinet-title">
        <i className="fas fa-plus" aria-hidden />
        Add new cabinet
      </h1>

      <AddCabinetForm
        form={form}
        update={update}
        error={error}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </section>
  );
}

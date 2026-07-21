import { useCreateUserForm } from "./CreateUser/hooks/useCreateUserForm";
import CreateUserForm from "./CreateUser/components/CreateUserForm";
import "./CreateUser.css";

export default function CreateUser() {
  const {
    form,
    update,
    cabinets,
    submitting,
    error,
    handleSubmit,
    handleCancel,
  } = useCreateUserForm();

  return (
    <section className="dashboard-section create-user">
      <button
        type="button"
        className="create-user-back"
        onClick={() => handleCancel()}
      >
        <i className="fas fa-arrow-left" aria-hidden /> Back to users
      </button>

      <h1 className="section-title create-user-title">
        <i className="fas fa-user-plus" aria-hidden />
        Create new user
      </h1>

      <CreateUserForm
        form={form}
        update={update}
        cabinets={cabinets}
        error={error}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </section>
  );
}

import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPassword } from "@/services/authService";
import { getApiUserMessage } from "@/core/errors/getApiUserMessage";
import AuthPageShell from "../auth/AuthPageShell";
import "./ResetPassword.css";

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function ResetPassword() {
  const { t } = useTranslation();
  const query = useQuery();
  const token = query.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t("auth.resetInvalidLink"));
      return;
    }
    if (!password || password.length < 6) {
      setError(t("auth.resetPasswordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.resetPasswordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate("/login", {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (err) {
      setError(getApiUserMessage(err, t("auth.resetInvalidLink")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell className="reset-password">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <h1 className="login-title-small">{t("auth.resetTitle")}</h1>
        <p className="login-subtitle">{t("auth.resetSubtitle")}</p>

        {!token && (
          <p className="login-error" role="alert">
            {t("auth.resetInvalidLink")}
          </p>
        )}

        <div className="login-field">
          <label htmlFor="rp-password" className="login-label">
            {t("auth.resetNewPassword")}
          </label>
          <input
            id="rp-password"
            type="password"
            className="login-input"
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading || !token}
          />
        </div>

        <div className="login-field">
          <label htmlFor="rp-confirm" className="login-label">
            {t("auth.resetConfirmPassword")}
          </label>
          <input
            id="rp-confirm"
            type="password"
            className="login-input"
            placeholder={t("auth.passwordPlaceholder")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading || !token}
          />
        </div>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="login-btn-submit"
          disabled={loading || !token}
          aria-busy={loading}
        >
          {loading ? t("auth.resetSaving") : t("auth.resetSubmit")}
        </button>

        <div className="login-footer-links">
          <Link to="/login" className="login-link">
            {t("auth.backToLogin")}
          </Link>
        </div>
      </form>
    </AuthPageShell>
  );
}

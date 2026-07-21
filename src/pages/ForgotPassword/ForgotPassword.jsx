import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "@/services/authService";
import { getApiUserMessage } from "@/core/errors/getApiUserMessage";
import AuthPageShell from "../auth/AuthPageShell";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    const value = email.trim();
    if (!value) {
      setError(t("errors.emailRequired"));
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset(value);
      if (result?.ok) {
        setSent(true);
        setInfo(result.message || t("auth.forgotSuccessBody"));
      } else {
        setError(result?.error || t("errors.generic"));
      }
    } catch (err) {
      setError(getApiUserMessage(err, t("errors.generic")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell className="forgot-password">
      {sent ? (
        <div className="login-form">
          <h1 className="login-title-small">{t("auth.forgotSuccessTitle")}</h1>
          <p className="login-subtitle">{info}</p>
          <p className="login-message-notice">{t("auth.forgotSuccessHint")}</p>
          <div className="login-footer-links">
            <Link to="/login" className="login-link">
              {t("auth.backToLogin")}
            </Link>
          </div>
        </div>
      ) : (
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h1 className="login-title-small">{t("auth.forgotTitle")}</h1>
          <p className="login-subtitle">{t("auth.forgotSubtitle")}</p>
          <p className="login-message-notice">{t("auth.forgotInstructions")}</p>

          <div className="login-field">
            <label htmlFor="forgot-email" className="login-label">
              {t("auth.email")}
            </label>
            <input
              id="forgot-email"
              type="email"
              className="login-input"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              disabled={loading}
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
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? t("auth.sending") : t("auth.sendResetLink")}
          </button>

          <div className="login-footer-links">
            <Link to="/login" className="login-link">
              {t("auth.backToLogin")}
            </Link>
          </div>
        </form>
      )}
    </AuthPageShell>
  );
}

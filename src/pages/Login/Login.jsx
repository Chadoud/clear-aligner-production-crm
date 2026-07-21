import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { login as loginService } from "../../services/authService";
import AuthPageShell from "../auth/AuthPageShell";

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/app";

  useEffect(() => {
    const resetFromQuery =
      new URLSearchParams(location.search).get("reset") === "1";
    if (location.state?.passwordReset || resetFromQuery) {
      setSuccess(t("auth.resetSuccess"));
      navigate("/login", { replace: true, state: {} });
    }
  }, [location.search, location.state, navigate, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { token, user } = await loginService(email, password);
      login(token, user);
      navigate(from, { replace: true });
    } catch (err) {
      if (err?.status === 401) {
        setError(t("errors.invalidCredentials"));
      } else if (err?.status === 429) {
        setError(t("errors.tooManyAttempts"));
      } else {
        setError(t("errors.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="login-field">
          <label htmlFor="email" className="login-label">
            {t("auth.email")}
          </label>
          <input
            id="email"
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

        <div className="login-field">
          <label htmlFor="password" className="login-label">
            {t("auth.password")}
          </label>
          <input
            id="password"
            type="password"
            className="login-input"
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        {success && (
          <p className="login-success" role="status">
            {success}
          </p>
        )}

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
          {loading ? t("auth.signingIn") : t("auth.signIn")}
        </button>

        <div className="login-footer-links">
          <Link to="/forgot-password" className="login-link">
            {t("auth.forgotPassword")}
          </Link>
        </div>
      </form>
    </AuthPageShell>
  );
}

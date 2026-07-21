import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { login as loginService } from "../../services/authService";
import AuthPageShell from "../auth/AuthPageShell";

const DEMO_LAB = {
  email: "lab@example.com",
  password: "Doctor123!",
};
const DEMO_DOCTOR = {
  email: "doctor@example.com",
  password: "Doctor123!",
};

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState(
    import.meta.env.DEV ? DEMO_LAB.email : ""
  );
  const [password, setPassword] = useState(
    import.meta.env.DEV ? DEMO_LAB.password : ""
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/app";
  const showDemoHints = import.meta.env.DEV;

  useEffect(() => {
    const resetFromQuery =
      new URLSearchParams(location.search).get("reset") === "1";
    if (location.state?.passwordReset || resetFromQuery) {
      setSuccess(t("auth.resetSuccess"));
      navigate("/login", { replace: true, state: {} });
    }
  }, [location.search, location.state, navigate, t]);

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

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
        setError(
          showDemoHints
            ? t("errors.invalidCredentialsDemo")
            : t("errors.invalidCredentials")
        );
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
        {showDemoHints && (
          <aside className="login-demo" aria-label={t("auth.demoTitle")}>
            <p className="login-demo-title">{t("auth.demoTitle")}</p>
            <p className="login-demo-body">{t("auth.demoBody")}</p>
            <div className="login-demo-actions">
              <button
                type="button"
                className="login-demo-btn"
                onClick={() => fillDemo(DEMO_LAB)}
                disabled={loading}
              >
                {t("auth.demoUseLab")}
              </button>
              <button
                type="button"
                className="login-demo-btn"
                onClick={() => fillDemo(DEMO_DOCTOR)}
                disabled={loading}
              >
                {t("auth.demoUseDoctor")}
              </button>
            </div>
            <p className="login-demo-creds">
              <code>{DEMO_LAB.email}</code> / <code>{DEMO_LAB.password}</code>
            </p>
          </aside>
        )}

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

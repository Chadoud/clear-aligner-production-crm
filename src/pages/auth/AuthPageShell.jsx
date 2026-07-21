import { useTranslation } from "react-i18next";
import BrandMark from "@/components/shared/BrandMark/BrandMark";
import "../Login/Login.css";

export default function AuthPageShell({ children, className }) {
  const { t } = useTranslation();
  return (
    <div className={["login", className].filter(Boolean).join(" ")}>
      <header className="login-header">
        <BrandMark height={56} className="login-title" />
        <p className="login-subtitle">{t("auth.shellSubtitle")}</p>
      </header>
      <main className="login-main">{children}</main>
    </div>
  );
}

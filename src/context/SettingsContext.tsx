import { ReactNode } from "react";
import { createSafeContext } from "@/core/context/createSafeContext";

type SettingsContextValue = object;

const [SettingsContextBase, useSettings] =
  createSafeContext<SettingsContextValue>("SettingsContext");

export { useSettings };

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SettingsContextBase.Provider value={{}}>
      {children}
    </SettingsContextBase.Provider>
  );
};

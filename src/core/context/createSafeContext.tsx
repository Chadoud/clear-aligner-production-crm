import { createContext, useContext } from "react";

export const createSafeContext = <T,>(name: string) => {
  const ctx = createContext<T | null>(null);
  const useSafeContext = () => {
    const value = useContext(ctx);
    if (!value) {
      throw new Error(`${name} must be used inside ${name} Provider`);
    }
    return value;
  };
  return [ctx, useSafeContext] as const;
};

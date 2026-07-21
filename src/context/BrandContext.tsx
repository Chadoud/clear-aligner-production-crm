import { ReactNode, useMemo, useState } from "react";
import { createSafeContext } from "@/core/context/createSafeContext";
import type { Brand } from "@/types";

interface BrandContextValue {
  brand: Brand;
  setBrand: (brand: Brand) => void;
}

const [BrandContextBase, useBrand] =
  createSafeContext<BrandContextValue>("BrandContext");

export { useBrand };

export const BrandProvider = ({ children }: { children: ReactNode }) => {
  const [brand, setBrand] = useState<Brand>("Lab");
  const value = useMemo(() => ({ brand, setBrand }), [brand]);
  return (
    <BrandContextBase.Provider value={value}>
      {children}
    </BrandContextBase.Provider>
  );
};

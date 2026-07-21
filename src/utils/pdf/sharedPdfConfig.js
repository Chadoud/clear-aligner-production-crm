import { CONFIG, getBrandConfig } from "../../config/constants.js";

export function resolveAssetPath(asset) {
  if (!asset) return null;
  return asset.startsWith("/") ? asset : `/${asset}`;
}

export function resolveBrandAssets(brand) {
  const brandConfig = getBrandConfig(brand);
  const qrSectionAsset =
    brandConfig.QR_CODE_SECTION || CONFIG.ASSETS.QR_CODE_SECTION;
  return {
    brandConfig,
    qrCodeSectionPath: resolveAssetPath(qrSectionAsset),
    logoPath: resolveAssetPath(brandConfig.LOGO),
  };
}

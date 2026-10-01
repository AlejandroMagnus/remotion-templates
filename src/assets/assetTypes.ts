export type VisualAsset = {
  provider: string;
  providerId: string | number;
  mediaType: "image" | "video" | "model";
  remoteUrl: string;
  sourceUrl: string;
  creator: string;
  creatorUrl?: string;
  width: number;
  height: number;
  durationMs?: number;
  altText?: string;
  localPath?: string;
  license?: string;
  licenseUrl?: string;
  sha256?: string;
  fingerprints?: string[];
};

export const assetKey = (
  asset: Pick<VisualAsset, "provider" | "mediaType" | "providerId">,
) => `${asset.provider}:${asset.mediaType}:${asset.providerId}`;

export function cropHeight(asset: Pick<VisualAsset, "width" | "height">) {
  return Math.min(asset.height, (asset.width * 16) / 9);
}

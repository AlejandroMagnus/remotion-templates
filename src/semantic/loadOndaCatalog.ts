import {staticFile} from "remotion";

import type {
  OndaResource,
} from "./selectSemanticResource";

const isOndaResource = (
  value: unknown,
): value is OndaResource => {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const resource =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof resource.name ===
      "string" &&
    typeof resource.title ===
      "string" &&
    typeof resource.description ===
      "string" &&
    typeof resource.category ===
      "string"
  );
};

export const loadOndaCatalog =
  async (): Promise<
    OndaResource[]
  > => {
    const response =
      await fetch(
        staticFile(
          "catalogs/onda-catalog.json",
        ),
      );

    if (!response.ok) {
      throw new Error(
        `Onda catalog HTTP ${response.status}`,
      );
    }

    const data: unknown =
      await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Onda catalog is not an array",
      );
    }

    const catalog =
      data.filter(
        isOndaResource,
      );

    if (
      catalog.length === 0
    ) {
      throw new Error(
        "Onda catalog contains no valid resources",
      );
    }

    return catalog;
  };

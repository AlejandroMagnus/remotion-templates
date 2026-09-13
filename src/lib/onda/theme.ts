import type {CSSProperties} from "react";

export type Brand = {
  accent?: string;
  text?: string;
  bg?: string;
  background?: string;
  fontDisplay?: string;
  fontBody?: string;
};

export const brandToCssVars = (
  brand?: Brand | null,
): CSSProperties => {
  if (!brand) {
    return {};
  }

  const vars: Record<string, string> = {};

  if (brand.accent) {
    vars["--onda-accent"] = brand.accent;
  }

  if (brand.text) {
    vars["--onda-text"] = brand.text;
  }

  if (brand.bg ?? brand.background) {
    vars["--onda-bg"] = brand.bg ?? brand.background ?? "";
  }

  if (brand.fontDisplay) {
    vars["--onda-font-display"] = brand.fontDisplay;
  }

  if (brand.fontBody) {
    vars["--onda-font-body"] = brand.fontBody;
  }

  return vars as CSSProperties;
};

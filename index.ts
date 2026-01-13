#!/usr/bin/env bun

export interface Patch {
  Name: string;
  Products: string;
  Platform: string[];
  url: URL;
  QFE_ID: string;
  ReleaseDate: Date;
  Critical: boolean | "security" | null;
  PatchFiles: URL[];
  SHA256sums: Map<string, string> | null;
  MD5sums: Map<string, string> | null;
}

export interface ProductItem {
  version: string;
  patches: Patch[];
}

export interface PatchesResponse {
  Product: ProductItem[];
}


const patchJsonUrl = "https://content.esri.com/patch_notification/patches.json";

export const sumRe = /^(?<filename>.+):(?<hash>[0-9A-F]+)$/i;
export const versionRe = /^(?<major>\d+)\.(?<minor>\d+)(\.(?<patch>\d+))?$/i;

/**
 * Parses a string into a URL
 * @param {string} s - The string to parse.
 * @returns {URL} - The parsed URL.
 * Protocol-relative URLs will be prepended with "https:".
 * If input is not a string, it is returned unchanged.
 */
const parseUrl = (s: string): URL => {
  if (typeof s !== "string") {
    return s;
  }

  // Prepend "https:"" to protocol-relative URL.
  if (/^\/\//.test(s)) {
    s = "https:" + s;
  }
  return new URL(s);
};

function parseSum(s: string) {
  const match = s.match(sumRe);
  if (!match?.groups || !match.groups.filename || !match.groups.hash) {
    throw new Error(
      `Value is not in expected format: ${s}. Should match ${sumRe}`
    );
  }
  
  return [match.groups.filename, match.groups.hash] as const;
}

function toSumsMap(sums: string[]) {
  if (sums.length === 0) {
    return null;
  }
  return new Map(sums.map(parseSum));
}

/**
 * Provides custom JSON parsing.
 * @param {string} key - The key of the property being parsed.
 * @param {*} value - The value of the property being parsed.
 */
function reviver(key: string, value: any) {
  if (typeof value === "string") {
    if (key === "Platform" || key === "Products") {
      return value.split(/,\s*/);
    }
    if (key === "ReleaseDate") {
      return new Date(value);
    }
    if (key === "url") {
      return parseUrl(value);
    }
    if (key === "Critical") {
      if (value.length === 0) {
        return null;
      }
      if (value === "true") {
        return true;
      }
      if (value === "false") {
        return false;
      }
      return value;
    }
  }
  if (Array.isArray(value)) {
    if (key === "PatchFiles") {
      return value.map(parseUrl);
    }
    if (key.endsWith("sums")) {
      return toSumsMap(value);
    }
  }

  return value;
}

export async function fetchPatches(url: string | URL = patchJsonUrl) {
  const response = await fetch(url);
  const responseText = await response.text();
  const parsedResponse = JSON.parse(responseText, reviver) as PatchesResponse;
  return parsedResponse.Product;
}

export default fetchPatches;

/**
 * @param {ProductItem[]} products
 */
export function* enumeratePatches(products: ProductItem[]) {
  for (const { version, patches } of products) {
    for (const p of patches) {
      yield { version, ...p };
    }
  }
}

if (import.meta.main) {
  const products = await fetchPatches();
  for (const p of enumeratePatches(products)) {
    const PatchFiles = p.PatchFiles.map((f) => f.href);
    const url = p.url.href;
    console.log({ ...p, url, PatchFiles });
  }
}

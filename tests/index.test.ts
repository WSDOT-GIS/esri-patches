import bt from "bun:test";
import {
  fetchPatches,
  sumRe,
  versionRe,
  type Patch,
  type ProductItem,
} from "../index.ts";

bt.describe.concurrent("fetchPatches", async () => {
  const queryResult = await fetchPatches();

  function testPatch(patch: Patch) {
    const stringPropertyNames = ["Name", "QFE_ID"] as const;

    bt.expect(patch.url).toBeInstanceOf(URL);
    bt.expect(patch.ReleaseDate).toBeDate();
    bt.expect(patch).toHaveProperty("Critical");
    bt.expect(patch.Critical).toBeOneOf([true, false, "security", null]);

    for (const pn of stringPropertyNames) {
      bt.expect(patch).toHaveProperty(pn);
      bt.expect(patch[pn]).toBeString();
    }
    const stringArrayPropertyNames = ["Products", "Platform"] as const;

    for (const pn of stringArrayPropertyNames) {
      bt.expect(patch).toHaveProperty(pn);
      bt.expect(patch[pn]).toBeArray();
      for (const item of patch[pn]) {
        bt.expect(item).toBeString();
      }
    }

    const sumsPropertyNames = ["SHA256sums", "MD5sums"] as const;

    for (const pn of sumsPropertyNames) {
      bt.expect(patch).toHaveProperty(pn);
      const v = patch[pn];
      bt.expect(() => v === null || v instanceof Map);
    }

    // bt.expect(patch).
  }

  function testProduct(product: ProductItem) {
    bt.expect(product).toHaveProperty("version");
    bt.expect(product.version).toMatch(versionRe);

    bt.expect(product).toHaveProperty("patches");
    bt.expect(product.patches).toBeArray();

    for (const patch of product.patches) {
      testPatch(patch);
    }
  }

  bt.test("Expect product items to be in expected format", () => {
    for (const product of queryResult) {
      testProduct(product);
    }
  });
});

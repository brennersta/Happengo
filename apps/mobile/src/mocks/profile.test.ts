import { getDemoProfile, updateDemoDisplayName } from "./profile";

test("demo profile name can be changed and is trimmed", () => {
  const before = getDemoProfile();
  const after = updateDemoDisplayName("  Ada Lovelace  ");
  expect(after).toEqual({ ...before, displayName: "Ada Lovelace" });
  expect(getDemoProfile().displayName).toBe("Ada Lovelace");
});

test("demo profile rejects names outside the API bounds", () => {
  expect(updateDemoDisplayName("   ")).toBeNull();
  expect(updateDemoDisplayName("a".repeat(41))).toBeNull();
  expect(updateDemoDisplayName("b".repeat(40))?.displayName).toBe("b".repeat(40));
});

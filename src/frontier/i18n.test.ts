import { describe, expect, it } from "vitest";
import { getMissingRussianCopy, translate } from "./i18n";

describe("FRONTIER localization", () => {
  it("provides Russian strings for all required navigation, tools, setup and permission keys", () => {
    expect(getMissingRussianCopy()).toEqual([]);
  });

  it("keeps English as the canonical default and resolves Russian strings", () => {
    expect(translate("Settings", "en")).toBe("Settings");
    expect(translate("Settings", "ru")).toBe("Настройки");
  });
});

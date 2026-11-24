import { describe, expect, it } from "vitest";
import { applyLanguage, tr } from "./i18n";

describe("FRONTIER localization", () => {
  it("keeps English as the source language", () => {
    expect(tr("en", "Settings")).toBe("Settings");
  });

  it("translates core navigation and settings into Russian", () => {
    expect(tr("ru", "Settings")).toBe("Настройки");
    expect(tr("ru", "Auto-detect selected games")).toBe("Автоопределение выбранных игр");
    expect(tr("ru", "Device diagnostics")).toBe("Диагностика устройства");
  });

  it("sets the document language for accessibility and browser services", () => {
    applyLanguage("ru");
    expect(document.documentElement.lang).toBe("ru");
    expect(document.documentElement.dataset.frontierLanguage).toBe("ru");
  });
});

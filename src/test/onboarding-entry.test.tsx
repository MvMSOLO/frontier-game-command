import { describe, expect, it } from "vitest";

import { Frontier } from "@/frontier/Frontier";
import { Route } from "@/routes/index";

describe("FRONTIER first-launch entry", () => {
  it("routes first-time visitors through the initiation protocol before Twin-Core", () => {
    expect(Route.options.component).not.toBe(Frontier);
  });
});

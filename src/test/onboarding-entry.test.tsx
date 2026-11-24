import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Frontier } from "@/frontier/Frontier";
import { FrontierEntry } from "@/frontier/FrontierEntry";
import { Route } from "@/routes/index";
afterEach(() => { cleanup(); window.localStorage.clear(); });
describe("FRONTIER first-launch entry", () => {
  it("routes visitors through the entry gate instead of directly to Twin-Core", () => { expect(Route.options.component).not.toBe(Frontier); });
  it("shows the initiation protocol when no completed setup exists", async () => {
    render(<FrontierEntry />);
    expect(await screen.findByText("INITIATION PROTOCOL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /initialize system/i })).toBeInTheDocument();
  });
});
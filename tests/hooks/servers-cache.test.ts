import { beforeEach, expect, it, vi } from "vitest";
import { __resetCache } from "../helpers/raycast-stub";

const getAll = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/Server", () => ({ Server: { getAll } }));

import { forgetServers, loadServers } from "../../src/hooks/useServers";

beforeEach(() => {
  __resetCache();
  getAll.mockReset();
  getAll.mockResolvedValue([{ id: 1, name: "web-1" }]);
});

it("walks Forge once, then answers every later open from the cache", async () => {
  expect(await loadServers()).toEqual([{ id: 1, name: "web-1" }]);
  expect(await loadServers()).toEqual([{ id: 1, name: "web-1" }]);
  expect(getAll).toHaveBeenCalledTimes(1);
});

it("walks again after a refresh", async () => {
  await loadServers();
  forgetServers();
  await loadServers();
  expect(getAll).toHaveBeenCalledTimes(2);
});

it("refetches rather than throwing on a corrupt entry", async () => {
  const { Cache } = await import("../helpers/raycast-stub");
  new Cache().set("servers-list", "{not json");
  expect(await loadServers()).toEqual([{ id: 1, name: "web-1" }]);
});

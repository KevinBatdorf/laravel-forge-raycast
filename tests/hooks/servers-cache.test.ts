import { beforeEach, expect, it, vi } from "vitest";
import { __resetCache } from "../helpers/raycast-stub";

const getAll = vi.hoisted(() => vi.fn());
const fleetStamp = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/Server", () => ({ Server: { getAll }, fleetStamp }));

import { forgetServers, loadServers } from "../../src/hooks/useServers";

const FLEET = [{ id: 1, name: "web-1" }];

beforeEach(() => {
  __resetCache();
  getAll.mockReset().mockResolvedValue(FLEET);
  fleetStamp.mockReset().mockResolvedValue("acct/org=9001:2026-08-27T03:21:10Z");
});

it("walks once, then serves the cache while the stamp holds", async () => {
  expect(await loadServers()).toEqual(FLEET);
  expect(await loadServers()).toEqual(FLEET);
  expect(getAll).toHaveBeenCalledTimes(1);
  expect(fleetStamp).toHaveBeenCalledTimes(2);
});

it("walks again when a server is added, archived or edited", async () => {
  await loadServers();
  fleetStamp.mockResolvedValue("acct/org=9002:2026-08-28T10:00:00Z");
  await loadServers();
  expect(getAll).toHaveBeenCalledTimes(2);
});

it("walks again after a manual refresh", async () => {
  await loadServers();
  forgetServers();
  await loadServers();
  expect(getAll).toHaveBeenCalledTimes(2);
});

it("walks rather than serving a stale list when the probe fails", async () => {
  await loadServers();
  fleetStamp.mockRejectedValue(new Error("offline"));
  await loadServers();
  expect(getAll).toHaveBeenCalledTimes(2);
});

it("refetches rather than throwing on a corrupt entry", async () => {
  const { Cache } = await import("../helpers/raycast-stub");
  new Cache().set("servers-list", "{not json");
  expect(await loadServers()).toEqual(FLEET);
});

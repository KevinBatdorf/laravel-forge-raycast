import { beforeEach, expect, it, vi } from "vitest";
import { __resetCache } from "../helpers/raycast-stub";

const walk = vi.hoisted(() => vi.fn());
const tailChanged = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/Server", () => ({ Server: { walk, tailChanged } }));

import { forgetServers, loadServers } from "../../src/hooks/useServers";

const FLEET = [{ id: 1, name: "web-1" }];
const TAIL = { "acct/kevin-batdorf": { cursor: "cur-1", hash: "9001,9002|end" } };

beforeEach(() => {
  __resetCache();
  walk.mockReset().mockResolvedValue({ servers: FLEET, tail: TAIL });
  tailChanged.mockReset().mockResolvedValue(false);
});

it("walks once, then re-reads only the last page", async () => {
  expect(await loadServers()).toEqual(FLEET);
  expect(await loadServers()).toEqual(FLEET);
  expect(walk).toHaveBeenCalledTimes(1);
  expect(tailChanged).toHaveBeenCalledWith(TAIL);
});

it("walks again once the last page stops matching", async () => {
  await loadServers();
  tailChanged.mockResolvedValue(true);
  await loadServers();
  expect(walk).toHaveBeenCalledTimes(2);
});

it("walks again after the hover check empties the cache", async () => {
  await loadServers();
  forgetServers();
  await loadServers();
  expect(walk).toHaveBeenCalledTimes(2);
  expect(tailChanged).not.toHaveBeenCalled();
});

it("walks rather than trusting a list it cannot check", async () => {
  await loadServers();
  tailChanged.mockRejectedValue(new Error("offline"));
  await loadServers();
  expect(walk).toHaveBeenCalledTimes(2);
});

it("refetches rather than throwing on a corrupt entry", async () => {
  const { Cache } = await import("../helpers/raycast-stub");
  new Cache().set("servers-list", "{not json");
  expect(await loadServers()).toEqual(FLEET);
});

import { describe, expect, test } from "bun:test";
import { defineSupacloudConfig, resolveSupacloudConfig } from "./config";

describe("SupaCloud default configuration", () => {
  test("provides a strict zero-config project baseline", () => {
    expect(defineSupacloudConfig()).toMatchObject({
      root: "src",
      outDir: "generated",
      strict: true,
      generateClient: true,
      generatePermissions: true,
      treeShakeUnusedProviders: true,
      moduleBoundaryPreset: "modular-monolith",
    });
  });

  test("allows explicit values to override safe defaults", () => {
    expect(resolveSupacloudConfig({
      root: "app",
      outDir: "dist/app",
      strict: false,
      generateClient: false,
      moduleBoundaryPreset: "clean-architecture",
    }, "/workspace")).toMatchObject({
      rootDir: "/workspace/app",
      outDir: "/workspace/dist/app",
      strict: false,
      generateClient: false,
      generatePermissions: true,
      moduleBoundaryPreset: "clean-architecture",
    });
  });
});

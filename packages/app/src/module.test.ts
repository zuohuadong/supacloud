import { describe, expect, test } from "bun:test";
import { getModuleMeta, Injectable, Module } from "./decorators";
import { defineFeatureSlice, defineFeatureSpec, defineModule } from "./module";

describe("defineModule", () => {
  test("produces metadata identical to @Module", () => {
    @Injectable()
    class CaseService {}

    @Module({ name: "case", providers: [CaseService], exports: [CaseService] })
    class DecoratedModule {}

    const DefinedModule = defineModule({
      name: "case",
      providers: [CaseService],
      exports: [CaseService],
    });

    expect(getModuleMeta(DefinedModule)).toEqual(getModuleMeta(DecoratedModule));
    expect(DefinedModule.name).toBe("case");
  });
});

describe("feature declarations", () => {
  test("keeps explicit spec metadata on a normal module", () => {
    const spec = defineFeatureSpec({
      name: "case",
      states: ["draft", "accepted"],
      transitions: { accept: { from: "draft", to: "accepted", permission: "case.accept" } },
    });
    const feature = defineFeatureSlice({ name: "case", spec });
    expect((feature as unknown as Record<string, unknown>)["supacloud:feature-slice"]).toEqual({ name: "case", spec });
    expect(spec.states).toEqual(["draft", "accepted"]);
  });
});

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { compileProject } from "./compile";
import { createDependencyGraphCache } from "./incremental";
import { GOOD_PROJECT_FILES } from "./fixtures/good-project";
import { FIXTURE_TSCONFIG, RUNTIME_SOURCE } from "./fixtures/runtime-source";
import { writeFixtureProject } from "./fixtures/helpers";

export interface CompilerBenchmarkResult {
  fixtureFiles: number;
  coldCompileMs: number;
  incrementalCompileMs: number;
  dependencyInvalidationMs: number;
  generatedBytes: number;
  reusedModules: string[];
  reanalyzedModules: string[];
}

export async function runCompilerBenchmark(): Promise<CompilerBenchmarkResult> {
  const rootDir = await mkdtemp(join(tmpdir(), "supacloud-compiler-benchmark-"));
  await writeFixtureProject(rootDir, {
    ...GOOD_PROJECT_FILES,
    "src/tsconfig.json": FIXTURE_TSCONFIG,
    "src/runtime.ts": RUNTIME_SOURCE,
  });
  const outDir = join(rootDir, "generated");
  const cache = createDependencyGraphCache();
  const options = { rootDir: join(rootDir, "src"), outDir, cache, writeOnError: true };
  const measure = async (): Promise<number> => {
    const start = performance.now();
    await compileProject(options);
    return performance.now() - start;
  };
  const coldCompileMs = await measure();
  const incrementalCompileMs = await measure();
  const service = join(rootDir, "src/features/case/case.service.ts");
  await writeFile(service, `${await readFile(service, "utf8")}\n`, "utf8");
  const start = performance.now();
  const invalidated = await compileProject({ ...options, changedPaths: ["features/case/case.service.ts"] });
  const dependencyInvalidationMs = performance.now() - start;
  const generatedBytes = (await readFile(join(outDir, "application.ts"))).byteLength;
  return {
    fixtureFiles: Object.keys(GOOD_PROJECT_FILES).length + 2,
    coldCompileMs: round(coldCompileMs),
    incrementalCompileMs: round(incrementalCompileMs),
    dependencyInvalidationMs: round(dependencyInvalidationMs),
    generatedBytes,
    reusedModules: invalidated.stats?.reusedModules ?? [],
    reanalyzedModules: invalidated.stats?.reanalyzedModules ?? [],
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

if (import.meta.main) {
  console.log(JSON.stringify(await runCompilerBenchmark(), null, 2));
}

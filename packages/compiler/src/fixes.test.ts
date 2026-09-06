import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyDiagnosticFix } from "./fixes";

describe("applyDiagnosticFix", () => {
  test("previews and atomically applies an explicit permission fix", async () => {
    const root = await mkdtemp(join(tmpdir(), "supacloud-fix-"));
    const file = join(root, "case.ts");
    await writeFile(file, [
      'import { Command } from "@supacloud/app";',
      '@Command({ name: "case.accept" })',
      "export class AcceptCommand {}",
      "",
    ].join("\n"), "utf8");
    const fix = {
      type: "add_command_permission",
      targetFile: file,
      command: "AcceptCommand",
      module: "case",
      permission: "case.accept",
    } as const;
    const preview = await applyDiagnosticFix(fix, { rootDir: root, dryRun: true });
    expect(preview.changed).toBe(true);
    expect(await readFile(file, "utf8")).not.toContain("permission");
    await applyDiagnosticFix(fix, { rootDir: root, dryRun: false });
    expect(await readFile(file, "utf8")).toContain('permission: "case.accept"');
  });

  test("updates module imports and binds the same-named route parameter", async () => {
    const root = await mkdtemp(join(tmpdir(), "supacloud-fix-"));
    const file = join(root, "case.ts");
    await writeFile(file, [
      'import { Controller, Post, defineModule } from "@supacloud/app";',
      'const CaseModule = defineModule({ name: "case", imports: [] });',
      '@Controller("/cases")',
      "export class CaseController {",
      '  @Post("/:id")',
      "  accept(id: unknown) { return id; }",
      "}",
      "",
    ].join("\n"), "utf8");
    await applyDiagnosticFix({
      type: "add_module_import",
      targetFile: file,
      module: "audit",
      provider: "AUDIT_SERVICE",
      importPath: "./audit.module",
      symbol: "AuditModule",
      targetModule: "case",
    }, { rootDir: root, dryRun: false });
    await applyDiagnosticFix({
      type: "add_route_parameter_binding",
      targetFile: file,
      controller: "CaseController",
      route: "accept",
      parameter: "id",
      binding: "param",
    }, { rootDir: root, dryRun: false });
    const result = await readFile(file, "utf8");
    expect(result).toContain('import { AuditModule } from "./audit.module";');
    expect(result).toContain("imports: [AuditModule]");
    expect(result).toContain('@Param("id") id');
    expect(result).toContain("Controller, Post, defineModule, Param");
  });
});

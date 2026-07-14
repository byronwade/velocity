//! Owned build for the custom Zig-view Velocity app. A custom `.main`
//! (src/entry.zig) takes addApp's `.zig` core-tree path (build/app.zig:484),
//! skipping the SDK's tsCoreStage + markup wiring — so we transpile core.ts
//! ourselves and feed the emitted core module to our own entry, which passes
//! a hand-written Zig `.view` instead of `.markup`. Model/Msg/update stay in
//! TypeScript (src/core.ts); only the view is bespoke Zig (src/view.zig).

const std = @import("std");
const native_sdk = @import("native_sdk");

pub fn build(b: *std.Build) void {
    const dep = b.dependency("native_sdk", .{});

    // addAppArtifacts does all platform linking, packaging, and the
    // -Dplatform/-Dweb-engine/-Dautomation/-Doptimize flags, and adds the
    // native_sdk + runner imports to the exe/test modules.
    const art = native_sdk.addAppArtifacts(b, dep, .{ .name = "velocity", .main = "src/entry.zig" });

    // Replicate tsCoreStage's transpile: core.ts -> core.zig.
    const node = b.findProgram(&.{"node"}, &.{}) catch @panic("node is required to transpile the TypeScript core");
    const transpile = b.addSystemCommand(&.{node});
    transpile.addFileArg(dep.path("build/ts_run.mjs"));
    transpile.addFileArg(dep.path("packages/core/src/cli.ts"));
    transpile.addFileArg(b.path("src/core.ts"));
    transpile.addArg("-o");
    const emitted_core = transpile.addOutputFileArg("core.zig");
    transpile.addFileInput(b.path("src/core.ts"));

    // Co-stage core.zig + rt.zig so the emitted `@import("rt.zig")` resolves.
    const staged = b.addWriteFiles();
    const core_root = staged.addCopyFile(emitted_core, "core.zig");
    _ = staged.addCopyFile(dep.path("packages/core/rt/rt.zig"), "rt.zig");

    const core_mod = b.createModule(.{
        .root_source_file = core_root,
        .target = art.exe.root_module.resolved_target,
        .optimize = art.exe.root_module.optimize,
    });
    // Reuse the framework's app_manifest_zon module (the runner already roots
    // app.zon) — creating a second module from the same file is an error.
    const runner_mod = art.exe.root_module.import_table.get("runner").?;
    const manifest_mod = runner_mod.import_table.get("app_manifest_zon").?;

    art.exe.root_module.addImport("core", core_mod);
    art.exe.root_module.addImport("app_manifest_zon", manifest_mod);
    if (art.tests.root_module != art.exe.root_module) {
        art.tests.root_module.addImport("core", core_mod);
        art.tests.root_module.addImport("app_manifest_zon", manifest_mod);
    }
}

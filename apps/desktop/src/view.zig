//! Bespoke Velocity view — hand-drawn with the Zig canvas builder, arbitrary
//! colors and our own components. Model/Msg/update stay in TypeScript
//! (src/core.ts); this reads the transpiled model and dispatches core.Msg.
//! NOTE: panel/card/stack are STACKING containers (children overlap) — they
//! paint the fill; put a row/column inside for flow layout.

const native_sdk = @import("native_sdk");
const canvas = native_sdk.canvas;
const core = @import("core");

const Ui = canvas.Ui(core.Msg);
const Node = Ui.Node;
const Color = canvas.Color;
const Msg = core.Msg;

// ── Palette (arbitrary hex; none of this is a theme token) ──────────────
const shell = Color.rgb8(0x0a, 0x0b, 0x0f);
const panel = Color.rgb8(0x12, 0x14, 0x1b);
const panel_raised = Color.rgb8(0x1c, 0x20, 0x2b);
const well = Color.rgb8(0x0c, 0x0d, 0x12);
const border = Color.rgba8(0xff, 0xff, 0xff, 0x14);
const border_soft = Color.rgba8(0xff, 0xff, 0xff, 0x0a);
const accent = Color.rgb8(0x3b, 0x82, 0xf6);
const accent_hi = Color.rgb8(0x60, 0xa5, 0xfa);
const ink = Color.rgb8(0xe8, 0xea, 0xf0);
const ink_dim = Color.rgb8(0x9a, 0xa0, 0xab);
const muted = Color.rgb8(0x6b, 0x72, 0x82);
const white = Color.rgb8(0xff, 0xff, 0xff);

// ── Small component helpers (single-child panels center their glyph) ─────
fn iconTile(ui: *Ui, comptime glyph: []const u8, fill: Color) Node {
    return ui.panel(.{
        .width = 30,
        .height = 30,
        .main = .center,
        .cross = .center,
        .style = .{ .background = fill, .radius = 8 },
    }, .{
        ui.icon(.{ .style = .{ .foreground = white } }, glyph),
    });
}

fn iconBtn(ui: *Ui, comptime glyph: []const u8, msg: Msg) Node {
    return ui.panel(.{
        .width = 32,
        .height = 32,
        .main = .center,
        .cross = .center,
        .on_press = msg,
        .style = .{ .background = panel_raised, .radius = 8 },
    }, .{
        ui.icon(.{ .style = .{ .foreground = ink_dim } }, glyph),
    });
}

fn primaryBtn(ui: *Ui, label: []const u8, msg: Msg) Node {
    return ui.panel(.{
        .height = 32,
        .padding = 12,
        .main = .center,
        .cross = .center,
        .on_press = msg,
        .style = .{ .background = accent, .radius = 9 },
    }, .{
        ui.text(.{ .size = .sm, .style = .{ .foreground = white } }, label),
    });
}

fn ghostBtn(ui: *Ui, label: []const u8, msg: Msg) Node {
    return ui.panel(.{
        .height = 32,
        .padding = 12,
        .main = .center,
        .cross = .center,
        .on_press = msg,
        .style = .{ .background = panel_raised, .radius = 9, .border = border, .stroke_width = 1 },
    }, .{
        ui.text(.{ .size = .sm, .style = .{ .foreground = ink } }, label),
    });
}

// ── File tree ───────────────────────────────────────────────────────────
fn fileKey(item: *const *const core.FileEntry) canvas.UiKey {
    return canvas.uiKey(@as(u64, @intCast(item.*.id)));
}

fn fileRow(ui: *Ui, model: *const core.Model, item: *const *const core.FileEntry) Node {
    const f = item.*;
    const active = f.id == model.activeFile;
    const bg = if (active) panel_raised else panel;
    const name_color = if (active) accent_hi else ink;
    return ui.panel(.{
        .on_press = Msg{ .open_file = f.id },
        .style = .{ .background = bg, .radius = 9 },
    }, .{
        ui.row(.{ .padding = 8, .cross = .center, .gap = 10 }, .{
            iconTile(ui, "file-text", accent),
            ui.text(.{ .grow = 1, .style = .{ .foreground = name_color } }, f.name),
            ui.icon(.{ .style = .{ .foreground = muted } }, "chevron-right"),
        }),
    });
}

// ── Agent messages ──────────────────────────────────────────────────────
fn msgKey(item: *const *const core.ChatMsg) canvas.UiKey {
    return canvas.uiKey(@as(u64, @intCast(item.*.id)));
}

fn msgRow(ui: *Ui, item: *const *const core.ChatMsg) Node {
    const m = item.*;
    if (m.fromUser) {
        return ui.panel(.{ .style = .{ .background = panel_raised, .radius = 12 } }, .{
            ui.column(.{ .padding = 11 }, .{
                ui.text(.{ .style = .{ .foreground = ink } }, m.text),
            }),
        });
    }
    return ui.row(.{ .gap = 10 }, .{
        iconTile(ui, "send", accent),
        ui.column(.{ .grow = 1, .gap = 3 }, .{
            ui.text(.{ .size = .sm, .style = .{ .foreground = accent_hi } }, "Velocity"),
            ui.text(.{ .style = .{ .foreground = ink } }, m.text),
        }),
    });
}

// ── View ────────────────────────────────────────────────────────────────
pub fn view(ui: *Ui, model: *const core.Model) Node {
    return ui.column(.{
        .grow = 1,
        .padding = 14,
        .gap = 14,
        .style = .{ .background = shell },
    }, .{
        header(ui, model),
        ui.row(.{ .grow = 1, .gap = 14 }, .{
            sidebar(ui, model),
            editor(ui, model),
            agent(ui, model),
        }),
    });
}

fn header(ui: *Ui, model: *const core.Model) Node {
    return ui.panel(.{ .style = .{ .background = panel, .radius = 14, .border = border, .stroke_width = 1 } }, .{
        ui.row(.{ .padding = 12, .cross = .center, .gap = 10 }, .{
            iconTile(ui, "terminal", accent),
            ui.text(.{ .size = .lg, .style = .{ .foreground = ink } }, "Velocity"),
            ui.panel(.{ .style = .{ .background = panel_raised, .radius = 7 } }, .{
                ui.row(.{ .padding = 5, .cross = .center, .gap = 5 }, .{
                    ui.icon(.{ .style = .{ .foreground = accent_hi } }, "git-branch"),
                    ui.text(.{ .size = .sm, .style = .{ .foreground = ink_dim } }, "main"),
                }),
            }),
            ui.spacer(1),
            ui.text(.{ .style = .{ .foreground = ink_dim } }, model.activeName()),
            ui.spacer(1),
            iconBtn(ui, "search", Msg.open_palette),
            iconBtn(ui, "settings", Msg.open_settings),
            iconBtn(ui, "panel-right", Msg.toggle_agent),
            ui.avatar(.{ .width = 30, .height = 30 }, "BW"),
            primaryBtn(ui, "Save", Msg.save_file),
        }),
    });
}

fn sidebar(ui: *Ui, model: *const core.Model) Node {
    return ui.panel(.{ .width = 256, .style = .{ .background = panel, .radius = 14, .border = border, .stroke_width = 1 } }, .{
        ui.column(.{ .grow = 1, .padding = 14, .gap = 12 }, .{
            ui.row(.{ .cross = .center, .gap = 8 }, .{
                ui.text(.{ .size = .sm, .grow = 1, .style = .{ .foreground = ink } }, "EXPLORER"),
                iconBtn(ui, "plus", Msg.new_file),
            }),
            ui.scroll(.{ .grow = 1 }, ui.column(.{ .gap = 4 }, ui.eachCtx(model, model.files, fileKey, fileRow))),
        }),
    });
}

fn editor(ui: *Ui, model: *const core.Model) Node {
    return ui.panel(.{ .grow = 1, .style = .{ .background = panel, .radius = 14, .border = border, .stroke_width = 1 } }, .{
        ui.column(.{ .grow = 1, .padding = 14, .gap = 12 }, .{
            ui.row(.{ .cross = .center, .gap = 10 }, .{
                ui.text(.{ .size = .lg, .grow = 1, .style = .{ .foreground = ink } }, "Live Editor"),
                ghostBtn(ui, "Preview", Msg.toggle_preview),
                ghostBtn(ui, "Reload", Msg.reload_file),
            }),
            ui.text(.{ .size = .sm, .style = .{ .foreground = muted } }, model.activeName()),
            ui.panel(.{ .grow = 1, .style = .{ .background = well, .radius = 12, .border = border_soft, .stroke_width = 1 } }, .{
                ui.scroll(.{ .grow = 1 }, ui.column(.{ .padding = 16 }, .{
                    ui.text(.{ .style = .{ .foreground = ink } }, model.doc.text),
                })),
            }),
        }),
    });
}

fn agent(ui: *Ui, model: *const core.Model) Node {
    return ui.panel(.{ .width = 336, .style = .{ .background = panel, .radius = 14, .border = border, .stroke_width = 1 } }, .{
        ui.column(.{ .grow = 1, .padding = 14, .gap = 12 }, .{
            ui.row(.{ .cross = .center, .gap = 8 }, .{
                ui.text(.{ .size = .lg, .grow = 1, .style = .{ .foreground = ink } }, "Agent"),
                iconBtn(ui, "x", Msg.toggle_agent),
            }),
            ui.scroll(.{ .grow = 1 }, ui.column(.{ .gap = 16 }, ui.each(model.messages, msgKey, msgRow))),
            ui.panel(.{ .style = .{ .background = panel_raised, .radius = 12, .border = border, .stroke_width = 1 } }, .{
                ui.row(.{ .padding = 12, .cross = .center, .gap = 10 }, .{
                    ui.text(.{ .grow = 1, .style = .{ .foreground = muted } }, "Tell the agent what to do…"),
                    primaryBtn(ui, "Send", Msg.send_message),
                }),
            }),
        }),
    });
}

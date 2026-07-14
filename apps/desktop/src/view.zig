//! Bespoke Velocity view, drawn with the Zig canvas builder. Testing whether
//! ui.panel paints an ARBITRARY hex color (not just theme tokens).

const native_sdk = @import("native_sdk");
const canvas = native_sdk.canvas;
const core = @import("core");

const Ui = canvas.Ui(core.Msg);
const Color = canvas.Color;

pub fn view(ui: *Ui, model: *const core.Model) Ui.Node {
    _ = model;
    return ui.column(.{ .grow = 1, .padding = 20, .gap = 16 }, .{
        ui.panel(.{
            .padding = 18,
            .cross = .center,
            .gap = 10,
            .style = .{ .background = Color.rgb8(0x1c, 0x64, 0xf2), .radius = 16 },
        }, .{
            ui.text(.{ .size = .lg, .style = .{ .foreground = Color.rgb8(0xff, 0xff, 0xff) } }, "Velocity"),
        }),
        ui.panel(.{
            .padding = 18,
            .grow = 1,
            .style = .{
                .background = Color.rgb8(0x14, 0x16, 0x1c),
                .border = Color.rgba8(255, 255, 255, 30),
                .radius = 16,
                .stroke_width = 1,
            },
        }, .{
            ui.text(.{ .style = .{ .foreground = Color.rgb8(0xc8, 0xcc, 0xd4) } }, "Custom Zig view — arbitrary colors, our own components."),
        }),
    });
}

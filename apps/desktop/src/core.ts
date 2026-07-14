// Velocity app core: Model, Msg, update — plain TypeScript in the
// app-core subset, compiled to native Zig at build time (no JS runtime
// ships in the binary). The view lives in app.native and binds this
// model by its field names exactly as written here (`welcomed` binds as
// `{welcomed}`).
//
// The loop: edit here -> `native dev --core` for instant logic checks
// under node -> `native dev` to run the real app. `native check`
// verifies this file and the markup together.
//
// This is the Stage 2 placeholder shell; Stage 4 replaces it with the
// Settings screen and the app model grows from there.

export interface Model {
  readonly welcomed: boolean;
}

export type Msg =
  | { readonly kind: "dismiss_welcome" }
  | { readonly kind: "show_welcome" };

export function initialModel(): Model {
  return { welcomed: false };
}

export function update(model: Model, msg: Msg): Model {
  switch (msg.kind) {
    case "dismiss_welcome":
      return { ...model, welcomed: true };
    case "show_welcome":
      return { ...model, welcomed: false };
  }
}

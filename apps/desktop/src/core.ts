// Velocity app core — Model, Msg, update in the app-core subset, compiled
// to native Zig at build time. The view (src/app.native) binds these field
// names verbatim; exported single-model helpers (categories) become
// bindings too, and `for each="categories"` iterates the returned slice.

import { asciiBytes } from "@native-sdk/core";
import { type TextInputEvent, type TextEditState, applyTextInputEvent } from "@native-sdk/core/text";

// Which top-level screen the workbench shows.
export type Screen = "editor" | "settings";

// The active editor buffer's capacity (bytes). applyTextInputEvent refuses
// inserts past this; we drop them rather than partially apply.
const DOC_CAPACITY = 1_000_000;

const WELCOME_DOC = asciiBytes(
  "// Welcome to Velocity - a native code editor.\n// This buffer is real: every keystroke runs through the SDK's\n// applyTextInputEvent byte-splice engine in src/core.ts.\n\nexport function hello(name) {\n  return greet(name);\n}\n",
);

export type CategoryId = "general" | "editor" | "ai" | "appearance" | "about";
export type StartupMode = "restore" | "welcome" | "empty";
export type DataSharing = "none" | "errors" | "usage";

export interface Category {
  readonly id: CategoryId;
  readonly label: Uint8Array;
}

// A rodata table (folds at compile time; shared for free at commit).
const CATEGORIES: readonly Category[] = [
  { id: "general", label: asciiBytes("General") },
  { id: "editor", label: asciiBytes("Editor") },
  { id: "ai", label: asciiBytes("AI") },
  { id: "appearance", label: asciiBytes("Appearance") },
  { id: "about", label: asciiBytes("About") },
];

export interface Model {
  // Workbench
  readonly screen: Screen;
  // Editor buffer
  readonly docName: Uint8Array;
  readonly doc: TextEditState;
  readonly dirty: boolean;
  // Settings
  readonly category: CategoryId;
  readonly loggedIn: boolean;
  readonly showTips: boolean;
  readonly startupMode: StartupMode;
  readonly notifyUpdates: boolean;
  readonly notifySounds: boolean;
  readonly dataSharing: DataSharing;
}

export function initialModel(): Model {
  return {
    screen: "editor",
    docName: asciiBytes("welcome.ts"),
    doc: {
      text: WELCOME_DOC,
      selection: { anchor: WELCOME_DOC.length, focus: WELCOME_DOC.length },
      composition: null,
    },
    dirty: false,
    category: "general",
    loggedIn: true,
    showTips: true,
    startupMode: "restore",
    notifyUpdates: true,
    notifySounds: false,
    dataSharing: "errors",
  };
}

// The sidebar iterable: `for each="categories" as="c"` reads this.
export function categories(_model: Model): readonly Category[] {
  return CATEGORIES;
}

// Editor status readout: byte length of the active buffer.
export function byteCount(model: Model): number {
  return model.doc.text.length;
}

export type Msg =
  | { readonly kind: "open_settings" }
  | { readonly kind: "open_editor" }
  | { readonly kind: "edit"; readonly edit: TextInputEvent }
  | { readonly kind: "select_category"; readonly category: CategoryId }
  | { readonly kind: "toggle_tips" }
  | { readonly kind: "set_startup_restore" }
  | { readonly kind: "set_startup_welcome" }
  | { readonly kind: "set_startup_empty" }
  | { readonly kind: "toggle_notify_updates" }
  | { readonly kind: "toggle_notify_sounds" }
  | { readonly kind: "set_sharing_none" }
  | { readonly kind: "set_sharing_errors" }
  | { readonly kind: "set_sharing_usage" }
  | { readonly kind: "log_out" };

export function update(model: Model, msg: Msg): Model {
  switch (msg.kind) {
    case "open_settings":
      return { ...model, screen: "settings" };
    case "open_editor":
      return { ...model, screen: "editor" };
    case "edit": {
      const next = applyTextInputEvent(model.doc, msg.edit, DOC_CAPACITY);
      if (next === null) return model;
      // Caret/selection moves don't dirty the buffer; every other event does.
      let changed = true;
      switch (msg.edit.kind) {
        case "move_caret":
        case "set_selection":
          changed = false;
          break;
        default:
          break;
      }
      return { ...model, doc: next, dirty: model.dirty || changed };
    }
    case "select_category":
      return { ...model, category: msg.category };
    case "toggle_tips":
      return { ...model, showTips: !model.showTips };
    case "set_startup_restore":
      return { ...model, startupMode: "restore" };
    case "set_startup_welcome":
      return { ...model, startupMode: "welcome" };
    case "set_startup_empty":
      return { ...model, startupMode: "empty" };
    case "toggle_notify_updates":
      return { ...model, notifyUpdates: !model.notifyUpdates };
    case "toggle_notify_sounds":
      return { ...model, notifySounds: !model.notifySounds };
    case "set_sharing_none":
      return { ...model, dataSharing: "none" };
    case "set_sharing_errors":
      return { ...model, dataSharing: "errors" };
    case "set_sharing_usage":
      return { ...model, dataSharing: "usage" };
    case "log_out":
      return { ...model, loggedIn: false };
  }
}

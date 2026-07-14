// Velocity app core — Model, Msg, update in the app-core subset, compiled
// to native Zig at build time. The view (src/app.native) binds these field
// names verbatim; exported single-model helpers (categories) become
// bindings too, and `for each="categories"` iterates the returned slice.

import { asciiBytes, Cmd } from "@native-sdk/core";
import { type TextInputEvent, type TextEditState, applyTextInputEvent } from "@native-sdk/core/text";

// Which top-level screen the workbench shows.
export type Screen = "editor" | "settings";

// The last filesystem-effect outcome, shown in the status bar.
export type SaveStatus = "none" | "saved" | "save_failed" | "reloaded" | "reload_failed";

const ST_SAVED = asciiBytes("saved");
const ST_SAVE_FAILED = asciiBytes("save failed");
const ST_RELOADED = asciiBytes("reloaded");
const ST_RELOAD_FAILED = asciiBytes("reload failed");
const ST_NONE = asciiBytes("");

// The active editor buffer's capacity (bytes). applyTextInputEvent refuses
// inserts past this; we drop them rather than partially apply.
const DOC_CAPACITY = 1_000_000;

// One file open in the workbench: a stable id, a display name, its
// on-disk path (relative to the app's working directory), and its bytes.
export interface FileEntry {
  readonly id: number;
  readonly name: Uint8Array;
  readonly path: Uint8Array;
  readonly content: Uint8Array;
}

// The seed workspace (a rodata table). Save/Reload persist these to real
// files under .velocity-workspace/ via Cmd.writeFile / Cmd.readFile.
const FILES: readonly FileEntry[] = [
  {
    id: 0,
    name: asciiBytes("welcome.ts"),
    path: asciiBytes(".velocity-workspace/welcome.ts"),
    content: asciiBytes(
      "// Welcome to Velocity - a native code editor.\n// This buffer is real: every keystroke runs through the SDK's\n// applyTextInputEvent byte-splice engine in src/core.ts.\n\nexport function hello(name) {\n  return greet(name);\n}\n",
    ),
  },
  {
    id: 1,
    name: asciiBytes("editor.ts"),
    path: asciiBytes(".velocity-workspace/editor.ts"),
    content: asciiBytes(
      "// The editor buffer is a TextEditState { text, selection, composition }.\n// Save writes it to disk with Cmd.writeFile; Reload reads it with Cmd.readFile.\n\nexport const tabWidth = 2;\n",
    ),
  },
  {
    id: 2,
    name: asciiBytes("README.md"),
    path: asciiBytes(".velocity-workspace/README.md"),
    content: asciiBytes(
      "# Velocity\n\nA fast, tiny, native AI code editor built on the Native SDK.\n\n- Native-rendered UI (no DOM, no browser)\n- Single small binary\n",
    ),
  },
];

// One line in the agent conversation.
export interface ChatMsg {
  readonly id: number;
  readonly fromUser: boolean;
  readonly text: Uint8Array;
}

const EMPTY_TEXT = asciiBytes("");

const GREETING = asciiBytes(
  "Hi — I'm the Velocity agent (a native stub for now). Ask me anything; wiring me to a real model is a later stage.",
);

const AGENT_REPLY = asciiBytes(
  "Got it. I'm a native stub reply — the real agent lands when FS + effects are wired (Stage 5.4+).",
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
  // Editor: the open files and which one is active + its live edit buffer
  readonly files: readonly FileEntry[];
  readonly activeFile: number;
  readonly doc: TextEditState;
  readonly dirty: boolean;
  readonly saveStatus: SaveStatus;
  // Agent pane
  readonly agentOpen: boolean;
  readonly messages: readonly ChatMsg[];
  readonly compose: TextEditState;
  readonly nextMsgId: number;
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
    files: FILES,
    activeFile: 0,
    doc: {
      text: FILES[0].content,
      selection: { anchor: 0, focus: 0 },
      composition: null,
    },
    dirty: false,
    saveStatus: "none",
    agentOpen: true,
    messages: [{ id: 0, fromUser: false, text: GREETING }],
    compose: { text: EMPTY_TEXT, selection: { anchor: 0, focus: 0 }, composition: null },
    nextMsgId: 1,
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

// The active file's name / on-disk path, for the title bar and effects.
export function activeName(model: Model): Uint8Array {
  return model.files[model.activeFile].name;
}

function activePath(model: Model): Uint8Array {
  return model.files[model.activeFile].path;
}

// The status-bar label for the last filesystem outcome.
export function statusLabel(model: Model): Uint8Array {
  switch (model.saveStatus) {
    case "saved":
      return ST_SAVED;
    case "save_failed":
      return ST_SAVE_FAILED;
    case "reloaded":
      return ST_RELOADED;
    case "reload_failed":
      return ST_RELOAD_FAILED;
    default:
      return ST_NONE;
  }
}

// A copy of the files table with one entry's content replaced (owned array).
function withFileContent(
  files: readonly FileEntry[],
  index: number,
  content: Uint8Array,
): readonly FileEntry[] {
  const out: FileEntry[] = [];
  for (let i = 0; i < files.length; i++) {
    if (i === index) {
      out.push({ id: files[i].id, name: files[i].name, path: files[i].path, content: content });
    } else {
      out.push(files[i]);
    }
  }
  return out;
}

// A copy of the messages with one appended (owned array).
function appended(messages: readonly ChatMsg[], one: ChatMsg): readonly ChatMsg[] {
  const out: ChatMsg[] = [];
  for (let i = 0; i < messages.length; i++) {
    out.push(messages[i]);
  }
  out.push(one);
  return out;
}

export type Msg =
  | { readonly kind: "open_settings" }
  | { readonly kind: "open_editor" }
  | { readonly kind: "open_file"; readonly index: number }
  | { readonly kind: "edit"; readonly edit: TextInputEvent }
  | { readonly kind: "save_file" }
  | { readonly kind: "reload_file" }
  | { readonly kind: "saved" }
  | { readonly kind: "save_failed"; readonly error: Uint8Array }
  | { readonly kind: "loaded"; readonly content: Uint8Array }
  | { readonly kind: "load_failed"; readonly error: Uint8Array }
  | { readonly kind: "toggle_agent" }
  | { readonly kind: "compose_edit"; readonly edit: TextInputEvent }
  | { readonly kind: "send_message" }
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

// Result arms dispatched by the host after a Cmd completes (never bound in
// markup) — declared so `native check`'s unbound-state lint stays honest.
export const viewUnbound = ["saved", "save_failed", "loaded", "load_failed"] as const;

export function update(model: Model, msg: Msg): Model | [Model, Cmd<Msg>] {
  switch (msg.kind) {
    case "open_settings":
      return { ...model, screen: "settings" };
    case "open_editor":
      return { ...model, screen: "editor" };
    case "open_file": {
      if (msg.index < 0 || msg.index >= model.files.length) return model;
      if (msg.index === model.activeFile) return { ...model, screen: "editor" };
      // Save the active buffer back, then load the selected file.
      const saved = withFileContent(model.files, model.activeFile, model.doc.text);
      const content = saved[msg.index].content;
      return {
        ...model,
        screen: "editor",
        files: saved,
        activeFile: msg.index,
        doc: { text: content, selection: { anchor: 0, focus: 0 }, composition: null },
        dirty: false,
        saveStatus: "none",
      };
    }
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
    case "save_file":
      // Effects are data: the host writes the file, then dispatches an arm.
      return [
        { ...model, saveStatus: "none" },
        Cmd.writeFile(activePath(model), model.doc.text, { ok: "saved", err: "save_failed" }),
      ];
    case "reload_file":
      return [model, Cmd.readFile(activePath(model), { ok: "loaded", err: "load_failed" })];
    case "saved":
      return { ...model, dirty: false, saveStatus: "saved" };
    case "save_failed":
      return { ...model, saveStatus: "save_failed" };
    case "loaded":
      return {
        ...model,
        doc: { text: msg.content, selection: { anchor: 0, focus: 0 }, composition: null },
        dirty: false,
        saveStatus: "reloaded",
      };
    case "load_failed":
      return { ...model, saveStatus: "reload_failed" };
    case "toggle_agent":
      return { ...model, agentOpen: !model.agentOpen };
    case "compose_edit": {
      const next = applyTextInputEvent(model.compose, msg.edit, DOC_CAPACITY);
      if (next === null) return model;
      return { ...model, compose: next };
    }
    case "send_message": {
      if (model.compose.text.length === 0) return model;
      const userMsg: ChatMsg = { id: model.nextMsgId, fromUser: true, text: model.compose.text };
      const replyMsg: ChatMsg = { id: model.nextMsgId + 1, fromUser: false, text: AGENT_REPLY };
      const withUser = appended(model.messages, userMsg);
      const withReply = appended(withUser, replyMsg);
      return {
        ...model,
        messages: withReply,
        nextMsgId: model.nextMsgId + 2,
        compose: { text: EMPTY_TEXT, selection: { anchor: 0, focus: 0 }, composition: null },
      };
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

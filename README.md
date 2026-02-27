# DeltaModel Architecture Assistant 

Vanilla HTML/CSS/JS prototype for creating architecture content with:
- data-centric input (elements + relationships tables)
- diagram-driven input and visualization (SVG)
- baseline-aware compliance checks with explicit deviation acceptance

## Frontend Only
Use any local static server from this folder (recommended), then open `index.html`.

## Desktop App Runtimes
This project is structured to support both wrappers in parallel:
- `src-tauri/` for Tauri
- `src-electron/` for Electron

### Tauri Prerequisites
- Rust toolchain (`cargo`, `rustc`, e.g. via Homebrew)
- Tauri CLI:
  - via Cargo: `cargo install tauri-cli`
  - or use `cargo tauri ...` if already available
- Python 3 (used for the lightweight dev web server in Tauri dev mode)

### Tauri Development Mode (fast refresh, no rebuild each change)
Run from project root:

```bash
cargo tauri dev
```

How it works:
- Tauri starts a local static server (`python3 -m http.server 1420 --directory ..`).
- The app loads `http://127.0.0.1:1420`.
- Native app menu includes `View -> Reload` (`Cmd+R` / `Ctrl+R`).
- No production build is required for each frontend change.

### Tauri Production Build
```bash
cargo tauri build
```

### Electron Prerequisites
- Node.js + npm
- Install dependencies once in project root:

```bash
npm install
```

### Electron Development Mode
Run from project root:

```bash
npm run electron:dev
```

How it works:
- Starts a local static server on `http://127.0.0.1:1420`.
- Launches Electron with native menu + preload bridge.
- Frontend reload via `View -> Reload` (`Cmd+R` / `Ctrl+R`).

### Electron Local Production-Like Run
Run from project root:

```bash
npm run electron:prod
```

This loads `frontend-dist/index.html` in Electron.

### Electron Production Build (Installers/Apps)
Run from project root:

```bash
npm run electron:build
```

Platform-specific:

```bash
npm run electron:build:mac
npm run electron:build:win
npm run electron:build:linux
```

Notes:
- Build output is written to `dist-electron/`.
- The build step auto-prepares `frontend-dist/` before packaging.
- Cross-platform packaging has OS constraints (e.g. macOS artifacts require macOS).

### Electron GitHub Release Upload
You can upload Electron artifacts from `dist-electron/` to a GitHub release using:

```bash
npm run release:electron -- v0.1.0 --build-all --draft
```

Interactive mode (recommended):

```bash
npm run release:electron
```

Notes:
- Requires GitHub CLI `gh` and an authenticated session (`gh auth login`).
- When passing script flags via npm, use `--`, for example:
  - `npm run release:electron -- --build-all`
- `--build-all` attempts `mac`, `win`, and `linux` builds, then uploads available artifacts.
- If release tag already exists, assets are uploaded with overwrite (`--clobber`).
- Without a tag, the script prompts for:
  - current version overwrite, or
  - new higher version (patch/minor/major/custom), then updates `package.json`, `package-lock.json`, and `src-tauri/Cargo.toml`.

## Compliance Behavior
- The app auto-loads `metaModels/NAFv4-ADMBw-2025.10.meta.json` as baseline.
- Additional open metamodel files can be placed in `metaModels/`.
- Only `*.meta.json` files are treated as selectable bundled metamodels.
- Open metamodels use `architectureMetaModel` (schema v2): `architecture.views`, `architecture.nodeTypes`, `architecture.edgeTypes`.
- Edge visualization can be defined in the metamodel via `edgeTypes[].strokeStyle` (`solid`, `dashed`, `dotted`).
- Category colors are part of the metamodel (`categoryColors`) and are edited in the `MetaModel` tab.
- Existing MDG XML files are still supported via `File -> Load MDG XML...` and converted in-memory to the same open metamodel structure.
- If loading fails, it uses a fallback baseline.
- Each element/relationship is checked against baseline viewpoints/stereotypes.
- Deviations are visibly marked as `Deviation`.
- Users can explicitly accept a deviation (`Accept`), which keeps it visible but treated as acknowledged.

## Native Menu
- `File -> Load Architecture...`
- `File -> Save Architecture As...`
- `File -> Load MetaModel JSON...`
- `File -> Load MDG XML...`
- `View -> Reload`

## Data Model
Elements:
- `id`, `name`, `type`, `viewpoint`, `description`, `allowDeviation`, `x`, `y`

Relationships:
- `id`, `sourceId`, `targetId`, `type`, `description`, `allowDeviation`

## Notes
- This is a first draft focused on workflow and transparency.
- No external libraries are used.

## License
- This project is licensed under **GNU AGPL v3.0 only** (`AGPL-3.0-only`).
- See [LICENSE](LICENSE) for the license terms.
- See [LICENSE-FAQ.md](LICENSE-FAQ.md) for practical guidance.

## Future Commercial Licensing
- The project currently starts under AGPL.
- A separate commercial license can be introduced later.

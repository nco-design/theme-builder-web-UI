# Browser Theme Builder TODO

Goal: build a SpruceOS theme entirely in the browser from an imported theme
project ZIP. The first version has no icon-pack support and never uploads user
files to a server.

## 1. Define the first supported scope

- [x] Support SpruceOS only.
- [x] Support the base profile first; decide whether `720p` is included in the
      first release or follows as a separate task.
- [x] Document that icon packs are intentionally not generated yet.

> Support SpruceOS only for now, other frontends will be added later
> Do NOT include options, keep the tool as simple as possible, there won't be any tweaking besides choosing a front-end and a palette

## 2. Create the tool page

- [x] Add the new tool to the web tools index.
- [x] Create the page scaffold: import project ZIP, frontend selector, palette
      selector and Generate button.
- [x] Reuse the shared header, footer and visual styles.

## 3. Read and validate a project ZIP

- [x] Add a browser-side ZIP reader.
- [x] Locate and parse `project-config.json`, `source-palette.json`, `palettes/`
      and `assets/`.
- [x] Display clear errors for invalid, incomplete or unsupported projects.

## 4. Load a front-end definition

- [x] Read `frontend.json`, theme asset maps and placeholder static files.
- [x] Populate the frontend selector from the available definitions.
- [x] Populate the palette selector from the imported project.
- [x] Support `config-file` IDs and optional frontend profiles.

## 5. Build static files and configuration

- [ ] Copy placeholder static files, then apply same-name project overrides.
- [ ] Inject palette bindings into each generated config file.
- [ ] Apply `config-overrides` by config-file ID.
- [ ] Add generated metadata to config files.

## 6. Render theme assets in the browser

- [ ] Port source-palette color replacement to browser code.
- [ ] Render SVG assets using each front-end asset map.
- [ ] Support PNG and SVG outputs, output size, opacity and background rules.
- [ ] Evaluate a reliable browser/WASM SVG-to-PNG renderer before implementing
      the final renderer.

## 7. Export and test

- [ ] Create the generated SpruceOS folder structure in a ZIP.
- [ ] Make the ZIP downloadable from the browser.
- [ ] Compare the output with `spruce-theme-builder` using fixed fixture
      projects and palettes.
- [ ] Test desktop and mobile browsers with a project containing a background,
      custom font and custom navigation icons.

## 8. Polish the beginner workflow

- [ ] Add progress feedback while reading, rendering and packaging.
- [ ] Explain the generated ZIP installation path for SpruceOS.
- [ ] Clearly label unsupported features and known differences from the Node
      builder.

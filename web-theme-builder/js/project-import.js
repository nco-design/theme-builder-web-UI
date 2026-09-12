(function () {
  "use strict";

  const app = window.WebThemeBuilder = window.WebThemeBuilder || {};
  const fileInput = document.querySelector("[data-project-file]");
  const status = document.querySelector("[data-project-status]");
  const summary = document.querySelector("[data-project-summary]");
  const projectName = document.querySelector("[data-project-name]");
  const paletteCount = document.querySelector("[data-palette-count]");
  const assetCount = document.querySelector("[data-asset-count]");

  function setStatus(message, state) {
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  function resetProject() {
    app.project = null;
    app.selectedPalette = null;
    app.selectedFrontend = null;
    app.resetBuildOptions?.();
    summary.hidden = true;
    projectName.textContent = "";
    paletteCount.textContent = "";
    assetCount.textContent = "";
  }

  function parseObject(text, path) {
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error(`${path} contains invalid JSON.`);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${path} must contain a JSON object.`);
    }
    return value;
  }

  function findProjectRoot(paths) {
    const matches = paths.filter((path) => path === "project-config.json"
      || path.endsWith("/project-config.json"));

    if (matches.length === 0) {
      throw new Error("Missing project-config.json. Select a Spruce Theme Builder project ZIP.");
    }
    if (matches.length > 1) {
      throw new Error("The ZIP contains more than one project. Keep only one project folder.");
    }

    return matches[0].slice(0, -"project-config.json".length);
  }

  async function readJson(archive, path) {
    return parseObject(await archive.readText(path), path);
  }

  async function validateProject(archive) {
    const paths = archive.paths();
    const root = findProjectRoot(paths);
    const configPath = `${root}project-config.json`;
    const sourcePalettePath = `${root}source-palette.json`;
    const palettesPrefix = `${root}palettes/`;
    const assetsPrefix = `${root}assets/`;

    if (!archive.has(sourcePalettePath)) {
      throw new Error("Missing source-palette.json in the project root.");
    }

    const palettePaths = paths.filter((path) => path.startsWith(palettesPrefix)
      && path.slice(palettesPrefix.length).length > 0
      && path.toLowerCase().endsWith(".json"));
    if (palettePaths.length === 0) {
      throw new Error("The project must contain at least one JSON palette in palettes/.");
    }

    const assetPaths = paths.filter((path) => path.startsWith(assetsPrefix)
      && path.slice(assetsPrefix.length).length > 0);
    if (assetPaths.length === 0) {
      throw new Error("The project assets/ folder is missing or empty.");
    }

    const config = await readJson(archive, configPath);
    const sourcePalette = await readJson(archive, sourcePalettePath);
    if (typeof config["theme-name"] !== "string" || !config["theme-name"].trim()) {
      throw new Error("project-config.json must define a non-empty theme-name.");
    }
    if (!config["frontend-configs"] || typeof config["frontend-configs"] !== "object"
      || Array.isArray(config["frontend-configs"]) || Object.keys(config["frontend-configs"]).length === 0) {
      throw new Error("project-config.json must contain at least one frontend configuration.");
    }
    if (Object.keys(sourcePalette).length === 0) {
      throw new Error("source-palette.json must not be empty.");
    }

    const palettes = [];
    for (const path of palettePaths) {
      const palette = await readJson(archive, path);
      if (typeof palette["palette-name"] !== "string" || !palette["palette-name"].trim()) {
        throw new Error(`${path} must define a non-empty palette-name.`);
      }
      if (!palette.properties || typeof palette.properties !== "object" || Array.isArray(palette.properties)) {
        throw new Error(`${path} must define a properties object.`);
      }
      palettes.push({ path, palette });
    }

    return { archive, assetPaths, config, palettes, root, sourcePalette };
  }

  fileInput.addEventListener("change", async () => {
    resetProject();
    const file = fileInput.files[0];
    if (!file) {
      setStatus("No project imported.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setStatus("Choose a ZIP file exported by Spruce Theme Builder.", "error");
      return;
    }

    fileInput.disabled = true;
    setStatus("Reading and validating the project…", "loading");

    try {
      const archive = await app.readZip(file);
      app.project = await validateProject(archive);
      await app.frontendsReady;
      app.populateBuildOptions(app.project);
      projectName.textContent = app.project.config["theme-name"];
      paletteCount.textContent = String(app.project.palettes.length);
      assetCount.textContent = String(app.project.assetPaths.length);
      summary.hidden = false;
      setStatus("Project imported successfully.", "success");
    } catch (error) {
      console.error(error);
      resetProject();
      setStatus(error.message || "The project could not be imported.", "error");
    } finally {
      fileInput.disabled = false;
    }
  });
}());

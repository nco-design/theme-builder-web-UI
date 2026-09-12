(function () {
  "use strict";

  const app = window.WebThemeBuilder = window.WebThemeBuilder || {};
  const frontendSelect = document.querySelector("[data-frontend-select]");
  const paletteSelect = document.querySelector("[data-palette-select]");
  const status = document.querySelector("[data-build-options-status]");

  function setStatus(message, state = null) {
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function replaceOptions(select, options) {
    select.replaceChildren(...options);
  }

  function assertRelativeFileName(value, label) {
    if (typeof value !== "string" || !value || value.startsWith("/")
      || value.includes("\\") || value.split("/").includes("..")) {
      throw new Error(`${label} must be a relative file path.`);
    }
  }

  async function fetchJson(path, label) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Unable to load ${label}.`);

    try {
      return await response.json();
    } catch {
      throw new Error(`${label} contains invalid JSON.`);
    }
  }

  function validateStaticFiles(items, label, knownConfigIds) {
    if (!Array.isArray(items)) throw new Error(`${label} must contain a static-files array.`);

    for (const item of items) {
      if (!item || typeof item !== "object") throw new Error(`${label} contains an invalid static file item.`);
      if (!["folder", "static-file", "font", "config-file"].includes(item.type)) {
        throw new Error(`${label} uses an unsupported static file type.`);
      }
      assertRelativeFileName(item.name, `${label} static file name`);

      if (item.type === "config-file") {
        if (typeof item.id !== "string" || !item.id.trim()) {
          throw new Error(`${label} config-file entries need an id.`);
        }
        if (knownConfigIds.has(item.id)) {
          throw new Error(`${label} reuses the config-file id ${item.id}.`);
        }
        knownConfigIds.add(item.id);
      }
    }
  }

  async function loadAssetMap(frontendId, profileId, fileName) {
    assertRelativeFileName(fileName, `${frontendId} ${profileId} theme-config`);
    const map = await fetchJson(
      `frontends/${encodeURIComponent(frontendId)}/theme/${fileName}`,
      `${frontendId} ${profileId} theme asset map`
    );
    if (!Array.isArray(map.icons)) {
      throw new Error(`${frontendId} ${profileId} theme asset map must contain an icons array.`);
    }
    return map;
  }

  async function loadFrontend(entry) {
    const { id, label } = entry;
    if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) {
      throw new Error("The frontend manifest contains an invalid frontend id.");
    }
    if (typeof label !== "string" || !label.trim()) {
      throw new Error(`The frontend manifest is missing a label for ${id}.`);
    }

    const frontend = await fetchJson(
      `frontends/${encodeURIComponent(id)}/frontend.json`,
      `${label} frontend definition`
    );
    assertRelativeFileName(frontend["theme-config"], `${label} theme-config`);
    const configFileIds = new Set();
    validateStaticFiles(frontend["static-files"], `${label} frontend definition`, configFileIds);

    const profiles = new Map();
    profiles.set("base", {
      assetMap: await loadAssetMap(id, "base", frontend["theme-config"]),
      staticFiles: frontend["static-files"]
    });

    const options = frontend.options || {};
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new Error(`${label} options must be an object.`);
    }
    for (const [profileId, option] of Object.entries(options)) {
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        throw new Error(`${label} option ${profileId} is invalid.`);
      }
      assertRelativeFileName(option["theme-config"], `${label} ${profileId} theme-config`);
      validateStaticFiles(option["static-files"], `${label} ${profileId} option`, configFileIds);
      profiles.set(profileId, {
        assetMap: await loadAssetMap(id, profileId, option["theme-config"]),
        staticFiles: [...frontend["static-files"], ...option["static-files"]]
      });
    }

    return { configFileIds, definition: frontend, id, label, profiles };
  }

  function availableFrontendsFor(project) {
    const projectConfigs = project.config["frontend-configs"] || {};
    return [...app.frontends.values()].filter((frontend) => projectConfigs[frontend.id]);
  }

  app.resetBuildOptions = function resetBuildOptions() {
    paletteSelect.disabled = true;
    replaceOptions(paletteSelect, [createOption("", "Select a project first")]);

    if (app.frontends?.size) {
      frontendSelect.disabled = true;
      replaceOptions(frontendSelect, [createOption("", "Import a compatible project first")]);
    }
    setStatus("Import a project to choose its palette.");
  };

  app.populateBuildOptions = function populateBuildOptions(project) {
    const available = availableFrontendsFor(project);
    if (available.length === 0) {
      throw new Error("This project does not support any frontend available in the web builder.");
    }

    replaceOptions(frontendSelect, available.map((frontend) => createOption(frontend.id, frontend.label)));
    frontendSelect.disabled = available.length === 1;
    app.selectedFrontend = available[0];

    replaceOptions(paletteSelect, project.palettes.map(({ palette }) => (
      createOption(palette["palette-name"], palette["palette-name"])
    )));
    paletteSelect.disabled = false;
    app.selectedPalette = project.palettes[0].palette;
    setStatus(`${app.selectedFrontend.label} base profile loaded. Choose a palette to continue.`, "success");
  };

  frontendSelect.addEventListener("change", () => {
    app.selectedFrontend = app.frontends.get(frontendSelect.value) || null;
    if (app.selectedFrontend) {
      setStatus(`${app.selectedFrontend.label} base profile loaded.`, "success");
    }
  });

  paletteSelect.addEventListener("change", () => {
    app.selectedPalette = app.project?.palettes.find(({ palette }) => (
      palette["palette-name"] === paletteSelect.value
    ))?.palette || null;
  });

  app.frontendsReady = (async () => {
    const manifest = await fetchJson("frontends/index.json", "frontend manifest");
    if (!Array.isArray(manifest.frontends) || manifest.frontends.length === 0) {
      throw new Error("The frontend manifest must list at least one frontend.");
    }

    const loaded = await Promise.all(manifest.frontends.map(loadFrontend));
    app.frontends = new Map(loaded.map((frontend) => [frontend.id, frontend]));
    replaceOptions(frontendSelect, [createOption("", "Import a compatible project first")]);
    frontendSelect.disabled = true;
    return app.frontends;
  })().catch((error) => {
    console.error(error);
    replaceOptions(frontendSelect, [createOption("", "Frontend definitions unavailable")]);
    frontendSelect.disabled = true;
    setStatus(error.message || "Unable to load frontend definitions.", "error");
    throw error;
  });
}());

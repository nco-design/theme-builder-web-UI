window.SimpleProjectGenerator.initializeProjectGenerator = function initializeProjectGenerator() {
  const app = window.SimpleProjectGenerator;
  const form = document.querySelector(".project-form");
  const generateButton = document.querySelector("[data-generate-project]");
  const status = document.querySelector("[data-generation-status]");
  const templateRoot = "assets/example-theme";
  const systemSelectViewTypes = new Set(["GRID", "CAROUSEL", "TEXT_AND_IMAGE"]);

  function createSlug(name) {
    return name
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function showStatus(message, type = null) {
    status.textContent = message;
    status.classList.remove("generation-success", "generation-error");
    if (type) status.classList.add(`generation-${type}`);
  }

  function assetUrl(path) {
    return `${templateRoot}/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  async function fetchFile(path) {
    const response = await fetch(assetUrl(path));
    if (!response.ok) throw new Error(`Unable to load template file: ${path}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  async function fetchJson(path) {
    const response = await fetch(assetUrl(path));
    if (!response.ok) throw new Error(`Unable to load template file: ${path}`);
    return response.json();
  }

  function replaceFontReferences(value, fontName) {
    if (Array.isArray(value)) {
      return value.map((item) => replaceFontReferences(item, fontName));
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        key === "font" && item === "nunwen.ttf"
          ? fontName
          : replaceFontReferences(item, fontName)
      ]));
    }

    return value;
  }

  function downloadZip(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const themeName = createSlug(formData.get("theme-name"));
    const showHeader = formData.get("show-header") === "on";
    const showFooter = formData.get("show-footer") === "on";
    const buttonRadius = Number(formData.get("button-radius"));

    if (!themeName) {
      showStatus("Enter a theme name containing letters or numbers.", "error");
      return;
    }

    if (app.palettes.length === 0) {
      showStatus("Import at least one valid palette before generating the project.", "error");
      return;
    }

    if (!Number.isFinite(buttonRadius) || buttonRadius < 0 || buttonRadius > 100) {
      showStatus("Choose a button radius between 0 and 100%.", "error");
      return;
    }

    generateButton.disabled = true;
    showStatus("Preparing project files…");

    try {
      const manifestResponse = await fetch("assets/example-theme-manifest.json");
      if (!manifestResponse.ok) throw new Error("Unable to load the project manifest.");
      const manifest = await manifestResponse.json();
      const zip = new app.ZipBuilder();
      const root = `${themeName}/`;
      const customIconPaths = new Set();

      for (const [iconName] of Object.entries(app.navigationIcons)) {
        customIconPaths.add(`assets/main-nav-icons/${iconName}-selected.svg`);
        customIconPaths.add(`assets/main-nav-icons/${iconName}-unselected.svg`);
      }

      const skippedPaths = new Set(["config.json", "assets/config.json"]);
      if (app.background) skippedPaths.add("assets/backgrounds/main-background.svg");
      for (const path of customIconPaths) skippedPaths.add(path);

      const copiedPaths = manifest.filter((path) => (
        !path.startsWith("palettes/")
        && !skippedPaths.has(path)
        && !(app.font && /\.(ttf|otf)$/i.test(path))
      ));

      let copied = 0;
      for (const path of copiedPaths) {
        const layoutAsset = await app.createLayoutAsset({
          buttonRadius,
          path,
          showFooter,
          showHeader
        });
        zip.addFile(`${root}${path}`, layoutAsset || await fetchFile(path));
        copied += 1;
        showStatus(`Preparing project files… ${copied}/${copiedPaths.length}`);
      }

      const themeConfig = await fetchJson("config.json");
      themeConfig["theme-name"] = themeName;
      themeConfig.description = formData.get("description").trim();
      themeConfig.Author = formData.get("author").trim();
      app.applyHeaderPaletteBindings(themeConfig, showHeader);
      zip.addFile(`${root}config.json`, `${JSON.stringify(themeConfig, null, 2)}\n`);

      for (const { palette } of app.palettes) {
        zip.addFile(
          `${root}palettes/${palette["palette-name"]}.json`,
          `${JSON.stringify(palette, null, 2)}\n`
        );
      }

      const systemSelectViewType = formData.get("system-select-view-type");
      if (!systemSelectViewTypes.has(systemSelectViewType)) {
        throw new Error("Choose a valid emulator selection layout.");
      }

      let assetsConfig = await fetchJson("assets/config.json");
      assetsConfig.systemSelectViewType = systemSelectViewType;

      if (app.font) {
        assetsConfig = replaceFontReferences(assetsConfig, app.font.name);
        zip.addFile(`${root}assets/${app.font.name}`, new Uint8Array(await app.font.arrayBuffer()));
      }

      zip.addFile(`${root}assets/config.json`, `${JSON.stringify(assetsConfig, null, 2)}\n`);

      if (app.background) {
        zip.addFile(`${root}assets/backgrounds/main-background.svg`, app.background.svg);
      }

      for (const [iconName, icon] of Object.entries(app.navigationIcons)) {
        zip.addFile(`${root}assets/main-nav-icons/${iconName}-selected.svg`, icon.selectedSvg);
        zip.addFile(`${root}assets/main-nav-icons/${iconName}-unselected.svg`, icon.unselectedSvg);
      }

      downloadZip(zip.build(), `${themeName}.zip`);
      showStatus(`${themeName}.zip is ready.`, "success");
    } catch (error) {
      console.error(error);
      showStatus(error.message, "error");
    } finally {
      generateButton.disabled = false;
    }
  });
};

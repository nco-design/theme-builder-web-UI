(function () {
  "use strict";

  const app = window.WebThemeBuilder = window.WebThemeBuilder || {};
  const form = document.querySelector(".build-form");
  const generateButton = document.querySelector("[data-generate-button]");
  const projectInput = document.querySelector("[data-project-file]");
  const frontendSelect = document.querySelector("[data-frontend-select]");
  const paletteSelect = document.querySelector("[data-palette-select]");
  const status = document.querySelector("[data-generation-status]");

  function setStatus(message, state = null) {
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  function safeFolderName(project, palette) {
    const name = `${project.config["theme-name"]}-${palette["palette-name"]}`;
    if (!name || /[\\/\u0000-\u001f]/.test(name) || name.split("/").includes("..")) {
      throw new Error("The generated theme name is not safe for a ZIP archive.");
    }
    return name;
  }

  function mergeFiles(target, source) {
    for (const [path, bytes] of source) {
      if (target.has(path)) throw new Error(`Two generated files use the same path: ${path}.`);
      target.set(path, bytes);
    }
  }

  function download(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function setControlsDisabled(disabled) {
    projectInput.disabled = disabled;
    paletteSelect.disabled = disabled;
    frontendSelect.disabled = disabled || app.frontends?.size <= 1;
    generateButton.disabled = disabled || !app.project || !app.selectedFrontend || !app.selectedPalette;
  }

  app.updateGenerateButton = function updateGenerateButton() {
    generateButton.disabled = !app.project || !app.selectedFrontend || !app.selectedPalette;
    if (!generateButton.disabled) setStatus("Ready to generate your theme.", "success");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!app.project || !app.selectedFrontend || !app.selectedPalette) {
      setStatus("Import a valid project and choose a palette first.", "error");
      return;
    }

    setControlsDisabled(true);
    setStatus("Preparing static files and configuration…", "loading");

    try {
      const staticResult = await app.buildStaticFilesAndConfig({
        frontend: app.selectedFrontend,
        palette: app.selectedPalette,
        project: app.project
      });
      const assetResult = await app.renderThemeAssets({
        frontend: app.selectedFrontend,
        palette: app.selectedPalette,
        project: app.project,
        onProgress: ({ completed, total }) => {
          setStatus(`Rendering theme assets… ${completed}/${total}`, "loading");
        }
      });

      const files = new Map(staticResult.files);
      mergeFiles(files, assetResult.files);
      const folderName = safeFolderName(app.project, app.selectedPalette);
      const archiveFiles = new Map([...files].map(([path, bytes]) => [`${folderName}/${path}`, bytes]));
      setStatus("Packaging theme ZIP…", "loading");
      await new Promise((resolve) => requestAnimationFrame(resolve));
      download(app.createZip(archiveFiles), `${folderName}.zip`);
      setStatus(
        `${folderName}.zip is ready (${assetResult.generatedCount} assets generated).`,
        "success"
      );
    } catch (error) {
      console.error(error);
      setStatus(error.message || "The theme could not be generated.", "error");
    } finally {
      setControlsDisabled(false);
    }
  });
}());

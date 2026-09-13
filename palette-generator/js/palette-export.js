window.PaletteGenerator = window.PaletteGenerator || {};

window.PaletteGenerator.initializePaletteExport = function initializePaletteExport() {
  const api = window.PaletteGenerator;
  const generateForm = document.querySelector("[data-generate-form]");
  const paletteNameInput = generateForm.elements.namedItem("palette-name");
  const createProjectButton = document.querySelector("[data-create-project]");
  let generatedPalette = null;
  let generatedBackground = null;

  function createPaletteSlug(name) {
    return name
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function readPaletteColor(colorName) {
    const picker = document.querySelector(`[data-palette-color="${colorName}"]`);
    const input = picker.querySelector("[data-hex-value]");
    const hex = api.normalizeHex(input.value);

    if (!hex) {
      input.setAttribute("aria-invalid", "true");
      input.focus();
      throw new Error(`Invalid ${colorName} color`);
    }

    return hex;
  }

  function downloadJson(fileName, value) {
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  paletteNameInput.addEventListener("input", () => {
    paletteNameInput.setCustomValidity("");
  });

  generateForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(generateForm);
    const paletteName = createPaletteSlug(formData.get("palette-name"));

    if (!paletteName) {
      paletteNameInput.setCustomValidity("Enter a name containing letters or numbers.");
      paletteNameInput.reportValidity();
      return;
    }

    paletteNameInput.setCustomValidity("");

    try {
      const background = readPaletteColor("background");
      const primary = readPaletteColor("primary");
      const secondary = readPaletteColor("secondary");
      const palette = {
        "palette-name": paletteName,
        description: formData.get("description").trim(),
        Author: formData.get("author").trim(),
        properties: {
          "bg-color": background,
          "primary-color": primary,
          "primary-dark": primary,
          "secondary-color": secondary,
          "secondary-dark": secondary,
          "accent-color": primary
        }
      };

      downloadJson(`${paletteName}.json`, palette);
      generatedPalette = palette;
      generatedBackground = api.referenceBackground || null;
      createProjectButton.hidden = false;
    } catch (error) {
      console.error(error);
    }
  });

  createProjectButton.addEventListener("click", async () => {
    if (!generatedPalette) return;

    createProjectButton.disabled = true;
    createProjectButton.textContent = "Opening project creator…";
    try {
      const backgroundFile = generatedBackground;
      await window.ThemeBuilderWorkflow.handOff("palette-to-project", {
        background: backgroundFile ? {
          file: backgroundFile,
          name: backgroundFile.name,
          type: backgroundFile.type
        } : null,
        palette: generatedPalette
      });
      window.location.assign("../simple-project-generator/index.html");
    } catch (error) {
      console.error(error);
      createProjectButton.disabled = false;
      createProjectButton.textContent = "Create a project with this palette";
    }
  });
};

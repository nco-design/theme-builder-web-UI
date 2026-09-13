window.SimpleProjectGenerator.initializePaletteImport = function initializePaletteImport() {
  const app = window.SimpleProjectGenerator;
  const fileInput = document.querySelector("[data-palette-files]");
  const resultList = document.querySelector("[data-palette-list]");
  const requiredProperties = [
    "bg-color",
    "primary-color",
    "primary-dark",
    "secondary-color",
    "secondary-dark",
    "accent-color"
  ];
  const hexPattern = /^#[0-9a-f]{6}$/i;
  const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function validatePalette(palette) {
    if (!palette || typeof palette !== "object" || Array.isArray(palette)) {
      throw new Error("The JSON root must be an object.");
    }

    if (typeof palette["palette-name"] !== "string"
      || !namePattern.test(palette["palette-name"])) {
      throw new Error("palette-name must use lowercase kebab-case.");
    }

    for (const field of ["description", "Author"]) {
      if (typeof palette[field] !== "string" || !palette[field].trim()) {
        throw new Error(`${field} must be a non-empty string.`);
      }
    }

    if (!palette.properties
      || typeof palette.properties !== "object"
      || Array.isArray(palette.properties)) {
      throw new Error("properties must be an object.");
    }

    for (const property of requiredProperties) {
      if (!hexPattern.test(palette.properties[property] || "")) {
        throw new Error(`${property} must be a six-digit HEX color.`);
      }
    }

    return palette;
  }

  function addResult(message, type) {
    const item = document.createElement("li");
    item.className = `import-${type}`;
    item.textContent = message;
    resultList.append(item);
  }

  function addImportedPalette(entry) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const removeButton = document.createElement("button");
    const paletteName = entry.palette["palette-name"];

    item.className = "import-success";
    label.textContent = `${entry.file.name} — ${paletteName} imported`;
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${paletteName}`);
    removeButton.addEventListener("click", () => {
      app.palettes = app.palettes.filter((palette) => palette !== entry);
      item.remove();
    });
    item.append(label, removeButton);
    resultList.append(item);
  }

  async function readPaletteFile(file) {
    if (!file.name.toLowerCase().endsWith(".json")) {
      throw new Error("Only JSON files are accepted.");
    }

    let palette;

    try {
      palette = JSON.parse(await file.text());
    } catch {
      throw new Error("The file does not contain valid JSON.");
    }

    return validatePalette(palette);
  }

  async function importPaletteFile(file) {
    const paletteNames = new Set(
      app.palettes.map(({ palette }) => palette["palette-name"])
    );

    try {
      const palette = await readPaletteFile(file);
      const paletteName = palette["palette-name"];

      if (paletteNames.has(paletteName)) {
        throw new Error(`Duplicate palette-name: ${paletteName}.`);
      }

      const entry = { file, palette };
      app.palettes.push(entry);
      addImportedPalette(entry);
      return true;
    } catch (error) {
      addResult(`${file.name} — ${error.message}`, "error");
      return false;
    }
  }

  app.importPaletteFile = importPaletteFile;

  fileInput.addEventListener("change", async () => {
    for (const file of fileInput.files) {
      await importPaletteFile(file);
    }

    fileInput.value = "";
  });
};

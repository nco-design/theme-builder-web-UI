window.SimpleProjectGenerator.initializeIconImport = function initializeIconImport() {
  const app = window.SimpleProjectGenerator;
  const grid = document.querySelector("[data-navigation-icons]");
  const iconDirectory = "assets/example-theme/assets/main-nav-icons";
  const iconDefinitions = [
    { id: "recents", label: "Recent games" },
    { id: "fav", label: "Favorites" },
    { id: "games", label: "Games" },
    { id: "apps", label: "Apps" },
    { id: "settings", label: "Settings" }
  ];
  const sourcePalettePromise = fetch("assets/example-theme/source-palette.json")
    .then((response) => {
      if (!response.ok) throw new Error("Unable to load source-palette.json.");
      return response.json();
    });

  function readSvgDimensions(svg) {
    const viewBox = svg.getAttribute("viewBox")
      ?.trim()
      .split(/[ ,]+/)
      .map(Number);

    if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
      return { width: viewBox[2], height: viewBox[3] };
    }

    return {
      width: Number.parseFloat(svg.getAttribute("width")),
      height: Number.parseFloat(svg.getAttribute("height"))
    };
  }

  function validateSvg(svgText) {
    const documentNode = new DOMParser().parseFromString(svgText, "image/svg+xml");

    if (documentNode.querySelector("parsererror")
      || documentNode.documentElement.localName !== "svg") {
      throw new Error("The file does not contain valid SVG markup.");
    }

    const { width, height } = readSvgDimensions(documentNode.documentElement);

    if (!(width > 0) || !(height > 0)) {
      throw new Error("The SVG must define a valid viewBox or dimensions.");
    }

    if (Math.abs(width - height) > Math.max(width, height) * 0.001) {
      throw new Error("The SVG must be square.");
    }
  }

  function replaceColor(svgText, sourceColor, targetColor) {
    const escapedColor = sourceColor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return svgText.replace(new RegExp(escapedColor, "gi"), targetColor);
  }

  function updateStatus(status, message, type = null) {
    status.textContent = message;
    status.classList.remove("import-success", "import-error");
    if (type) status.classList.add(`import-${type}`);
  }

  function createIconCard(icon) {
    const card = document.createElement("article");
    const title = document.createElement("h4");
    const previewContainer = document.createElement("div");
    const preview = document.createElement("img");
    const inputLabel = document.createElement("label");
    const input = document.createElement("input");
    const buttonLabel = document.createElement("span");
    const status = document.createElement("p");

    card.className = "navigation-icon-card";
    title.textContent = icon.label;
    previewContainer.className = "navigation-icon-preview";
    preview.src = `${iconDirectory}/${icon.id}-selected.svg`;
    preview.alt = `${icon.label} icon`;
    input.type = "file";
    input.accept = ".svg,image/svg+xml";
    buttonLabel.className = "navigation-icon-button";
    buttonLabel.textContent = "Import SVG";
    status.className = "navigation-icon-status";
    status.textContent = "Using the default icon";
    previewContainer.append(preview);
    inputLabel.append(input, buttonLabel);
    card.append(title, previewContainer, inputLabel, status);

    input.addEventListener("change", async () => {
      const [file] = input.files;

      if (!file) return;

      if (!file.name.toLowerCase().endsWith(".svg")) {
        input.value = "";
        updateStatus(status, "Only SVG files are accepted.", "error");
        return;
      }

      try {
        const svgText = await file.text();
        validateSvg(svgText);
        const sourcePalette = await sourcePalettePromise;
        const primaryColor = sourcePalette["primary-color-source"];
        const secondaryColor = sourcePalette["secondary-color-source"];

        if (!primaryColor || !secondaryColor) {
          throw new Error("The source palette is missing primary or secondary color.");
        }

        const unselectedSvg = replaceColor(svgText, primaryColor, secondaryColor);

        if (unselectedSvg === svgText) {
          throw new Error(`The SVG must contain the primary source color ${primaryColor}.`);
        }

        const previousIcon = app.navigationIcons[icon.id];
        if (previousIcon?.previewUrl) URL.revokeObjectURL(previousIcon.previewUrl);

        const previewUrl = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
        app.navigationIcons[icon.id] = {
          selectedFileName: `${icon.id}-selected.svg`,
          selectedSvg: svgText,
          unselectedFileName: `${icon.id}-unselected.svg`,
          unselectedSvg,
          previewUrl
        };
        preview.src = previewUrl;
        input.value = "";
        updateStatus(status, `${file.name} imported`, "success");
      } catch (error) {
        input.value = "";
        updateStatus(status, error.message, "error");
      }
    });

    grid.append(card);
  }

  iconDefinitions.forEach(createIconCard);
  window.addEventListener("beforeunload", () => {
    Object.values(app.navigationIcons).forEach(({ previewUrl }) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    });
  });
};

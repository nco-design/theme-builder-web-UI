window.SimpleProjectGenerator.initializeBackgroundImport = function initializeBackgroundImport() {
  const app = window.SimpleProjectGenerator;
  const fileInput = document.querySelector("[data-background-file]");
  const status = document.querySelector("[data-background-status]");
  const maximumSize = 10 * 1024 * 1024;
  const warningSize = 4 * 1024 * 1024;
  const maximumRecommendedPixels = 3840 * 2160;
  const allowedTypes = ["image/jpeg", "image/png"];

  function showStatus(message, type = null) {
    status.textContent = message;
    status.classList.remove("import-success", "import-warning", "import-error");
    if (type) status.classList.add(`import-${type}`);
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(new Error("Unable to read the image.")));
      reader.readAsDataURL(file);
    });
  }

  function readImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);

      image.addEventListener("load", () => {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
        URL.revokeObjectURL(url);
      });
      image.addEventListener("error", () => {
        reject(new Error("The file is not a valid PNG or JPEG image."));
        URL.revokeObjectURL(url);
      });
      image.src = url;
    });
  }

  async function createBackgroundSvg(file, width, height) {
    const response = await app.fetchWithRetry(
      "assets/example-theme/assets/backgrounds/main-background.svg"
    );

    if (!response.ok) {
      throw new Error("Unable to load the background SVG template.");
    }

    const parser = new DOMParser();
    const documentNode = parser.parseFromString(await response.text(), "image/svg+xml");
    const parserError = documentNode.querySelector("parsererror");

    if (parserError) {
      throw new Error("The background SVG template is invalid.");
    }

    const svg = documentNode.documentElement;
    const image = documentNode.createElementNS("http://www.w3.org/2000/svg", "image");
    const dataUrl = await readAsDataUrl(file);

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("width", width);
    image.setAttribute("height", height);
    image.setAttribute("preserveAspectRatio", "none");
    image.setAttribute("href", dataUrl);
    svg.append(image);

    return new XMLSerializer().serializeToString(documentNode);
  }

  async function importBackgroundFile(file) {
    if (!file) {
      app.background = null;
      showStatus("The default background will be used.");
      return false;
    }

    const extensionIsValid = /\.(png|jpe?g)$/i.test(file.name);

    if (!extensionIsValid || !allowedTypes.includes(file.type)) {
      app.background = null;
      fileInput.value = "";
      showStatus("Only PNG, JPG and JPEG images are accepted.", "error");
      return false;
    }

    if (file.size > maximumSize) {
      app.background = null;
      fileInput.value = "";
      showStatus("The background image must not exceed 10 MB.", "error");
      return false;
    }

    try {
      const { width, height } = await readImageDimensions(file);

      if (width < 640 || height < 480) {
        throw new Error("The background image must be at least 640 × 480 px.");
      }

      const svg = await createBackgroundSvg(file, width, height);
      app.background = { file, width, height, svg };
      const warnings = [];

      if (file.size > warningSize) warnings.push("larger than 4 MB");
      if (width * height > maximumRecommendedPixels) warnings.push("larger than 4K");

      if (warnings.length > 0) {
        showStatus(
          `${file.name} imported — ${width} × ${height} px. Warning: ${warnings.join(" and ")}.`,
          "warning"
        );
      } else {
        showStatus(`${file.name} imported — ${width} × ${height} px`, "success");
      }
      return true;
    } catch (error) {
      app.background = null;
      fileInput.value = "";
      showStatus(error.message, "error");
      return false;
    }
  }

  app.importBackgroundFile = importBackgroundFile;

  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files;
    await importBackgroundFile(file);
  });
};

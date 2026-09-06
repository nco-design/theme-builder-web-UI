window.SimpleProjectGenerator.initializeFontImport = function initializeFontImport() {
  const app = window.SimpleProjectGenerator;
  const fileInput = document.querySelector("[data-font-file]");
  const status = document.querySelector("[data-font-status]");

  function showStatus(message, type = null) {
    status.textContent = message;
    status.classList.remove("import-success", "import-error");
    if (type) status.classList.add(`import-${type}`);
  }

  fileInput.addEventListener("change", () => {
    const [font] = fileInput.files;

    if (!font) {
      app.font = null;
      showStatus("The default font will be used.");
      return;
    }

    if (!/\.(ttf|otf)$/i.test(font.name)) {
      app.font = null;
      fileInput.value = "";
      showStatus("Only TTF and OTF font files are accepted.", "error");
      return;
    }

    app.font = font;
    showStatus(`${font.name} imported`, "success");
  });
};

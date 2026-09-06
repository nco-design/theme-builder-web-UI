window.PaletteGenerator = window.PaletteGenerator || {};

window.PaletteGenerator.initializePreviewModifiers = function initializePreviewModifiers() {
  const previews = document.querySelector(".previews-grid");
  const backgroundImageInput = document.querySelector("[data-background-image]");
  const removeBackgroundButton = document.querySelector("[data-remove-background]");
  let backgroundImageUrl = null;

  document.querySelectorAll("[data-preview-toggle]").forEach((toggle) => {
    toggle.addEventListener("change", () => {
      previews.classList.toggle(
        `show-preview-${toggle.dataset.previewToggle}`,
        toggle.checked
      );
    });
  });

  function removeBackgroundImage() {
    document.querySelectorAll(".theme-preview").forEach((preview) => {
      preview.style.removeProperty("background-image");
    });

    if (backgroundImageUrl) {
      URL.revokeObjectURL(backgroundImageUrl);
      backgroundImageUrl = null;
    }

    backgroundImageInput.value = "";
    removeBackgroundButton.disabled = true;
  }

  backgroundImageInput.addEventListener("change", () => {
    const [image] = backgroundImageInput.files;

    if (!image) return;

    if (!["image/jpeg", "image/png"].includes(image.type)) {
      backgroundImageInput.value = "";
      return;
    }

    if (backgroundImageUrl) URL.revokeObjectURL(backgroundImageUrl);

    backgroundImageUrl = URL.createObjectURL(image);
    document.querySelectorAll(".theme-preview").forEach((preview) => {
      preview.style.backgroundImage = `url("${backgroundImageUrl}")`;
    });
    removeBackgroundButton.disabled = false;
  });

  removeBackgroundButton.addEventListener("click", removeBackgroundImage);
  window.addEventListener("beforeunload", () => {
    if (backgroundImageUrl) URL.revokeObjectURL(backgroundImageUrl);
  });
};

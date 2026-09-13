window.PaletteGenerator = window.PaletteGenerator || {};

window.PaletteGenerator.initializePreviewModifiers = function initializePreviewModifiers() {
  const app = window.PaletteGenerator;
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
    app.referenceBackground = null;
    removeBackgroundButton.disabled = true;
    document.dispatchEvent(new CustomEvent("palette-background-image-change", {
      detail: { file: null }
    }));
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
    app.referenceBackground = image;
    document.querySelectorAll(".theme-preview").forEach((preview) => {
      preview.style.backgroundImage = `url("${backgroundImageUrl}")`;
    });
    removeBackgroundButton.disabled = false;
    document.dispatchEvent(new CustomEvent("palette-background-image-change", {
      detail: { file: image }
    }));
  });

  removeBackgroundButton.addEventListener("click", removeBackgroundImage);
  window.addEventListener("beforeunload", () => {
    if (backgroundImageUrl) URL.revokeObjectURL(backgroundImageUrl);
  });
};

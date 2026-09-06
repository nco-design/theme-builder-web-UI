window.PaletteGenerator = window.PaletteGenerator || {};

window.PaletteGenerator.initializeColorPickers = function initializeColorPickers() {
  const api = window.PaletteGenerator;
  const previews = document.querySelector(".previews-grid");

  function initializeColorPicker(picker) {
    const previewProperty = [
      ["data-preview-background", "--preview-background"],
      ["data-preview-primary", "--preview-primary"],
      ["data-preview-secondary", "--preview-secondary"]
    ].find(([attribute]) => picker.hasAttribute(attribute))?.[1] || null;
    const hueInput = picker.querySelector("[data-hue]");
    const saturationInput = picker.querySelector("[data-saturation]");
    const lightnessInput = picker.querySelector("[data-lightness]");
    const hueValue = picker.querySelector("[data-hue-value]");
    const saturationValue = picker.querySelector("[data-saturation-value]");
    const lightnessValue = picker.querySelector("[data-lightness-value]");
    const hexValue = picker.querySelector("[data-hex-value]");
    const copyButton = picker.querySelector("[data-copy-hex]");

    function updatePicker() {
      const hue = Number(hueInput.value);
      const saturation = Number(saturationInput.value);
      const lightness = Number(lightnessInput.value);
      const hex = api.hslToHex(hue, saturation, lightness);

      picker.style.setProperty("--picker-hue", hue);
      picker.style.setProperty("--picker-saturation", `${saturation}%`);
      picker.style.setProperty("--picker-lightness", `${lightness}%`);
      picker.style.setProperty("--picker-color", hex);
      if (previewProperty) previews.style.setProperty(previewProperty, hex);
      hueValue.value = `${hue}°`;
      saturationValue.value = `${saturation}%`;
      lightnessValue.value = `${lightness}%`;
      hexValue.value = hex;
      hexValue.removeAttribute("aria-invalid");
    }

    function applyHexValue({ allowShort = false } = {}) {
      const normalizedHex = api.normalizeHex(hexValue.value);
      const digitCount = hexValue.value.trim().replace(/^#/, "").length;

      if (!normalizedHex || (!allowShort && digitCount !== 6)) {
        hexValue.setAttribute("aria-invalid", "true");
        return;
      }

      const color = api.hexToHsl(normalizedHex);
      hueInput.value = color.hue;
      saturationInput.value = color.saturation;
      lightnessInput.value = color.lightness;
      updatePicker();
      hexValue.value = normalizedHex;
      picker.style.setProperty("--picker-color", normalizedHex);
      if (previewProperty) previews.style.setProperty(previewProperty, normalizedHex);
    }

    [hueInput, saturationInput, lightnessInput]
      .forEach((input) => input.addEventListener("input", updatePicker));
    hexValue.addEventListener("input", () => applyHexValue());
    hexValue.addEventListener("change", () => applyHexValue({ allowShort: true }));
    copyButton.addEventListener("click", async () => {
      try {
        await api.copyText(hexValue.value);
        copyButton.textContent = "Copied!";
      } catch {
        copyButton.textContent = "Copy failed";
      }

      window.setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1500);
    });

    updatePicker();
  }

  document.querySelectorAll("[data-color-picker]").forEach(initializeColorPicker);
};

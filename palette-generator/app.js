function hslToHex(hue, saturation, lightness) {
  const normalizedSaturation = saturation / 100;
  const normalizedLightness = lightness / 100;
  const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const hueSection = hue / 60;
  const intermediate = chroma * (1 - Math.abs((hueSection % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection < 1) [red, green, blue] = [chroma, intermediate, 0];
  else if (hueSection < 2) [red, green, blue] = [intermediate, chroma, 0];
  else if (hueSection < 3) [red, green, blue] = [0, chroma, intermediate];
  else if (hueSection < 4) [red, green, blue] = [0, intermediate, chroma];
  else if (hueSection < 5) [red, green, blue] = [intermediate, 0, chroma];
  else [red, green, blue] = [chroma, 0, intermediate];

  const match = normalizedLightness - chroma / 2;
  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + match) * 255)
      .toString(16)
      .padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function normalizeHex(value) {
  const match = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (!match) {
    return null;
  }

  const digits = match[1].length === 3
    ? [...match[1]].map((digit) => digit.repeat(2)).join("")
    : match[1];

  return `#${digits.toUpperCase()}`;
}

function hexToHsl(hex) {
  const [red, green, blue] = [1, 3, 5]
    .map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const difference = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;

  if (difference !== 0) {
    if (maximum === red) hue = 60 * (((green - blue) / difference) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / difference + 2);
    else hue = 60 * ((red - green) / difference + 4);
  }

  if (hue < 0) {
    hue += 360;
  }

  const saturation = difference === 0
    ? 0
    : difference / (1 - Math.abs(2 * lightness - 1));

  return {
    hue: Math.round(hue),
    saturation: Number((saturation * 100).toFixed(1)),
    lightness: Number((lightness * 100).toFixed(1))
  };
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();

  const copied = document.execCommand("copy");
  textArea.remove();

  if (!copied) {
    throw new Error("Unable to copy the HEX value");
  }
}

function initializeColorPicker(picker) {
  const previews = document.querySelector(".previews-grid");
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

    const hex = hslToHex(hue, saturation, lightness);

    picker.style.setProperty("--picker-hue", hue);
    picker.style.setProperty("--picker-saturation", `${saturation}%`);
    picker.style.setProperty("--picker-lightness", `${lightness}%`);
    picker.style.setProperty("--picker-color", hex);
    if (previewProperty) {
      previews.style.setProperty(previewProperty, hex);
    }
    hueValue.value = `${hue}°`;
    saturationValue.value = `${saturation}%`;
    lightnessValue.value = `${lightness}%`;
    hexValue.value = hex;
    hexValue.removeAttribute("aria-invalid");
  }

  [hueInput, saturationInput, lightnessInput]
    .forEach((input) => input.addEventListener("input", updatePicker));

  function applyHexValue({ allowShort = false } = {}) {
    const normalizedHex = normalizeHex(hexValue.value);
    const digitCount = hexValue.value.trim().replace(/^#/, "").length;

    if (!normalizedHex || (!allowShort && digitCount !== 6)) {
      hexValue.setAttribute("aria-invalid", "true");
      return;
    }

    const color = hexToHsl(normalizedHex);
    hueInput.value = color.hue;
    saturationInput.value = color.saturation;
    lightnessInput.value = color.lightness;
    updatePicker();
    hexValue.value = normalizedHex;
    picker.style.setProperty("--picker-color", normalizedHex);
    if (previewProperty) {
      previews.style.setProperty(previewProperty, normalizedHex);
    }
  }

  hexValue.addEventListener("input", () => {
    applyHexValue();
  });

  hexValue.addEventListener("change", () => {
    applyHexValue({ allowShort: true });
  });
  copyButton.addEventListener("click", async () => {
    try {
      await copyText(hexValue.value);
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

const previews = document.querySelector(".previews-grid");

document.querySelectorAll("[data-preview-toggle]").forEach((toggle) => {
  toggle.addEventListener("change", () => {
    const target = toggle.dataset.previewToggle;
    previews.classList.toggle(`show-preview-${target}`, toggle.checked);
  });
});

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
  const hex = normalizeHex(input.value);

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

const generateForm = document.querySelector("[data-generate-form]");
const paletteNameInput = generateForm.elements.namedItem("palette-name");

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
  } catch (error) {
    console.error(error);
  }
});

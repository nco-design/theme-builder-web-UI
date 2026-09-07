window.PaletteGenerator = window.PaletteGenerator || {};

window.PaletteGenerator.initializeImageColorSampler = function initializeImageColorSampler() {
  const sampler = document.querySelector("[data-image-sampler]");
  const canvasContainer = document.querySelector("[data-image-sampler-canvas]");
  const imageCanvas = document.querySelector("[data-sampler-image]");
  const overlayCanvas = document.querySelector("[data-sampler-overlay]");
  const status = document.querySelector("[data-image-sampler-status]");
  const eyedropperButtons = [...document.querySelectorAll("[data-image-eyedropper]")];
  const imageContext = imageCanvas.getContext("2d", { willReadFrequently: true });
  const overlayContext = overlayCanvas.getContext("2d");
  let activePicker = null;
  let dragStart = null;
  let imageIsReady = false;

  function setActivePicker(picker) {
    activePicker = picker;
    eyedropperButtons.forEach((button) => {
      button.classList.toggle("is-active", button.closest("[data-color-picker]") === picker);
    });
    canvasContainer.classList.toggle("is-active", Boolean(picker));
    status.textContent = picker
      ? `Sampling ${picker.dataset.paletteColor} color.`
      : "Choose a pipette to sample a color.";
  }

  function clearOverlay() {
    overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }

  function canvasPoint(event) {
    const bounds = overlayCanvas.getBoundingClientRect();

    return {
      x: Math.max(0, Math.min(
        imageCanvas.width - 1,
        (event.clientX - bounds.left) * imageCanvas.width / bounds.width
      )),
      y: Math.max(0, Math.min(
        imageCanvas.height - 1,
        (event.clientY - bounds.top) * imageCanvas.height / bounds.height
      )),
      scale: imageCanvas.width / bounds.width
    };
  }

  function drawSelection(center, radius) {
    clearOverlay();
    overlayContext.beginPath();
    overlayContext.arc(center.x, center.y, Math.max(radius, center.scale * 3), 0, Math.PI * 2);
    overlayContext.lineWidth = Math.max(2, center.scale * 2);
    overlayContext.strokeStyle = "#ffffff";
    overlayContext.shadowColor = "#000000";
    overlayContext.shadowBlur = center.scale * 2;
    overlayContext.stroke();
    overlayContext.shadowBlur = 0;
  }

  function rgbToHex(red, green, blue) {
    return `#${[red, green, blue]
      .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
      .join("")}`.toUpperCase();
  }

  function sampleColor(center, radius) {
    if (radius < center.scale * 3) {
      const pixel = imageContext.getImageData(Math.floor(center.x), Math.floor(center.y), 1, 1).data;
      return rgbToHex(pixel[0], pixel[1], pixel[2]);
    }

    const left = Math.max(0, Math.floor(center.x - radius));
    const top = Math.max(0, Math.floor(center.y - radius));
    const right = Math.min(imageCanvas.width, Math.ceil(center.x + radius));
    const bottom = Math.min(imageCanvas.height, Math.ceil(center.y + radius));
    const width = right - left;
    const height = bottom - top;
    const pixels = imageContext.getImageData(left, top, width, height).data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let totalWeight = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const imageX = left + x + 0.5;
        const imageY = top + y + 0.5;

        if ((imageX - center.x) ** 2 + (imageY - center.y) ** 2 > radius ** 2) continue;

        const index = (y * width + x) * 4;
        const weight = pixels[index + 3] / 255;
        red += pixels[index] * weight;
        green += pixels[index + 1] * weight;
        blue += pixels[index + 2] * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) return null;
    return rgbToHex(red / totalWeight, green / totalWeight, blue / totalWeight);
  }

  function applyColor(hex) {
    if (!activePicker || !hex) {
      status.textContent = "No visible pixel was found in this area.";
      return;
    }

    const pickerName = activePicker.dataset.paletteColor;
    const hexInput = activePicker.querySelector("[data-hex-value]");
    hexInput.value = hex;
    hexInput.dispatchEvent(new Event("change", { bubbles: true }));
    setActivePicker(null);
    status.textContent = `${pickerName[0].toUpperCase()}${pickerName.slice(1)} color set to ${hex}.`;
  }

  eyedropperButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!imageIsReady) return;

      const picker = button.closest("[data-color-picker]");
      setActivePicker(activePicker === picker ? null : picker);
    });
  });

  overlayCanvas.addEventListener("pointerdown", (event) => {
    if (!activePicker || !imageIsReady) return;

    dragStart = canvasPoint(event);
    overlayCanvas.setPointerCapture(event.pointerId);
    drawSelection(dragStart, 0);
  });

  overlayCanvas.addEventListener("pointermove", (event) => {
    if (!dragStart || !overlayCanvas.hasPointerCapture(event.pointerId)) return;

    const current = canvasPoint(event);
    const radius = Math.hypot(current.x - dragStart.x, current.y - dragStart.y);
    drawSelection(dragStart, radius);
  });

  overlayCanvas.addEventListener("pointerup", (event) => {
    if (!dragStart) return;

    const current = canvasPoint(event);
    const radius = Math.hypot(current.x - dragStart.x, current.y - dragStart.y);
    const center = dragStart;
    dragStart = null;
    applyColor(sampleColor(center, radius));
  });

  overlayCanvas.addEventListener("pointercancel", () => {
    dragStart = null;
    clearOverlay();
  });

  document.addEventListener("palette-background-image-change", async (event) => {
    const { file } = event.detail;

    if (!file) {
      imageIsReady = false;
      sampler.hidden = true;
      imageCanvas.width = 1;
      imageCanvas.height = 1;
      overlayCanvas.width = 1;
      overlayCanvas.height = 1;
      eyedropperButtons.forEach((button) => { button.disabled = true; });
      setActivePicker(null);
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      imageCanvas.width = bitmap.width;
      imageCanvas.height = bitmap.height;
      overlayCanvas.width = bitmap.width;
      overlayCanvas.height = bitmap.height;
      imageContext.drawImage(bitmap, 0, 0);
      bitmap.close();
      imageIsReady = true;
      sampler.hidden = false;
      eyedropperButtons.forEach((button) => { button.disabled = false; });
      setActivePicker(null);
    } catch {
      imageIsReady = false;
      sampler.hidden = true;
      eyedropperButtons.forEach((button) => { button.disabled = true; });
      status.textContent = "The image preview could not be loaded.";
    }
  });
};

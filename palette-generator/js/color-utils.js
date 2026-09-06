window.PaletteGenerator = window.PaletteGenerator || {};

window.PaletteGenerator.hslToHex = function hslToHex(hue, saturation, lightness) {
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
};

window.PaletteGenerator.normalizeHex = function normalizeHex(value) {
  const match = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (!match) return null;

  const digits = match[1].length === 3
    ? [...match[1]].map((digit) => digit.repeat(2)).join("")
    : match[1];

  return `#${digits.toUpperCase()}`;
};

window.PaletteGenerator.hexToHsl = function hexToHsl(hex) {
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

  if (hue < 0) hue += 360;

  const saturation = difference === 0
    ? 0
    : difference / (1 - Math.abs(2 * lightness - 1));

  return {
    hue: Math.round(hue),
    saturation: Number((saturation * 100).toFixed(1)),
    lightness: Number((lightness * 100).toFixed(1))
  };
};

window.SimpleProjectGenerator.createProjectPreview = async function createProjectPreview({
  background,
  navigationIcons,
  showFooter,
  showHeader
}) {
  const templateRoot = "assets/example-theme";
  const sourceColors = {
    background: "#0d0d26",
    primary: "#e5e5e5"
  };

  async function fetchSvg(path) {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${templateRoot}/${encodedPath}`);
    if (!response.ok) throw new Error(`Unable to load preview asset: ${path}`);
    return response.text();
  }

  function serializeEmbeddedSvg(svgContent, { height, idPrefix, preserveAspectRatio, width, x, y }) {
    const documentNode = new DOMParser().parseFromString(svgContent, "image/svg+xml");
    const svg = documentNode.documentElement;

    if (svg.nodeName === "parsererror" || documentNode.querySelector("parsererror")) {
      throw new Error("Unable to create preview.svg from an invalid SVG asset.");
    }

    const idMap = new Map();
    for (const element of documentNode.querySelectorAll("[id]")) {
      const oldId = element.id;
      const newId = `${idPrefix}-${oldId}`;
      idMap.set(oldId, newId);
      element.id = newId;
    }

    const idEntries = [...idMap].sort(([left], [right]) => right.length - left.length);
    for (const element of documentNode.querySelectorAll("*")) {
      for (const attribute of [...element.attributes]) {
        let value = attribute.value;
        for (const [oldId, newId] of idEntries) {
          value = value
            .replaceAll(`url(#${oldId})`, `url(#${newId})`)
            .replaceAll(`#${oldId}`, `#${newId}`);
        }
        if (value !== attribute.value) element.setAttribute(attribute.name, value);
      }
    }

    svg.setAttribute("x", x);
    svg.setAttribute("y", y);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("preserveAspectRatio", preserveAspectRatio);
    svg.removeAttribute("xml:space");

    return new XMLSerializer().serializeToString(svg);
  }

  function applyStatusColor(svgContent, color) {
    return svgContent.replace(/#e5e5e5/gi, color);
  }

  const iconLayout = [
    { id: "fav", state: "unselected", x: 32 },
    { id: "games", state: "selected", x: 192 },
    { id: "apps", state: "unselected", x: 352 },
    { id: "settings", state: "unselected", x: 512 }
  ];

  const backgroundSvg = background?.svg
    || await fetchSvg("assets/backgrounds/main-background.svg");
  const embeddedBackground = serializeEmbeddedSvg(backgroundSvg, {
    height: 480,
    idPrefix: "preview-background",
    preserveAspectRatio: "xMidYMid slice",
    width: 640,
    x: 0,
    y: 0
  });

  const embeddedIcons = [];
  for (const icon of iconLayout) {
    const importedIcon = navigationIcons[icon.id];
    const iconSvg = importedIcon
      ? importedIcon[`${icon.state}Svg`]
      : await fetchSvg(`assets/main-nav-icons/${icon.id}-${icon.state}.svg`);

    embeddedIcons.push(serializeEmbeddedSvg(iconSvg, {
      height: 96,
      idPrefix: `preview-${icon.id}-${icon.state}`,
      preserveAspectRatio: "xMidYMid meet",
      width: 96,
      x: icon.x,
      y: 192
    }));
  }

  const statusColor = showHeader ? sourceColors.background : sourceColors.primary;
  const wifiSvg = await fetchSvg("assets/icons/wifi-04.svg");
  const powerSvg = await fetchSvg("assets/icons/power-75.svg");
  const embeddedStatusIcons = [
    serializeEmbeddedSvg(applyStatusColor(wifiSvg, statusColor), {
      height: 40,
      idPrefix: "preview-wifi",
      preserveAspectRatio: "xMidYMid meet",
      width: 40,
      x: 560,
      y: 10
    }),
    serializeEmbeddedSvg(applyStatusColor(powerSvg, statusColor), {
      height: 40,
      idPrefix: "preview-power",
      preserveAspectRatio: "xMidYMid meet",
      width: 40,
      x: 600,
      y: 10
    })
  ];
  const header = showHeader
    ? `<rect x="0" y="0" width="640" height="60" fill="${sourceColors.primary}"/>`
    : "";
  const footer = showFooter
    ? `<rect x="0" y="420" width="640" height="60" fill="${sourceColors.primary}"/>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <title>Theme preview</title>
  ${embeddedBackground}
  ${header}
  <g aria-label="Status icons">
    ${embeddedStatusIcons.join("\n    ")}
  </g>
  <g aria-label="Main navigation icons">
    ${embeddedIcons.join("\n    ")}
  </g>
  ${footer}
</svg>
`;
};

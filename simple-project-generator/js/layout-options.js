window.SimpleProjectGenerator.initializeLayoutOptions = function initializeLayoutOptions() {
  const app = window.SimpleProjectGenerator;
  const templateRoot = "assets/example-theme";
  const primaryColorSource = "#e5e5e5";
  const backgroundColorSource = "#0d0d26";

  const headerIconPaths = new Set([
    "assets/icons/charge-0.svg",
    "assets/icons/charge-25.svg",
    "assets/icons/charge-50.svg",
    "assets/icons/charge-75.svg",
    "assets/icons/charge-100.svg",
    "assets/icons/hotspot.svg",
    "assets/icons/power-0.svg",
    "assets/icons/power-25.svg",
    "assets/icons/power-50.svg",
    "assets/icons/power-75.svg",
    "assets/icons/power-100.svg",
    "assets/icons/success.svg",
    "assets/icons/wifi-01.svg",
    "assets/icons/wifi-02.svg",
    "assets/icons/wifi-03.svg",
    "assets/icons/wifi-04.svg",
    "assets/icons/wifi-locked.svg"
  ]);

  const barPaths = {
    "assets/backgrounds/bg-header.svg": "header",
    "assets/backgrounds/bg-footer.svg": "footer"
  };

  function assetUrl(path) {
    return `${templateRoot}/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  async function fetchSvg(path) {
    const response = await fetch(assetUrl(path));
    if (!response.ok) throw new Error(`Unable to load template file: ${path}`);
    return response.text();
  }

  function addPrimaryBackground(svgContent) {
    const documentNode = new DOMParser().parseFromString(svgContent, "image/svg+xml");
    const svg = documentNode.documentElement;

    if (svg.nodeName === "parsererror" || documentNode.querySelector("parsererror")) {
      throw new Error("Unable to customize a layout SVG.");
    }

    const rect = documentNode.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", primaryColorSource);
    svg.insertBefore(rect, svg.firstChild);

    return new XMLSerializer().serializeToString(documentNode);
  }

  function useBackgroundColor(svgContent) {
    return svgContent.replaceAll(primaryColorSource, backgroundColorSource);
  }

  app.createLayoutAsset = async function createLayoutAsset({ path, showFooter, showHeader }) {
    if (path in barPaths) {
      const shouldShow = barPaths[path] === "header" ? showHeader : showFooter;
      if (shouldShow) return addPrimaryBackground(await fetchSvg(path));
      return null;
    }

    if (showHeader && headerIconPaths.has(path)) {
      return useBackgroundColor(await fetchSvg(path));
    }

    return null;
  };

  app.applyHeaderPaletteBindings = function applyHeaderPaletteBindings(themeConfig, showHeader) {
    if (!showHeader) return;

    const bindings = themeConfig["frontend-configs"]?.spruceos?.["palette-bindings"];
    if (!bindings) throw new Error("Unable to customize the header palette bindings.");

    bindings["batteryPercentage.color"] = "bg-color";
    bindings["title.color"] = "bg-color";
  };
};

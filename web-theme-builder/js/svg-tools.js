(function () {
  "use strict";

  const app = window.WebThemeBuilder = window.WebThemeBuilder || {};
  const sourceProperties = [
    ["primary-color-source", "primary-color"],
    ["primary-dark-color-source", "primary-dark"],
    ["secondary-color-source", "secondary-color"],
    ["secondary-dark-color-source", "secondary-dark"],
    ["accent-color-source", "accent-color"],
    ["background-color-source", "bg-color"]
  ];

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function parseSvg(svgContent, sourceName) {
    const documentNode = new DOMParser().parseFromString(svgContent, "image/svg+xml");
    if (documentNode.querySelector("parsererror")
      || documentNode.documentElement.localName !== "svg") {
      throw new Error(`Invalid SVG asset: ${sourceName}.`);
    }
    return documentNode;
  }

  function serializeSvg(documentNode) {
    return new XMLSerializer().serializeToString(documentNode.documentElement);
  }

  app.createThemeColorMap = function createThemeColorMap(sourcePalette, palette) {
    const properties = palette?.properties;
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
      throw new Error("The selected palette does not contain a properties object.");
    }

    return sourceProperties.map(([sourceProperty, targetProperty]) => {
      const source = sourcePalette?.[sourceProperty];
      const target = properties[targetProperty];
      if (typeof source !== "string" || !source.trim()) {
        throw new Error(`source-palette.json is missing ${sourceProperty}.`);
      }
      if (typeof target !== "string" || !target.trim()) {
        throw new Error(`The selected palette is missing ${targetProperty}.`);
      }
      return [source, target];
    });
  };

  app.applyThemeColorMap = function applyThemeColorMap(svgContent, colorMap) {
    let output = svgContent;
    for (const [source, target] of colorMap) {
      output = output.replace(new RegExp(escapeRegExp(source), "gi"), target);
    }
    return output;
  };

  app.applySvgOpacity = function applySvgOpacity(svgContent, opacity, sourceName) {
    if (opacity === 100) return svgContent;
    const documentNode = parseSvg(svgContent, sourceName);
    const svg = documentNode.documentElement;
    const group = documentNode.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("opacity", String(opacity / 100));
    while (svg.firstChild) group.append(svg.firstChild);
    svg.append(group);
    return serializeSvg(documentNode);
  };

  app.parseThemeSvg = parseSvg;
  app.serializeThemeSvg = serializeSvg;

  app.renderSvgToPng = async function renderSvgToPng({
    fit,
    flip = 0,
    height,
    opacity,
    sourceName,
    svgContent,
    width
  }) {
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(`The browser could not render SVG asset: ${sourceName}.`));
        image.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas rendering is not available in this browser.");
      context.globalAlpha = opacity / 100;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      if (fit === "cover") {
        const sourceWidth = image.naturalWidth || width;
        const sourceHeight = image.naturalHeight || height;
        const scale = Math.max(width / sourceWidth, height / sourceHeight);
        const cropWidth = width / scale;
        const cropHeight = height / scale;
        const cropX = (sourceWidth - cropWidth) / 2;
        const cropY = (sourceHeight - cropHeight) / 2;
        context.drawImage(
          image,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          width,
          height
        );
      } else {
        context.drawImage(image, 0, 0, width, height);
      }

      let outputCanvas = canvas;
      if (flip !== 0) {
        const rotatedCanvas = document.createElement("canvas");
        const swapsDimensions = flip === 90 || flip === 270;
        rotatedCanvas.width = swapsDimensions ? height : width;
        rotatedCanvas.height = swapsDimensions ? width : height;
        const rotatedContext = rotatedCanvas.getContext("2d");
        if (!rotatedContext) throw new Error("Canvas rendering is not available in this browser.");

        if (flip === 90) {
          rotatedContext.translate(height, 0);
          rotatedContext.rotate(Math.PI / 2);
        } else if (flip === 180) {
          rotatedContext.translate(width, height);
          rotatedContext.rotate(Math.PI);
        } else if (flip === 270) {
          rotatedContext.translate(0, width);
          rotatedContext.rotate(-Math.PI / 2);
        }
        rotatedContext.drawImage(canvas, 0, 0);
        outputCanvas = rotatedCanvas;
      }

      const pngBlob = await new Promise((resolve, reject) => {
        outputCanvas.toBlob((output) => {
          if (output) resolve(output);
          else reject(new Error(`Unable to encode PNG asset: ${sourceName}.`));
        }, "image/png");
      });
      return new Uint8Array(await pngBlob.arrayBuffer());
    } finally {
      URL.revokeObjectURL(url);
    }
  };
}());

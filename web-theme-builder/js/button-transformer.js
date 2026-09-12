(function () {
  "use strict";

  const app = window.WebThemeBuilder = window.WebThemeBuilder || {};

  function parseNumber(value, attribute, sourceName, minimum = -Infinity) {
    const match = typeof value === "string"
      ? value.trim().match(/^([+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?))(?:px)?$/i)
      : null;
    const number = match ? Number(match[1]) : Number.NaN;
    if (!Number.isFinite(number) || number < minimum) {
      throw new Error(`Invalid ${attribute} in SVG button ${sourceName}: ${value}.`);
    }
    return number;
  }

  function parseLength(value, attribute, sourceName) {
    const number = parseNumber(value, attribute, sourceName);
    if (number <= 0) throw new Error(`Invalid ${attribute} in SVG button ${sourceName}: ${value}.`);
    return number;
  }

  function parseViewBox(value, sourceName) {
    const numbers = typeof value === "string" ? value.trim().split(/[\s,]+/).map(Number) : [];
    if (numbers.length !== 4 || numbers.some((number) => !Number.isFinite(number))
      || numbers[2] <= 0 || numbers[3] <= 0) {
      throw new Error(`Invalid viewBox in SVG button ${sourceName}.`);
    }
    return { minX: numbers[0], minY: numbers[1], width: numbers[2], height: numbers[3] };
  }

  function formatNumber(value) {
    return String(Number(value.toFixed(6)));
  }

  function prependTransform(element, matrix) {
    const current = element.getAttribute("transform");
    element.setAttribute("transform", current ? `${matrix} ${current}` : matrix);
  }

  function scaleStrokeWidth(rectangle, scale, sourceName) {
    if (rectangle.hasAttribute("stroke-width")) {
      rectangle.setAttribute(
        "stroke-width",
        formatNumber(parseNumber(rectangle.getAttribute("stroke-width"), "stroke-width", sourceName, 0) * scale)
      );
    }
    if (rectangle.hasAttribute("style")) {
      rectangle.setAttribute("style", rectangle.getAttribute("style").replace(
        /(stroke-width\s*:\s*)([+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?))(px)?/gi,
        (match, prefix, value, unit = "") => `${prefix}${formatNumber(Number(value) * scale)}${unit}`
      ));
    }
  }

  app.transformButtonSvg = function transformButtonSvg({ height, sourceName, svgContent, width }) {
    const documentNode = app.parseThemeSvg(svgContent, sourceName);
    const svg = documentNode.documentElement;
    const viewBox = parseViewBox(svg.getAttribute("viewBox"), sourceName);
    parseLength(svg.getAttribute("width"), "width", sourceName);
    parseLength(svg.getAttribute("height"), "height", sourceName);

    const scaleX = width / viewBox.width;
    const scaleY = height / viewBox.height;
    const uniformScale = Math.min(scaleX, scaleY);
    const translateX = (width - viewBox.width * uniformScale) / 2 - viewBox.minX * uniformScale;
    const translateY = (height - viewBox.height * uniformScale) / 2 - viewBox.minY * uniformScale;
    const matrix = `matrix(${formatNumber(uniformScale)} 0 0 ${formatNumber(uniformScale)} ${formatNumber(translateX)} ${formatNumber(translateY)})`;

    for (const rectangle of documentNode.querySelectorAll("rect")) {
      const x = rectangle.hasAttribute("x")
        ? parseNumber(rectangle.getAttribute("x"), "x", sourceName)
        : 0;
      const y = rectangle.hasAttribute("y")
        ? parseNumber(rectangle.getAttribute("y"), "y", sourceName)
        : 0;
      rectangle.setAttribute("x", formatNumber((x - viewBox.minX) * scaleX));
      rectangle.setAttribute("y", formatNumber((y - viewBox.minY) * scaleY));
      rectangle.setAttribute("width", formatNumber(
        parseLength(rectangle.getAttribute("width"), "rect width", sourceName) * scaleX
      ));
      rectangle.setAttribute("height", formatNumber(
        parseLength(rectangle.getAttribute("height"), "rect height", sourceName) * scaleY
      ));
      for (const radius of ["rx", "ry"]) {
        if (rectangle.hasAttribute(radius)) {
          rectangle.setAttribute(radius, formatNumber(
            parseNumber(rectangle.getAttribute(radius), radius, sourceName, 0) * scaleY
          ));
        }
      }
      scaleStrokeWidth(rectangle, scaleY, sourceName);
    }

    for (const circle of documentNode.querySelectorAll("circle")) {
      const radius = parseLength(circle.getAttribute("r"), "circle radius", sourceName);
      const maximumRadius = Math.min(width, height) / (2 * uniformScale);
      circle.setAttribute("r", formatNumber(Math.min(radius, maximumRadius)));
      prependTransform(circle, matrix);
    }

    for (const shape of documentNode.querySelectorAll("ellipse, path, polygon, polyline, line, text")) {
      prependTransform(shape, matrix);
    }

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    return app.serializeThemeSvg(documentNode);
  };
}());

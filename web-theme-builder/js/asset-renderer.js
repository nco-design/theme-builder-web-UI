(function () {
  "use strict";

  const app = window.WebThemeBuilder = window.WebThemeBuilder || {};
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const encoder = new TextEncoder();
  const supportedTypes = new Set(["background", "button"]);
  const supportedFormats = new Set(["png", "svg"]);

  function outputPath(asset) {
    const target = asset["target-path"].replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
    const name = `${asset["icon-name"]}.${asset.format.toLowerCase()}`;
    const path = [target, name].filter(Boolean).join("/");
    if (path.split("/").some((part) => !part || part === "..")) {
      throw new Error(`Invalid output path for asset ${asset["icon-name"]}.`);
    }
    return path;
  }

  function sourcePath(project, asset) {
    const prefix = "/projects/";
    if (!asset.source.startsWith(prefix)) {
      throw new Error(`Unsupported source path for ${asset["icon-name"]}: ${asset.source}.`);
    }
    const relativePath = asset.source.slice(prefix.length);
    if (!relativePath || relativePath.split("/").some((part) => !part || part === "..")) {
      throw new Error(`Invalid source path for ${asset["icon-name"]}.`);
    }
    return `${project.root}assets/${relativePath}`;
  }

  function validateAsset(asset) {
    if (!asset || typeof asset !== "object"
      || typeof asset["icon-name"] !== "string" || !asset["icon-name"]
      || typeof asset["target-path"] !== "string"
      || typeof asset.source !== "string" || !asset.source
      || typeof asset.format !== "string"
      || !Number.isFinite(asset.width) || asset.width <= 0
      || !Number.isFinite(asset.height) || asset.height <= 0) {
      return false;
    }

    const format = asset.format.toLowerCase();
    if (!supportedFormats.has(format)) {
      throw new Error(`Unsupported output format for ${asset["icon-name"]}: ${asset.format}.`);
    }
    if (asset.type !== undefined && !supportedTypes.has(asset.type)) {
      throw new Error(`Unsupported asset type for ${asset["icon-name"]}: ${asset.type}.`);
    }
    if (asset.opacity !== undefined && (!Number.isFinite(asset.opacity)
      || asset.opacity < 0 || asset.opacity > 100)) {
      throw new Error(`Opacity for ${asset["icon-name"]} must be between 0 and 100.`);
    }
    return true;
  }

  async function renderAsset({ asset, colorMap, project }) {
    const archivePath = sourcePath(project, asset);
    if (!project.archive.has(archivePath)) return null;

    let svgContent;
    try {
      svgContent = decoder.decode(await project.archive.read(archivePath));
    } catch {
      throw new Error(`Unable to read SVG source: ${asset.source}.`);
    }
    svgContent = app.applyThemeColorMap(svgContent, colorMap);
    const opacity = asset.opacity === undefined ? 100 : asset.opacity;
    const format = asset.format.toLowerCase();

    if (format === "svg") {
      return encoder.encode(app.applySvgOpacity(svgContent, opacity, asset.source));
    }
    if (asset.type === "button") {
      svgContent = app.transformButtonSvg({
        height: asset.height,
        sourceName: asset.source,
        svgContent,
        width: asset.width
      });
    }
    return app.renderSvgToPng({
      fit: asset.type === "background" ? "cover" : "fill",
      height: asset.height,
      opacity,
      sourceName: asset.source,
      svgContent,
      width: asset.width
    });
  }

  app.renderThemeAssets = async function renderThemeAssets({
    frontend,
    onProgress = null,
    palette,
    project
  }) {
    if (!frontend || !palette || !project) {
      throw new Error("A project, frontend and palette are required to render theme assets.");
    }
    const assetMap = frontend.profiles.get("base")?.assetMap;
    if (!assetMap || !Array.isArray(assetMap.icons)) {
      throw new Error(`${frontend.label} does not define a valid base theme asset map.`);
    }

    const colorMap = app.createThemeColorMap(project.sourcePalette, palette);
    const files = new Map();
    let generatedCount = 0;
    let skippedCount = 0;

    for (let index = 0; index < assetMap.icons.length; index += 1) {
      const asset = assetMap.icons[index];
      if (!validateAsset(asset)) {
        console.warn("Asset skipped: incomplete frontend configuration", asset);
        skippedCount += 1;
        continue;
      }

      const bytes = await renderAsset({ asset, colorMap, project });
      if (!bytes) {
        console.warn(`Source asset not found: ${asset.source}`);
        skippedCount += 1;
      } else {
        files.set(outputPath(asset), bytes);
        generatedCount += 1;
      }
      onProgress?.({ completed: index + 1, generatedCount, skippedCount, total: assetMap.icons.length });
    }

    return { files, generatedCount, skippedCount };
  };
}());

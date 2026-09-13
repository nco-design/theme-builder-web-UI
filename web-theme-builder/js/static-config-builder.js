(function () {
  "use strict";

  const app = window.WebThemeBuilder = window.WebThemeBuilder || {};
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const forbiddenPathParts = new Set(["__proto__", "constructor", "prototype"]);
  const generatedNotice = "Generated with spruce-theme-builder. Learn more at https://github.com/nco-design/";

  function normalizeRelativePath(...parts) {
    const path = parts
      .filter((part) => part !== undefined && part !== null && part !== "")
      .join("/")
      .replaceAll("\\", "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/{2,}/g, "/");

    if (!path || path.split("/").some((part) => part === ".." || !part)) {
      throw new Error(`Invalid build path: ${path || "(empty)"}.`);
    }
    return path;
  }

  function parseJson(bytes, label) {
    try {
      const value = JSON.parse(decoder.decode(bytes));
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error();
      }
      return value;
    } catch {
      throw new Error(`${label} must contain a valid JSON object.`);
    }
  }

  function validateTable(value, label, { optional = false } = {}) {
    if (value === undefined && optional) return {};
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${label} must be an object.`);
    }
    return value;
  }

  function setConfigPath(config, configPath, value) {
    const parts = configPath.split(".");
    if (parts.some((part) => !part || forbiddenPathParts.has(part))) {
      throw new Error(`Invalid configuration path: ${configPath}.`);
    }

    let current = config;
    for (const part of parts.slice(0, -1)) {
      if (!Object.hasOwn(current, part) || !current[part]
        || typeof current[part] !== "object" || Array.isArray(current[part])) {
        throw new Error(`Parent path not found in config file: ${configPath}.`);
      }
      current = current[part];
    }
    current[parts.at(-1)] = value;
  }

  function joinDescriptions(...descriptions) {
    const parts = descriptions
      .map((description) => typeof description === "string"
        ? description.trim().replace(/\.+$/, "")
        : "")
      .filter(Boolean);
    return parts.length ? `${parts.join(". ")}.` : "";
  }

  function createMetadata(projectConfig, palette) {
    if (typeof projectConfig.description !== "string" || !projectConfig.description.trim()) {
      throw new Error("project-config.json must define a non-empty description.");
    }
    if (typeof projectConfig.Author !== "string" || !projectConfig.Author.trim()) {
      throw new Error("project-config.json must define a non-empty Author.");
    }

    return {
      name: `${projectConfig["theme-name"]}-${palette["palette-name"]}`,
      description: joinDescriptions(projectConfig.description, palette.description),
      author: projectConfig.Author.trim(),
      generatedNotice
    };
  }

  function injectConfig({ bytes, configFileId, configFileName, frontendId, palette, projectConfig }) {
    const config = parseJson(bytes, configFileName);
    const frontendConfig = validateTable(
      projectConfig["frontend-configs"]?.[frontendId],
      `frontend-configs.${frontendId}`
    );
    const bindings = validateTable(
      frontendConfig["palette-bindings"],
      `frontend-configs.${frontendId}.palette-bindings`
    );
    const overridesByFile = validateTable(
      frontendConfig["config-overrides"],
      `frontend-configs.${frontendId}.config-overrides`,
      { optional: true }
    );
    const overrides = validateTable(
      overridesByFile[configFileId],
      `frontend-configs.${frontendId}.config-overrides.${configFileId}`,
      { optional: true }
    );
    const properties = validateTable(palette.properties, `${palette["palette-name"]} properties`);

    for (const [configPath, paletteProperty] of Object.entries(bindings)) {
      const value = properties[paletteProperty];
      if (value === undefined || value === null || value === "") {
        throw new Error(`Color ${paletteProperty} is missing for config path ${configPath}.`);
      }
      setConfigPath(config, configPath, value);
    }
    for (const [configPath, value] of Object.entries(overrides)) {
      setConfigPath(config, configPath, value);
    }

    const metadata = createMetadata(projectConfig, palette);
    return encoder.encode(`${JSON.stringify({ ...metadata, ...config, ...metadata }, null, 4)}\n`);
  }

  function projectAssetPath(project, relativePath) {
    return `${project.root}assets/${relativePath}`;
  }

  async function fetchPlaceholder(frontendId, relativePath) {
    const urlPath = relativePath.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(
      `frontends/${encodeURIComponent(frontendId)}/placeholder-static-files/${urlPath}`
    );
    if (!response.ok) {
      throw new Error(`Missing static placeholder for ${relativePath}.`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async function copyFile({ frontendId, output, outputPath, project, sourcePath }) {
    const archivePath = projectAssetPath(project, sourcePath);
    const bytes = project.archive.has(archivePath)
      ? await project.archive.read(archivePath)
      : await fetchPlaceholder(frontendId, sourcePath);
    output.set(outputPath, bytes);
  }

  async function copyFolder({ frontendId, item, output, project }) {
    const targetRoot = normalizeRelativePath(item.target, item.name);
    const projectPrefix = projectAssetPath(project, `${item.name}/`);
    const projectFiles = project.assetPaths.filter((path) => path.startsWith(projectPrefix));
    const projectRelativeFiles = new Set(projectFiles.map((path) => path.slice(projectPrefix.length)));

    for (const relativePath of item.files) {
      const outputPath = normalizeRelativePath(targetRoot, relativePath);
      if (projectRelativeFiles.has(relativePath)) {
        output.set(outputPath, await project.archive.read(`${projectPrefix}${relativePath}`));
      } else {
        output.set(outputPath, await fetchPlaceholder(frontendId, `${item.name}/${relativePath}`));
      }
    }

    for (const archivePath of projectFiles) {
      const relativePath = archivePath.slice(projectPrefix.length);
      if (!relativePath) continue;
      output.set(
        normalizeRelativePath(targetRoot, relativePath),
        await project.archive.read(archivePath)
      );
    }
  }

  app.buildStaticFilesAndConfig = async function buildStaticFilesAndConfig({ frontend, palette, project }) {
    if (!frontend || !palette || !project) {
      throw new Error("A project, frontend and palette are required to build static files.");
    }

    const profile = frontend.profiles.get("base");
    if (!profile) throw new Error(`${frontend.label} does not define a base profile.`);

    const output = new Map();
    const configFiles = [];

    for (const item of profile.staticFiles) {
      if (item.type === "folder") {
        await copyFolder({ frontendId: frontend.id, item, output, project });
        continue;
      }

      const outputPath = normalizeRelativePath(item.target, item.name);
      await copyFile({
        frontendId: frontend.id,
        output,
        outputPath,
        project,
        sourcePath: item.name
      });
      if (item.type === "config-file") {
        configFiles.push({ id: item.id, path: outputPath });
      }
    }

    for (const configFile of configFiles) {
      output.set(configFile.path, injectConfig({
        bytes: output.get(configFile.path),
        configFileId: configFile.id,
        configFileName: configFile.path,
        frontendId: frontend.id,
        palette,
        projectConfig: project.config
      }));
    }

    return { configFiles, files: output };
  };
}());

window.SimpleProjectGenerator.initializeWorkflowHandoff = function initializeWorkflowHandoff() {
  const app = window.SimpleProjectGenerator;

  async function importPalette(palette) {
    if (!palette || typeof palette !== "object") return;
    const paletteName = typeof palette["palette-name"] === "string"
      ? palette["palette-name"]
      : "palette";
    const file = new File(
      [`${JSON.stringify(palette, null, 2)}\n`],
      `${paletteName}.json`,
      { type: "application/json" }
    );
    await app.importPaletteFile(file);
  }

  async function receivePaletteHandoff() {
    try {
      const handoff = await window.ThemeBuilderWorkflow.receive("palette-to-project");
      if (!handoff) return;

      await importPalette(handoff.palette);
      if (handoff.background?.file instanceof Blob) {
        const { file, name, type } = handoff.background;
        const background = file instanceof File
          ? file
          : new File([file], name || "reference-image", { type: type || file.type });
        await app.importBackgroundFile(background);
      }
    } catch (error) {
      console.error(error);
    }
  }

  void receivePaletteHandoff();
};

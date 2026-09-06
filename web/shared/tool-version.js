const currentToolId = document.body.dataset.toolId;
const currentTool = window.toolCatalog.find((tool) => tool.id === currentToolId);
const versionTarget = document.querySelector("[data-tool-version]");

if (currentTool && versionTarget) {
  versionTarget.textContent = currentTool.version;
}

const toolList = document.querySelector("[data-tool-list]");

for (const tool of window.toolCatalog) {
  const card = document.createElement("a");
  const name = document.createElement("h2");
  const description = document.createElement("p");

  card.className = "tool-card";
  card.href = tool.path;
  name.textContent = tool.name;
  description.textContent = tool.description;
  card.append(name, description);
  toolList.append(card);
}

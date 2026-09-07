const versionTarget = document.querySelector("[data-project-version]");

if (versionTarget) {
  const versionUrl = new URL("../VERSION", document.currentScript.src);

  fetch(versionUrl)
    .then((response) => {
      if (!response.ok) throw new Error("Unable to load the project version.");
      return response.text();
    })
    .then((version) => {
      versionTarget.textContent = version.trim();
    })
    .catch((error) => {
      console.error(error);
      versionTarget.textContent = "unavailable";
    });
}

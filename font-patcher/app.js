const REQUIRED_CODEPOINTS = [0x2190, 0x2191, 0x21b5, 0x21ea];
const SOURCE_FONT_URL = "assets/nunwen.ttf";

const fontInput = document.querySelector("[data-font-input]");
const downloadButton = document.querySelector("[data-download-button]");
const statusElement = document.querySelector("[data-patch-status]");

let patchedFontUrl = null;
let patchedFontName = null;
let sourceFontPromise = null;

function setStatus(message, state = "") {
  statusElement.textContent = message;
  statusElement.classList.toggle("is-error", state === "error");
  statusElement.classList.toggle("is-success", state === "success");
}

function detectFontType(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "ttf" || extension === "otf") {
    return extension;
  }

  throw new Error("Please select a TTF or OTF font.");
}

function hasCodepoint(font, codepoint) {
  return font.find({ unicode: [codepoint] }).length > 0;
}

function codepointLabel(codepoint) {
  return `U+${codepoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

function getSourceFont() {
  if (!sourceFontPromise) {
    sourceFontPromise = fetch(SOURCE_FONT_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("The bundled SpruceOS glyph font could not be loaded.");
        }

        return response.arrayBuffer();
      })
      .then((buffer) => window.FontEditorCore.createFont(buffer, {
        type: "ttf",
        compound2simple: true
      }));
  }

  return sourceFontPromise;
}

function resetDownload() {
  if (patchedFontUrl) {
    URL.revokeObjectURL(patchedFontUrl);
  }

  patchedFontUrl = null;
  patchedFontName = null;
  downloadButton.disabled = true;
}

async function patchFont(file) {
  resetDownload();
  setStatus("Patching font…");

  const inputType = detectFontType(file);
  const [receiverBuffer, sourceFont] = await Promise.all([
    file.arrayBuffer(),
    getSourceFont()
  ]);
  const receiverFont = window.FontEditorCore.createFont(receiverBuffer, {
    type: inputType,
    compound2simple: false,
    hinting: true,
    kerning: true
  });
  const missingCodepoints = REQUIRED_CODEPOINTS.filter(
    (codepoint) => !hasCodepoint(receiverFont, codepoint)
  );
  const sourceGlyphs = missingCodepoints.length
    ? sourceFont.find({ unicode: missingCodepoints })
    : [];
  const foundCodepoints = new Set(
    sourceGlyphs.flatMap((glyph) => glyph.unicode || [])
  );
  const unavailableCodepoints = missingCodepoints.filter(
    (codepoint) => !foundCodepoints.has(codepoint)
  );

  if (sourceGlyphs.length > 0) {
    const sourceData = sourceFont.get();
    const sourceSubset = window.FontEditorCore.createFont();
    sourceSubset.set({
      ...sourceData,
      glyf: sourceGlyphs.map((glyph) => structuredClone(glyph))
    });
    receiverFont.merge(sourceSubset, { scale: true });
  }

  const patchedBuffer = receiverFont.write({
    type: "ttf",
    hinting: true,
    kerning: true
  });
  const originalBaseName = file.name.replace(/\.[^.]+$/, "");

  patchedFontName = `${originalBaseName}-patched.ttf`;
  patchedFontUrl = URL.createObjectURL(
    new Blob([patchedBuffer], { type: "font/ttf" })
  );
  downloadButton.disabled = false;

  const copied = missingCodepoints.filter((codepoint) => foundCodepoints.has(codepoint));
  const alreadyPresent = REQUIRED_CODEPOINTS.filter(
    (codepoint) => !missingCodepoints.includes(codepoint)
  );
  const resultParts = [];

  if (copied.length) {
    resultParts.push(`added ${copied.map(codepointLabel).join(", ")}`);
  }
  if (alreadyPresent.length) {
    resultParts.push(`already present: ${alreadyPresent.map(codepointLabel).join(", ")}`);
  }
  if (unavailableCodepoints.length) {
    resultParts.push(`unavailable: ${unavailableCodepoints.map(codepointLabel).join(", ")}`);
  }

  setStatus(`Font ready — ${resultParts.join("; ")}.`, "success");
}

fontInput.addEventListener("change", async () => {
  const [file] = fontInput.files;

  if (!file) {
    resetDownload();
    setStatus("Select a TTF or OTF font to begin.");
    return;
  }

  try {
    await patchFont(file);
  } catch (error) {
    console.error("Font patching failed", error);
    resetDownload();
    setStatus(error instanceof Error ? error.message : "The font could not be patched.", "error");
  }
});

downloadButton.addEventListener("click", () => {
  if (!patchedFontUrl || !patchedFontName) {
    return;
  }

  const link = document.createElement("a");
  link.href = patchedFontUrl;
  link.download = patchedFontName;
  link.click();
});

window.addEventListener("beforeunload", resetDownload);

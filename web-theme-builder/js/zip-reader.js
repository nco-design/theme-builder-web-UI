(function () {
  "use strict";

  const app = window.WebThemeBuilder = window.WebThemeBuilder || {};
  const signatures = {
    localFile: 0x04034b50,
    centralFile: 0x02014b50,
    endOfCentralDirectory: 0x06054b50
  };
  const limits = {
    files: 5000,
    entrySize: 256 * 1024 * 1024,
    totalSize: 512 * 1024 * 1024
  };
  const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

  function findEndRecord(bytes) {
    const firstPossibleOffset = Math.max(0, bytes.length - 65557);

    for (let offset = bytes.length - 22; offset >= firstPossibleOffset; offset -= 1) {
      if (new DataView(bytes.buffer, bytes.byteOffset + offset, 4)
        .getUint32(0, true) === signatures.endOfCentralDirectory) {
        return offset;
      }
    }

    throw new Error("This file is not a valid ZIP archive.");
  }

  function decodePath(bytes) {
    try {
      return utf8Decoder.decode(bytes).replaceAll("\\", "/");
    } catch {
      throw new Error("The ZIP contains a filename that is not valid UTF-8.");
    }
  }

  function validatePath(path) {
    if (!path || path.startsWith("/") || path.split("/").includes("..")) {
      throw new Error(`The ZIP contains an unsafe path: ${path || "(empty)"}.`);
    }
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("This browser cannot extract compressed ZIP files.");
    }

    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      throw new Error("A compressed file in the ZIP could not be extracted.");
    }
  }

  function crc32(bytes) {
    let crc = 0xffffffff;

    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }

    return (crc ^ 0xffffffff) >>> 0;
  }

  class ZipArchive {
    constructor(bytes, entries) {
      this.bytes = bytes;
      this.entries = entries;
    }

    has(path) {
      return this.entries.has(path);
    }

    paths() {
      return [...this.entries.keys()];
    }

    async read(path) {
      const entry = this.entries.get(path);
      if (!entry) throw new Error(`Missing file in ZIP: ${path}.`);

      const localView = new DataView(
        this.bytes.buffer,
        this.bytes.byteOffset + entry.localOffset
      );
      if (localView.getUint32(0, true) !== signatures.localFile) {
        throw new Error(`Invalid ZIP data for ${path}.`);
      }

      const nameLength = localView.getUint16(26, true);
      const extraLength = localView.getUint16(28, true);
      const dataOffset = entry.localOffset + 30 + nameLength + extraLength;
      const dataEnd = dataOffset + entry.compressedSize;
      if (dataEnd > this.bytes.length) {
        throw new Error(`Truncated ZIP data for ${path}.`);
      }

      const compressed = this.bytes.subarray(dataOffset, dataEnd);
      const data = entry.method === 0 ? compressed.slice() : await inflateRaw(compressed);

      if (data.length !== entry.uncompressedSize || crc32(data) !== entry.crc) {
        throw new Error(`The ZIP data for ${path} is corrupted.`);
      }

      return data;
    }

    async readText(path) {
      try {
        return utf8Decoder.decode(await this.read(path));
      } catch (error) {
        if (error instanceof TypeError) {
          throw new Error(`${path} is not a valid UTF-8 text file.`);
        }
        throw error;
      }
    }
  }

  app.readZip = async function readZip(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const endOffset = findEndRecord(bytes);
    const endView = new DataView(bytes.buffer, bytes.byteOffset + endOffset);
    const diskNumber = endView.getUint16(4, true);
    const centralDisk = endView.getUint16(6, true);
    const fileCount = endView.getUint16(10, true);
    const centralSize = endView.getUint32(12, true);
    const centralOffset = endView.getUint32(16, true);

    if (diskNumber !== 0 || centralDisk !== 0) {
      throw new Error("Multi-part ZIP archives are not supported.");
    }
    if (fileCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
      throw new Error("ZIP64 archives are not supported.");
    }
    if (fileCount > limits.files) {
      throw new Error(`The ZIP contains too many files (maximum ${limits.files}).`);
    }
    if (centralOffset + centralSize > endOffset) {
      throw new Error("The ZIP central directory is invalid.");
    }

    const entries = new Map();
    let totalSize = 0;
    let offset = centralOffset;

    for (let index = 0; index < fileCount; index += 1) {
      if (offset + 46 > bytes.length) throw new Error("The ZIP central directory is truncated.");
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
      if (view.getUint32(0, true) !== signatures.centralFile) {
        throw new Error("The ZIP central directory is invalid.");
      }

      const flags = view.getUint16(8, true);
      const method = view.getUint16(10, true);
      const crc = view.getUint32(16, true);
      const compressedSize = view.getUint32(20, true);
      const uncompressedSize = view.getUint32(24, true);
      const nameLength = view.getUint16(28, true);
      const extraLength = view.getUint16(30, true);
      const commentLength = view.getUint16(32, true);
      const localOffset = view.getUint32(42, true);
      const recordLength = 46 + nameLength + extraLength + commentLength;

      if (offset + recordLength > bytes.length) throw new Error("The ZIP central directory is truncated.");
      const path = decodePath(bytes.subarray(offset + 46, offset + 46 + nameLength));
      validatePath(path);

      if ((flags & 0x0001) !== 0) throw new Error(`Encrypted ZIP entries are not supported (${path}).`);
      if (method !== 0 && method !== 8) {
        throw new Error(`Unsupported ZIP compression method for ${path}.`);
      }
      if (uncompressedSize > limits.entrySize) {
        throw new Error(`The file ${path} is too large to extract safely.`);
      }

      totalSize += uncompressedSize;
      if (totalSize > limits.totalSize) {
        throw new Error("The extracted project would be too large to process safely.");
      }

      if (!path.endsWith("/")) {
        if (entries.has(path)) throw new Error(`The ZIP contains the path ${path} more than once.`);
        entries.set(path, { compressedSize, crc, flags, localOffset, method, uncompressedSize });
      }
      offset += recordLength;
    }

    return new ZipArchive(bytes, entries);
  };
}());

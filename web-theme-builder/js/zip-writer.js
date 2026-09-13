(function () {
  "use strict";

  const app = window.WebThemeBuilder = window.WebThemeBuilder || {};
  const encoder = new TextEncoder();

  function toBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return encoder.encode(value);
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

  app.createZip = function createZip(files) {
    if (!(files instanceof Map) || files.size === 0) {
      throw new Error("No generated files are available for the ZIP archive.");
    }
    if (files.size > 0xffff) throw new Error("The theme contains too many files for a ZIP archive.");

    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const [path, value] of files) {
      const pathBytes = encoder.encode(path);
      const data = toBytes(value);
      const checksum = crc32(data);
      const localHeader = new Uint8Array(30 + pathBytes.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint32(14, checksum, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, pathBytes.length, true);
      localHeader.set(pathBytes, 30);
      localParts.push(localHeader, data);

      const centralHeader = new Uint8Array(46 + pathBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint32(16, checksum, true);
      centralView.setUint32(20, data.length, true);
      centralView.setUint32(24, data.length, true);
      centralView.setUint16(28, pathBytes.length, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(pathBytes, 46);
      centralParts.push(centralHeader);
      offset += localHeader.length + data.length;
    }

    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, files.size, true);
    endView.setUint16(10, files.size, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);

    return new Blob([...localParts, ...centralParts, endRecord], { type: "application/zip" });
  };
}());

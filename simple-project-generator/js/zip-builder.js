window.SimpleProjectGenerator.ZipBuilder = class ZipBuilder {
  constructor() {
    this.files = [];
  }

  static toBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return new TextEncoder().encode(value);
  }

  static crc32(bytes) {
    let crc = 0xffffffff;

    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }

    return (crc ^ 0xffffffff) >>> 0;
  }

  addFile(path, value) {
    const data = ZipBuilder.toBytes(value);
    this.files.push({
      path: new TextEncoder().encode(path),
      data,
      crc: ZipBuilder.crc32(data)
    });
  }

  build() {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of this.files) {
      const localHeader = new Uint8Array(30 + file.path.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint32(14, file.crc, true);
      localView.setUint32(18, file.data.length, true);
      localView.setUint32(22, file.data.length, true);
      localView.setUint16(26, file.path.length, true);
      localHeader.set(file.path, 30);
      localParts.push(localHeader, file.data);

      const centralHeader = new Uint8Array(46 + file.path.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint32(16, file.crc, true);
      centralView.setUint32(20, file.data.length, true);
      centralView.setUint32(24, file.data.length, true);
      centralView.setUint16(28, file.path.length, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(file.path, 46);
      centralParts.push(centralHeader);

      offset += localHeader.length + file.data.length;
    }

    const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, this.files.length, true);
    endView.setUint16(10, this.files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);

    return new Blob([...localParts, ...centralParts, endRecord], {
      type: "application/zip"
    });
  }
};

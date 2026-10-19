import { inflateSync } from "node:zlib";

/**
 * WOFF 1.0 → raw sfnt (TTF/OTF). resvg's font loader only reads sfnt, while Satori and the
 * committed assets use WOFF. WOFF is just zlib-compressed tables plus a header, so unpacking
 * means inflating each table and rebuilding the sfnt table directory.
 */
export function woffToSfnt(woff: Uint8Array): Uint8Array {
  const view = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  if (view.getUint32(0) !== 0x774f4646) throw new Error("Not a WOFF 1.0 file"); // 'wOFF'
  const flavor = view.getUint32(4);
  const numTables = view.getUint16(12);

  const tables: { tag: number; checksum: number; data: Uint8Array }[] = [];
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20;
    const offset = view.getUint32(entry + 4);
    const compLength = view.getUint32(entry + 8);
    const origLength = view.getUint32(entry + 12);
    const raw = woff.subarray(offset, offset + compLength);
    tables.push({
      tag: view.getUint32(entry),
      checksum: view.getUint32(entry + 16),
      data: compLength < origLength ? new Uint8Array(inflateSync(raw)) : raw,
    });
  }

  let entrySelector = 0;
  while (1 << (entrySelector + 1) <= numTables) entrySelector++;
  const searchRange = (1 << entrySelector) * 16;

  const pad4 = (n: number) => (n + 3) & ~3;
  const size = tables.reduce((sum, t) => sum + pad4(t.data.length), 12 + numTables * 16);
  const out = new Uint8Array(size);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, flavor);
  dv.setUint16(4, numTables);
  dv.setUint16(6, searchRange);
  dv.setUint16(8, entrySelector);
  dv.setUint16(10, numTables * 16 - searchRange);

  let offset = 12 + numTables * 16;
  tables.forEach((t, i) => {
    const record = 12 + i * 16;
    dv.setUint32(record, t.tag);
    dv.setUint32(record + 4, t.checksum);
    dv.setUint32(record + 8, offset);
    dv.setUint32(record + 12, t.data.length);
    out.set(t.data, offset);
    offset += pad4(t.data.length);
  });
  return out;
}

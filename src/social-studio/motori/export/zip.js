/**
 * Scrittore ZIP minimale, senza dipendenze.
 *
 * Migrato invariato dal prototipo: funzionava, non c'era ragione di riscriverlo.
 *
 * I PNG sono già compressi: comprimerli di nuovo non farebbe guadagnare quasi
 * nulla. Si usa quindi il metodo "store" (nessuna compressione), che rende il
 * formato semplicissimo da produrre — poche decine di righe invece di una
 * libreria da un centinaio di KB.
 *
 * Il file prodotto è uno ZIP standard, apribile da Finder, Windows e da
 * qualsiasi programma di archiviazione.
 */

const TABELLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(dati) {
  let c = 0xffffffff;
  for (let i = 0; i < dati.length; i += 1) c = TABELLA_CRC[(c ^ dati[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Data e ora in formato MS-DOS, come richiede il formato ZIP. */
function dataDos(d = new Date()) {
  const ora = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31);
  const data = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
  return { ora, data };
}

/**
 * Crea un archivio ZIP.
 *
 * @param {{nome: string, dati: Uint8Array}[]} file
 * @returns {Blob}
 */
export function creaZip(file) {
  const codifica = new TextEncoder();
  const { ora, data } = dataDos();
  const pezzi = [];
  const centrale = [];
  let offset = 0;

  for (const f of file) {
    const nome = codifica.encode(f.nome);
    const crc = crc32(f.dati);
    const dimensione = f.dati.length;

    // Intestazione locale
    const locale = new DataView(new ArrayBuffer(30));
    locale.setUint32(0, 0x04034b50, true); // firma
    locale.setUint16(4, 20, true); // versione minima
    locale.setUint16(6, 0x0800, true); // nomi in UTF-8
    locale.setUint16(8, 0, true); // metodo: store
    locale.setUint16(10, ora, true);
    locale.setUint16(12, data, true);
    locale.setUint32(14, crc, true);
    locale.setUint32(18, dimensione, true);
    locale.setUint32(22, dimensione, true);
    locale.setUint16(26, nome.length, true);
    locale.setUint16(28, 0, true); // extra field

    pezzi.push(new Uint8Array(locale.buffer), nome, f.dati);

    // Voce della directory centrale
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true); // versione di creazione
    dir.setUint16(6, 20, true); // versione minima
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(10, 0, true);
    dir.setUint16(12, ora, true);
    dir.setUint16(14, data, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, dimensione, true);
    dir.setUint32(24, dimensione, true);
    dir.setUint16(28, nome.length, true);
    dir.setUint16(30, 0, true);
    dir.setUint16(32, 0, true);
    dir.setUint16(34, 0, true);
    dir.setUint16(36, 0, true);
    dir.setUint32(38, 0, true);
    dir.setUint32(42, offset, true);
    centrale.push(new Uint8Array(dir.buffer), nome);

    offset += 30 + nome.length + dimensione;
  }

  const inizioCentrale = offset;
  const dimensioneCentrale = centrale.reduce((s, p) => s + p.length, 0);

  const fine = new DataView(new ArrayBuffer(22));
  fine.setUint32(0, 0x06054b50, true);
  fine.setUint16(4, 0, true);
  fine.setUint16(6, 0, true);
  fine.setUint16(8, file.length, true);
  fine.setUint16(10, file.length, true);
  fine.setUint32(12, dimensioneCentrale, true);
  fine.setUint32(16, inizioCentrale, true);
  fine.setUint16(20, 0, true);

  return new Blob([...pezzi, ...centrale, new Uint8Array(fine.buffer)], {
    type: "application/zip",
  });
}

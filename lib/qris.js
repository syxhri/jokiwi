// lib/qris.js

import QRCode from 'qrcode';

/**
 * CRC-16/CCITT-FALSE
 * init=0xFFFF, poly=0x1021, no reflect, no xorout
 * output 4-hex uppercase
 */
export function crc16CcittFalse(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) & 0xff) << 8;
    for (let b = 0; b < 8; b++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function convertQrisStaticToDynamic(qris, amount, feeMode = null, feeValue = null) {
  qris = String(qris).trim();
  amount = String(amount).trim();

  if (qris.length < 8) throw new Error('QRIS terlalu pendek / tidak valid.');
  if (!/^\d+$/.test(amount)) throw new Error('Nominal harus angka (tanpa titik/koma).');

  // 1) remove last 4 chars (CRC)
  const noCrc = qris.slice(0, -4);

  // 2) static -> dynamic indicator (replace once)
  const step1 = noCrc.replace('010211', '010212');

  // 3) split at "5802ID"
  const idx = step1.indexOf('5802ID');
  if (idx === -1) throw new Error("Tag '5802ID' tidak ditemukan di QRIS (format tidak sesuai).");

  const left = step1.slice(0, idx);
  const right = step1.slice(idx + '5802ID'.length);

  // Tag 54 (amount)
  const uang = `54${amount.length.toString().padStart(2, '0')}${amount}`;

  // Optional Tag 55 (fee)
  let tax = '';
  if (feeMode) {
    feeValue = String(feeValue ?? '').trim();
    if (!/^\d+$/.test(feeValue)) throw new Error('Fee harus angka (tanpa titik/koma).');

    if (feeMode === 'r') {
      tax = `55020256${feeValue.length.toString().padStart(2, '0')}${feeValue}`;
    } else if (feeMode === 'p') {
      tax = `55020357${feeValue.length.toString().padStart(2, '0')}${feeValue}`;
    } else {
      throw new Error("feeMode harus null, 'r', atau 'p'.");
    }
  }

  // 4) reassemble (insert before 5802ID)
  const fixed = `${left}${uang}${tax}5802ID${right}`;

  // 5) append new CRC
  return fixed + crc16CcittFalse(fixed);
}

/**
 * defGen(): convert static QRIS -> dynamic (amount) then generate QR code data URL
 *
 * @param {object} args
 * @param {string} args.qris - static QRIS payload
 * @param {string|number} args.amount - amount digits
 * @param {'r'|'p'|null} [args.feeMode]
 * @param {string|number|null} [args.feeValue]
 * @returns {Promise<{payload: string, dataUrl: string}>}
 */
export async function defGen({ qris, amount, feeMode = null, feeValue = null }) {
  const payload = convertQrisStaticToDynamic(qris, amount, feeMode, feeValue);
  const dataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M' });
  return { payload, dataUrl };
}

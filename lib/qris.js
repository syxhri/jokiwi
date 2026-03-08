import QRCode from "qrcode";

export function crc16CcittFalse(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) & 0xff) << 8;
    for (let b = 0; b < 8; b++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function convertQrisStaticToDynamic(
  qris,
  amount,
  feeMode = null,
  feeValue = null
) {
  qris = String(qris).trim();
  amount = String(amount).trim();

  if (qris.length < 8) throw new Error("QRIS terlalu pendek / tidak valid.");
  if (!/^\d+$/.test(amount))
    throw new Error("Nominal harus angka (tanpa titik/koma).");

  // 1) remove last 4 chars (CRC)
  const noCrc = qris.slice(0, -4);

  // 2) static to dynamic indicator (replace once)
  const step1 = noCrc.replace("010211", "010212");

  // 3) split at "5802ID"
  const idx = step1.indexOf("5802ID");
  if (idx === -1)
    throw new Error(
      "Tag '5802ID' tidak ditemukan di QRIS (format tidak sesuai)."
    );

  const left = step1.slice(0, idx);
  const right = step1.slice(idx + "5802ID".length);

  // Tag 54 (amount)
  const uang = `54${amount.length.toString().padStart(2, "0")}${amount}`;

  // Optional Tag 55 (fee)
  let tax = "";
  if (feeMode) {
    feeValue = String(feeValue ?? "").trim();
    if (!/^\d+$/.test(feeValue))
      throw new Error("Fee harus angka (tanpa titik/koma).");

    if (feeMode === "r") {
      tax = `55020256${feeValue.length.toString().padStart(2, "0")}${feeValue}`;
    } else if (feeMode === "p") {
      tax = `55020357${feeValue.length.toString().padStart(2, "0")}${feeValue}`;
    } else {
      throw new Error("feeMode harus null, 'r', atau 'p'.");
    }
  }

  // 4) reassemble (insert before 5802ID)
  const fixed = `${left}${uang}${tax}5802ID${right}`;

  // 5) append new CRC
  return fixed + crc16CcittFalse(fixed);
}

export async function defGen({
  qris,
  amount,
  feeMode = null,
  feeValue = null,
}) {
  const payload = convertQrisStaticToDynamic(qris, amount, feeMode, feeValue);
  // const dataUrl = await QRCode.toDataURL(payload, {
    // errorCorrectionLevel: "M",
  // });
  const resp = await fetch("https://api.qrcode-monkey.com/qr/custom", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; itel S666LN Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.31 Mobile Safari/537.36",
      "Referer": "https://www.qrcode-monkey.com/#text",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: payload,
      size: 2048,
      download: "imageUrl",
      file: "png",
      config: {
        body: "mosaic",
        eye: "frame12",
        eyeBall: "ball5",
        erf1: [],
        erf2: [],
        erf3: [],
        brf1: [],
        brf2: [],
        brf3: [],
        bodyColor: "#0277BD",
        bgColor: "#FFFFFF",
        eye1Color: "#000000",
        eye2Color: "#000000",
        eye3Color: "#000000",
        eyeBall1Color: "#000000",
        eyeBall2Color: "#000000",
        eyeBall3Color: "#000000",
        gradientColor1: "#1E8DD0",
        gradientColor2: "#484D48",
        gradientType: "radial",
        gradientOnEyes: true,
        logo: "0a8c87d4d4f13c42518da865e74d10ed4b09ce35.png",
        logoMode: "default",
      }
    })
  });
  
  const data = await resp.json();
  const dataUrl = data?.imageUrl;
  return { payload, dataUrl };
}

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireBotUser } from "@/lib/bot.js";
import chromium from "@sparticuz/chromium";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

async function getBrowser() {
  const isVercel = !!process.env.VERCEL;

  if (isVercel) {
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  return puppeteer.launch({
    headless: true,
  });
}

export async function GET(req, { params }) {
  const { user, error, status } = await requireBotUser(req);
  if (!user && error && status >= 400) {
    return NextResponse.json({ error }, { status });
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({
      error: "Missing bearer token",
      detail: `token: ${token}`,
    }, { status: 401 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "png";

  const origin = process.env.APP_URL || `${url.protocol}//${url.host}`;
  const orderCode = params.id;

  const receiptUrl = `${origin}/print/receipt/${orderCode}`;

  const browser = await getBrowser();

  const page = await browser.newPage();

  const { hostname } = new URL(origin);
  await page.setCookie({
    name: "token",
    value: token,
    domain: hostname,
    path: "/",
    httpOnly: false,
    sameSite: "Lax",
  });

  await page.setViewport({
    width: 600,
    height: 800,
    deviceScaleFactor: 2,
  });

  await page.goto(receiptUrl, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-receipt-root]");

  await page.evaluate(() => {
    const receipt = document.querySelector("[data-receipt-root]");
    if (!receipt) return;

    const cloned = receipt.cloneNode(true);

    document.body.innerHTML = "";
    document.body.style.margin = "0";

    const wrapper = document.createElement("div");
    wrapper.style.minHeight = "100vh";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.background = "#f3f4f6";

    wrapper.appendChild(cloned);
    document.body.appendChild(wrapper);
  });

  const rect = await page.$eval("[data-receipt-root]", (el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });

  let buf;
  if (format === "pdf") {
    buf = await page.pdf({
      printBackground: true,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });
  } else {
    const receiptHandle = await page.$("[data-receipt-root]");
    buf = await receiptHandle.screenshot({
      type: "png",
      omitBackground: false,
    });
  }

  await browser.close();

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "image/png",
      "Content-Disposition": `inline; filename="Receipt_${orderCode}.${format}"`,
    },
  });
}
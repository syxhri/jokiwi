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

function isTruthyParam(value) {
  if (value == null) return false;
  const v = String(value).toLowerCase().trim();
  return v !== "" && v !== "0" && v !== "false" && v !== "no";
}

export async function GET(req, { params }) {
  const { user, error, status } = await requireBotUser(req);
  if (!user && error && status >= 400) {
    return NextResponse.json({ error }, { status });
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "png").toLowerCase();
  const wantsJson = isTruthyParam(url.searchParams.get("json"));

  const origin = process.env.APP_URL;
  if (!origin) {
    return NextResponse.json(
      { error: "APP_URL is not set (required for puppeteer rendering on Vercel)" },
      { status: 500 }
    );
  }

  const orderCode = params.id;
  const receiptUrl = `${origin}/print/receipt/${orderCode}`;

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    // Debug hooks
    page.on("console", (msg) => console.log("PAGE CONSOLE:", msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.toString()));
    page.on("requestfailed", (req) =>
      console.log("REQ FAILED:", req.url(), req.failure()?.errorText)
    );
    page.on("response", (res) => {
      const s = res.status();
      if (s >= 300) console.log("RESPONSE:", s, res.url());
    });

    // Make auth robust: header + cookie
    await page.setExtraHTTPHeaders({
      authorization: `Bearer ${token}`,
    });

    await page.setCookie({
      name: "token",
      value: token,
      url: origin,
      path: "/",
      sameSite: "Lax",
      secure: origin.startsWith("https://"),
    });

    await page.setViewport({ width: 600, height: 800, deviceScaleFactor: 2 });

    await page.goto(receiptUrl, { waitUntil: "networkidle0", timeout: 90000 });

    console.log("Final URL:", page.url());
    console.log("Status:", (await page.mainFrame().response())?.status());

    // If redirected, fail fast with meaningful error
    if (!page.url().includes(`/print/receipt/`)) {
      const html = await page.content();
      return NextResponse.json(
        {
          error: "Unexpected redirect / not on receipt page",
          finalUrl: page.url(),
          snippet: html.slice(0, 500),
        },
        { status: 500 }
      );
    }

    await page.waitForFunction(
      () => !!document.querySelector("[data-receipt-root]"),
      { timeout: 90000 }
    );

    // Now do your DOM cleanup
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
    let contentType;

    if (format === "pdf") {
      buf = await page.pdf({
        printBackground: true,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      });
      contentType = "application/pdf";
    } else {
      const receiptHandle = await page.$("[data-receipt-root]");
      buf = await receiptHandle.screenshot({
        type: "png",
        omitBackground: false,
      });
      contentType = "image/png";
    }

    const filename = `Receipt_${orderCode}.${format === "pdf" ? "pdf" : "png"}`;

    if (wantsJson) {
      return NextResponse.json(
        {
          ok: true,
          orderId: orderCode,
          format: format === "pdf" ? "pdf" : "png",
          contentType,
          filename,
          encoding: "base64",
          data: Buffer.from(buf).toString("base64"),
        },
        { status: 200 }
      );
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e?.message || e), stack: e?.stack },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
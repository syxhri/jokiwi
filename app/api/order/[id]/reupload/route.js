export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth.js";
import { findOrder, setOrderFile, setOrderExternalLink } from "@/lib/db.js";
import { uploadFile, deleteFile, validateFile, sanitizeFilename } from "@/lib/storage.js";
import { notifyCustomer } from "@/lib/notify.js";
import { apiLimiter, getClientIp } from "@/lib/client.js";

/** POST /api/order/[id]/reupload — Upload ulang file hasil kerja */
export async function POST(request, { params }) {
  const ip = getClientIp(request);
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Terlalu banyak request." }, { status: 429 });
  }

  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    let userId;
    try {
      userId = verifyToken(token).userId;
    } catch {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { id } = await params;

    const order = await findOrder(userId, id);
    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.status !== "done" && order.status !== "accepted") {
      return NextResponse.json(
        { error: "Hanya order yang sudah diproses yang bisa di-reupload" },
        { status: 400 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    // Support JSON body untuk external link update
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      const externalLink = (body.external_link || "").trim();

      if (!externalLink || !/^https?:\/\//i.test(externalLink)) {
        return NextResponse.json(
          { error: "Link external harus berupa URL valid (http:// atau https://)" },
          { status: 400 }
        );
      }

      const updated = await setOrderExternalLink(userId, id, externalLink);

      await notifyCustomer(updated.customer_push_token, "result_ready", {
        orderCode: updated.orderCode,
        taskName: updated.task_name,
        isPaid: updated.is_paid,
      });

      return NextResponse.json({
        message: "Link external berhasil diperbarui",
        order: updated,
      });
    }

    const formData = await request.formData();
    const formLink = formData.get("external_link");
    if (formLink && typeof formLink === "string" && formLink.trim()) {
      const linkStr = formLink.trim();
      if (!/^https?:\/\//i.test(linkStr)) {
        return NextResponse.json(
          { error: "Link external harus berupa URL valid (http:// atau https://)" },
          { status: 400 }
        );
      }
      const updated = await setOrderExternalLink(userId, id, linkStr);
      await notifyCustomer(updated.customer_push_token, "result_ready", {
        orderCode: updated.orderCode,
        taskName: updated.task_name,
        isPaid: updated.is_paid,
      });
      return NextResponse.json({
        message: "Link external berhasil diperbarui",
        order: updated,
      });
    }

    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File atau Link External wajib diisi" }, { status: 400 });
    }

    const filename = file.name || "hasil";
    const mimetype = file.type || "application/octet-stream";
    const sizeBytes = file.size;

    const validation = validateFile(filename, mimetype, sizeBytes);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (order.storage_path) {
      await deleteFile(order.storage_path);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { storagePath } = await uploadFile(
      order.orderCode,
      buffer,
      sanitizeFilename(filename),
      mimetype
    );

    const updated = await setOrderFile(userId, id, {
      storagePath,
      originalFilename: filename,
    });

    await notifyCustomer(updated.customer_push_token, "result_ready", {
      orderCode: updated.orderCode,
      taskName: updated.task_name,
      isPaid: updated.is_paid,
    });

    return NextResponse.json({
      message: "File berhasil diupload ulang",
      order: updated,
    });
  } catch (err) {
    console.error("Failed to reupload file:", err);
    return NextResponse.json({ error: "Gagal mengupload ulang file" }, { status: 500 });
  }
}

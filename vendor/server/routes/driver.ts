import { Router } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { z } from "zod";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { makeId } from "@explorevalley/shared";
import { mutateData, readData } from "../services/jsondb";
import { getAuthClaims, requireAuth } from "../middleware/auth";
import { publishRealtime, subscribeRealtime } from "../services/realtime";
import { ensureInvoiceForCompletedTransaction } from "../services/invoice";
import { getJwtSecret } from "../services/runtimeConfig";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const SUPABASE_BUCKET = process.env.SUPABASE_DRIVER_DOCS_BUCKET || "driver-docs";

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function normalizePhone(v: any) {
  const n = safeText(v).replace(/\s+/g, "");
  if (!n) return "";
  return n.startsWith("+") ? n : `+${n}`;
}

function normalizeUsername(v: any) {
  return safeText(v)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .trim();
}

function normalizeRideOtpStatus(ride: any) {
  const explicit = safeText((ride as any)?.rideOtpStatus || "").toLowerCase();
  if (["not_required", "pending", "verified"].includes(explicit)) return explicit;
  if (safeText((ride as any)?.rideOtpVerifiedAt || "")) return "verified";
  if (safeText((ride as any)?.rideOtp || "")) return "pending";
  return "not_required";
}

function deriveRidePaymentStatus(ride: any, assignment?: any, bid?: any) {
  const explicit = safeText((ride as any)?.paymentStatus || (ride as any)?.payment_status || "").toLowerCase();
  if (explicit) return explicit;
  const rideStatus = safeText((ride as any)?.status || (ride as any)?.rideStatus || "").toLowerCase();
  const assignmentStatus = safeText((assignment as any)?.status || "").toLowerCase();
  const bidStatus = safeText((bid as any)?.status || "").toLowerCase();
  if (["confirmed", "started", "completed"].includes(rideStatus)) return "paid";
  if (["assigned", "accepted", "started", "completed"].includes(assignmentStatus)) return "paid";
  if (bidStatus === "accepted") return "paid";
  if (safeText((ride as any)?.selectedBidId || (ride as any)?.selected_bid_id || (assignment as any)?.bidId || (assignment as any)?.bid_id || "")) {
    return "pending";
  }
  return "";
}

function deriveRideOtpRequired(ride: any, assignment?: any) {
  if (safeText((ride as any)?.rideOtp || "")) return true;
  const rideStatus = safeText((ride as any)?.status || (ride as any)?.rideStatus || "").toLowerCase();
  const assignmentStatus = safeText((assignment as any)?.status || "").toLowerCase();
  return ["confirmed", "started"].includes(rideStatus) && ["assigned", "accepted", "started"].includes(assignmentStatus);
}

const GOOGLE_MAPS_JS_KEY_ENV_KEYS = [
  "EXPO_PUBLIC_GOOGLE_MAPS_JS_API_KEY",
  "GOOGLE_MAPS_JS_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_KEY",
  "EXPO_PUBLIC_GOOGLE_DIRECTIONS_API_KEY",
  "EXPO_PUBLIC_GOOGLE_PLACES_API_KEY",
  "EXPO_PUBLIC_GOOGLE_ROADS_API_KEY"
] as const;

function parseDotEnvForKey(filePath: string) {
  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
  const lines = content.split(/\r?\n/);
  const targetKeys = new Set<string>(GOOGLE_MAPS_JS_KEY_ENV_KEYS);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = safeText(match[1]);
    if (!targetKeys.has(key)) continue;
    const raw = safeText(match[2] || "");
    const unwrapped = raw.replace(/^(['"])(.*)\1$/, "$2");
    const value = safeText(unwrapped);
    if (value) return value;
  }
  return "";
}

function readGoogleMapsJsApiKey() {
  for (const envKey of GOOGLE_MAPS_JS_KEY_ENV_KEYS) {
    const value = safeText((process.env as any)?.[envKey]);
    if (value) return value;
  }
  const roots = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../..")
  ];
  const candidates = new Set<string>();
  for (const root of roots) {
    candidates.add(path.resolve(root, ".env"));
    candidates.add(path.resolve(root, "server/.env"));
    candidates.add(path.resolve(root, "apps/app/.env"));
  }
  for (const filePath of candidates) {
    const value = parseDotEnvForKey(filePath);
    if (value) return value;
  }
  return "";
}

function signDriverToken(payload: { driverId: string; phone: string; name: string; username?: string }) {
  return jwt.sign({ sub: payload.driverId, phone: payload.phone, name: payload.name, username: safeText(payload.username), role: "driver", mode: "driver" }, getJwtSecret(), {
    expiresIn: "7d"
  });
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const text = safeText(storedHash);
  if (!text) return false;
  if (!text.startsWith("scrypt$")) return text === password;
  const parts = text.split("$");
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const expected = parts[2];
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  if (expected.length !== candidate.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(candidate, "hex"));
}

function driverRouteErrorStatus(message: string) {
  const code = safeText(message).toUpperCase();
  if (!code) return 500;
  if ([
    "INVALID_INPUT",
    "RIDE_ID_REQUIRED",
    "OTP_REQUIRED",
    "RIDE_OTP_NOT_READY",
    "INVALID_RIDE_OTP",
    "OTP_VERIFICATION_REQUIRED",
    "USERNAME_REQUIRED",
    "PASSWORD_REQUIRED",
  ].includes(code)) return 400;
  if ([
    "AUTH_REQUIRED",
    "INVALID_TOKEN",
  ].includes(code)) return 401;
  if ([
    "DRIVER_AUTH_REQUIRED",
    "DRIVER_NOT_APPROVED",
  ].includes(code)) return 403;
  if ([
    "DRIVER_NOT_FOUND",
    "RIDE_NOT_FOUND",
    "ASSIGNMENT_NOT_FOUND",
    "BID_NOT_FOUND",
  ].includes(code)) return 404;
  if ([
    "TRIP_ALREADY_CLOSED",
    "RIDE_NOT_OPEN",
  ].includes(code)) return 409;
  return 500;
}

function detectImageType(buffer: Buffer) {
  if (buffer.length >= 8) {
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (pngSig.every((b, i) => buffer[i] === b)) return { ext: "png", contentType: "image/png" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (buffer.length >= 4 && buffer.slice(0, 4).toString("ascii") === "%PDF") {
    return { ext: "pdf", contentType: "application/pdf" };
  }
  return null;
}

function encodePath(value: string) {
  return value.split("/").map(encodeURIComponent).join("/");
}

async function uploadDriverDocumentToSupabase(buffer: Buffer, contentType: string, ext: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  const safeExt = (ext || "jpg").replace(/[^a-z0-9]/gi, "");
  const objectPath = `driver-docs/${Date.now()}_${makeId("driverdoc")}.${safeExt}`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${encodePath(SUPABASE_BUCKET)}/${encodePath(objectPath)}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": contentType
    },
    body: buffer as any
  });
  if (!response.ok) throw new Error(`SUPABASE_UPLOAD_FAILED:${response.status}:${await response.text()}`);
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodePath(SUPABASE_BUCKET)}/${encodePath(objectPath)}`;
  return { publicUrl, objectPath };
}

async function requireDriverAuth(req: any, res: any, next: any) {
  await requireAuth(req, res, () => undefined);
  if (res.headersSent) return;
  const claims: any = getAuthClaims(req);
  if (!claims?.sub) return res.status(401).json({ error: "AUTH_REQUIRED" });
  if (safeText(claims?.role).toLowerCase() !== "driver" && safeText(claims?.mode).toLowerCase() !== "driver") {
    return res.status(403).json({ error: "DRIVER_AUTH_REQUIRED" });
  }
  return next();
}

const DriverRegistrationSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().or(z.string().length(0)).default(""),
  vehicleType: z.string().min(1),
  carName: z.string().default(""),
  vehicleNumber: z.string().min(1),
  licenseNumber: z.string().min(1),
  idProofUrl: z.string().default(""),
  notes: z.string().default(""),
  documents: z.array(z.object({
    kind: z.string().default("other"),
    url: z.string().min(1),
    label: z.string().default("")
  })).default([])
});

const DriverLoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4)
});

const DriverAvailabilitySchema = z.object({
  online: z.boolean(),
  lat: z.number().optional(),
  lng: z.number().optional()
});

const DriverVehicleUpdateSchema = z.object({
  carName: z.string().min(1).max(80).optional(),
  vehicleType: z.enum(["ordinary", "luxury", "suv", "traveller"]).optional()
});

const DriverProfileUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().min(8).optional()
});

const DriverPhoneChangeRequestSchema = z.object({
  phone: z.string().min(8)
});

const DriverBidSchema = z.object({
  rideRequestId: z.string().min(1),
  bidPrice: z.number().positive(),
  etaMin: z.number().int().positive()
});

const ADMIN_CHAT_IDS = String(process.env.ADMIN_CHAT_IDS || "")
  .split(",")
  .map((v) => Number(String(v || "").trim()))
  .filter((v) => Number.isFinite(v) && v > 0);
const TELEGRAM_BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();

async function notifyDriverPhoneChangeRequestToAdmins(payload: {
  driverId: string;
  driverName: string;
  username: string;
  currentPhone: string;
  requestedPhone: string;
  requestId: string;
}) {
  if (!TELEGRAM_BOT_TOKEN || !ADMIN_CHAT_IDS.length) return;
  const msg =
    `DRIVER PHONE CHANGE REQUEST\n\n` +
    `Request ID: ${payload.requestId}\n` +
    `Driver: ${payload.driverName || "Driver"}\n` +
    `Driver ID: ${payload.driverId}\n` +
    `Username: ${payload.username || "—"}\n` +
    `Current Phone: ${payload.currentPhone || "—"}\n` +
    `Requested Phone: ${payload.requestedPhone || "—"}\n\n` +
    `Review this in the admin dashboard.`;

  await Promise.allSettled(
    ADMIN_CHAT_IDS.map(async (chatId) => {
      const endpoint = `https://api.telegram.org/bot${encodeURIComponent(TELEGRAM_BOT_TOKEN)}/sendMessage`;
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg })
      });
    })
  );
}

export function driverRouter() {
  const r = Router();

  // Same defect, same fix as the cab router: Express 4 leaves a rejected promise
  // from an async handler unhandled, and Node then tears the whole API process
  // down — so a driver bidding on a ride that had already been taken did not get
  // an error, it took the server offline and every rider saw 502s. The routes
  // below validate by throwing inside `mutateData`, so those rejections have to
  // reach the error mapper at the end of this router.
  const forwardRejections = (handler: any) => {
    if (typeof handler !== "function" || handler.length >= 4) return handler;
    return function wrapped(req: any, res: any, next: any) {
      try {
        const result = handler(req, res, next);
        if (result && typeof result.then === "function") result.catch(next);
        return result;
      } catch (err) {
        return next(err);
      }
    };
  };
  (["get", "post", "put", "patch", "delete"] as const).forEach((method) => {
    const original = (r as any)[method].bind(r);
    (r as any)[method] = (path: any, ...handlers: any[]) => original(path, ...handlers.map(forwardRejections));
  });

  const fetchDriverProfile = async (driverId: string) => {
    const db = await readData();
    const anyDb = db as any;
    const driver = (Array.isArray(anyDb.drivers) ? anyDb.drivers : []).find((x: any) => safeText(x?.id) === driverId);
    if (!driver) return null;
    const vehicle = (Array.isArray(anyDb.driverVehicles) ? anyDb.driverVehicles : []).find((x: any) => safeText(x?.driverId) === driverId);
    const availability = (Array.isArray(anyDb.driverAvailability) ? anyDb.driverAvailability : []).find((x: any) => safeText(x?.driverId) === driverId);
    return {
      id: driver.id,
      name: driver.name,
      username: safeText(driver.username),
      phone: normalizePhone(driver.phone),
      email: safeText(driver.email),
      rating: Number(driver.rating || 4.5),
      vehicleType: safeText((vehicle as any)?.viechle_cat || vehicle?.vehicleType),
      carName: safeText(vehicle?.model || (vehicle as any)?.carName || ""),
      vehicleNumber: safeText(vehicle?.vehicleNumber),
      online: !!availability?.online
    };
  };
  const assertDriverExists = async (driverId: string) => {
    const profile = await fetchDriverProfile(driverId);
    if (!profile) throw new Error("DRIVER_NOT_FOUND");
    return profile;
  };

  r.post("/upload-document", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file?.buffer) return res.status(400).json({ error: "FILE_REQUIRED" });
      const detected = detectImageType(file.buffer);
      if (!detected) return res.status(400).json({ error: "INVALID_FILE_TYPE", message: "Allowed: JPG, PNG, PDF." });
      const uploaded = await uploadDriverDocumentToSupabase(file.buffer, detected.contentType, detected.ext);
      return res.json({ ok: true, url: uploaded.publicUrl, path: uploaded.objectPath });
    } catch (err: any) {
      return res.status(500).json({ error: "UPLOAD_FAILED", message: String(err?.message || err) });
    }
  });

  r.post("/register", async (req, res) => {
    const parsed = DriverRegistrationSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const body = parsed.data;
    const now = new Date().toISOString();
    const phone = normalizePhone(body.phone);
    const email = safeText(body.email).toLowerCase();
    let requestId = "";
    let driverId = "";

    await mutateData((db) => {
      const anyDb = db as any;
      if (!Array.isArray(anyDb.driverRegistrationRequests)) anyDb.driverRegistrationRequests = [];
      if (!Array.isArray(anyDb.drivers)) anyDb.drivers = [];
      if (!Array.isArray(anyDb.driverVehicles)) anyDb.driverVehicles = [];
      if (!Array.isArray(anyDb.driverDocuments)) anyDb.driverDocuments = [];

      const duplicateReq = anyDb.driverRegistrationRequests.find((x: any) =>
        normalizePhone(x?.phone) === phone && ["pending", "approved"].includes(safeText(x?.status).toLowerCase())
      );
      if (duplicateReq) throw new Error("REGISTRATION_ALREADY_EXISTS");

      requestId = makeId("driver_req");
      driverId = makeId("drv");
      anyDb.driverRegistrationRequests.unshift({
        id: requestId,
        name: body.name,
        phone,
        email,
        vehicleType: body.vehicleType,
        carName: body.carName || "",
        vehicleNumber: body.vehicleNumber,
        licenseNumber: body.licenseNumber,
        idProofUrl: body.idProofUrl || "",
        notes: body.notes || "",
        status: "pending",
        reviewedBy: "",
        reviewedAt: "",
        rejectionReason: "",
        createdAt: now
      });
      anyDb.drivers.unshift({
        id: driverId,
        registrationRequestId: requestId,
        name: body.name,
        username: "",
        phone,
        email,
        passwordHash: "",
        status: "pending",
        rating: 4.5,
        active: true,
        createdAt: now,
        updatedAt: now
      });
      anyDb.driverVehicles.unshift({
        id: makeId("veh"),
        driverId,
        vehicleType: body.vehicleType,
        viechle_cat: body.vehicleType,
        vehicleNumber: body.vehicleNumber,
        color: "",
        model: body.carName || "",
        seats: body.vehicleType.toLowerCase().includes("suv") ? 6 : 4,
        createdAt: now
      });

      const docs: any[] = [];
      if (body.idProofUrl) docs.push({ kind: "id_proof", url: body.idProofUrl, label: "ID Proof" });
      docs.push({ kind: "license", url: body.licenseNumber, label: "License Number" });
      (body.documents || []).forEach((doc) => docs.push(doc));
      docs.forEach((doc) => {
        anyDb.driverDocuments.unshift({
          id: makeId("doc"),
          driverId,
          registrationRequestId: requestId,
          kind: safeText(doc.kind || "other") || "other",
          url: safeText(doc.url),
          label: safeText(doc.label),
          createdAt: now
        });
      });

      db.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: "DRIVER_REGISTRATION_REQUEST_CREATED",
        entity: "driver_registration_request",
        entityId: requestId,
        meta: { phone, name: body.name, vehicleType: body.vehicleType }
      });
    }, "driver_registration");

    publishRealtime("admin:driver_requests", {
      type: "driver_registration_created",
      at: now,
      payload: { requestId, driverId, phone }
    });

    return res.json({ ok: true, requestId, driverId, status: "pending" });
  });

  r.post("/registrations/:id/review", requireAuth, async (req, res) => {
    const registrationId = safeText(req.params.id);
    const body = z.object({
      action: z.enum(["approve", "reject"]),
      reason: z.string().default(""),
      username: z.string().min(3).optional(),
      password: z.string().min(4).optional()
    }).safeParse(req.body ?? {});
    if (!registrationId || !body.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req);
    const now = new Date().toISOString();
    let out: any = null;

    await mutateData((db) => {
      const anyDb = db as any;
      const reqRows = Array.isArray(anyDb.driverRegistrationRequests) ? anyDb.driverRegistrationRequests : [];
      const driverRows = Array.isArray(anyDb.drivers) ? anyDb.drivers : [];
      const reqRow = reqRows.find((x: any) => safeText(x?.id) === registrationId);
      if (!reqRow) throw new Error("REQUEST_NOT_FOUND");
      const driverRow = driverRows.find((x: any) => safeText(x?.registrationRequestId) === registrationId || normalizePhone(x?.phone) === normalizePhone(reqRow.phone));
      if (!driverRow) throw new Error("DRIVER_NOT_FOUND");

      if (body.data.action === "approve") {
        const username = normalizeUsername(body.data.username);
        if (!username) throw new Error("USERNAME_REQUIRED");
        if (!safeText(body.data.password)) throw new Error("PASSWORD_REQUIRED");
        const duplicateUsername = driverRows.find((x: any) =>
          safeText(x?.id) !== safeText(driverRow?.id) && normalizeUsername(x?.username) === username
        );
        if (duplicateUsername) throw new Error("USERNAME_ALREADY_IN_USE");
        reqRow.status = "approved";
        reqRow.reviewedBy = safeText(claims?.email || claims?.phone || claims?.sub || "admin");
        reqRow.reviewedAt = now;
        reqRow.rejectionReason = "";
        driverRow.status = "approved";
        driverRow.active = true;
        driverRow.username = username;
        driverRow.passwordHash = hashPassword(safeText(body.data.password));
        driverRow.updatedAt = now;
      } else {
        reqRow.status = "rejected";
        reqRow.reviewedBy = safeText(claims?.email || claims?.phone || claims?.sub || "admin");
        reqRow.reviewedAt = now;
        reqRow.rejectionReason = safeText(body.data.reason);
        driverRow.status = "rejected";
        driverRow.active = false;
        driverRow.updatedAt = now;
      }

      db.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: body.data.action === "approve" ? "DRIVER_APPROVED" : "DRIVER_REJECTED",
        entity: "driver_registration_request",
        entityId: registrationId,
        meta: {
          driverId: driverRow.id,
          username: safeText(driverRow.username),
          reviewedBy: reqRow.reviewedBy,
          reason: reqRow.rejectionReason
        }
      });
      out = { requestId: reqRow.id, driverId: driverRow.id, status: reqRow.status };
    }, "driver_review");

    publishRealtime("admin:driver_requests", {
      type: "driver_registration_reviewed",
      at: now,
      payload: out
    });

    return res.json({ ok: true, ...out });
  });

  r.post("/admin/create", requireAuth, async (req, res) => {
    const parsed = z.object({
      name: z.string().min(2),
      username: z.string().min(3),
      password: z.string().min(4),
      phone: z.string().min(8),
      email: z.string().email().or(z.string().length(0)).default(""),
      vehicleType: z.string().min(1).default("ordinary"),
      carName: z.string().default(""),
      vehicleNumber: z.string().min(1),
      licenseNumber: z.string().min(1),
      notes: z.string().default("")
    }).safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const body = parsed.data;
    const now = new Date().toISOString();
    const username = normalizeUsername(body.username);
    const phone = normalizePhone(body.phone);
    const email = safeText(body.email).toLowerCase();
    if (!username) return res.status(400).json({ error: "USERNAME_REQUIRED" });
    let out: any = null;

    await mutateData((db) => {
      const anyDb = db as any;
      if (!Array.isArray(anyDb.driverRegistrationRequests)) anyDb.driverRegistrationRequests = [];
      if (!Array.isArray(anyDb.drivers)) anyDb.drivers = [];
      if (!Array.isArray(anyDb.driverVehicles)) anyDb.driverVehicles = [];
      if (!Array.isArray(anyDb.driverDocuments)) anyDb.driverDocuments = [];

      const drivers = anyDb.drivers as any[];
      const duplicateUsername = drivers.find((x: any) => normalizeUsername(x?.username) === username);
      if (duplicateUsername) throw new Error("USERNAME_ALREADY_IN_USE");
      const duplicatePhone = drivers.find((x: any) => normalizePhone(x?.phone) === phone);
      if (duplicatePhone) throw new Error("PHONE_ALREADY_IN_USE");

      const requestId = makeId("driver_req");
      const driverId = makeId("drv");
      const reviewer = safeText((getAuthClaims(req) as any)?.email || (getAuthClaims(req) as any)?.phone || (getAuthClaims(req) as any)?.sub || "admin");

      anyDb.driverRegistrationRequests.unshift({
        id: requestId,
        name: body.name,
        phone,
        email,
        vehicleType: body.vehicleType,
        carName: body.carName || "",
        vehicleNumber: body.vehicleNumber,
        licenseNumber: body.licenseNumber,
        idProofUrl: "",
        notes: body.notes || "",
        status: "approved",
        reviewedBy: reviewer,
        reviewedAt: now,
        rejectionReason: "",
        createdAt: now,
        updatedAt: now
      });

      anyDb.drivers.unshift({
        id: driverId,
        registrationRequestId: requestId,
        name: body.name,
        username,
        phone,
        email,
        passwordHash: hashPassword(body.password),
        status: "approved",
        rating: 4.5,
        active: true,
        createdAt: now,
        updatedAt: now
      });

      anyDb.driverVehicles.unshift({
        id: makeId("veh"),
        driverId,
        vehicleType: body.vehicleType,
        viechle_cat: body.vehicleType,
        vehicleNumber: body.vehicleNumber,
        color: "",
        model: body.carName || "",
        seats: safeText(body.vehicleType).toLowerCase().includes("suv") ? 6 : 4,
        createdAt: now,
        updatedAt: now
      });

      anyDb.driverDocuments.unshift({
        id: makeId("doc"),
        driverId,
        registrationRequestId: requestId,
        kind: "license",
        url: safeText(body.licenseNumber),
        label: "License Number",
        createdAt: now
      });

      db.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: "DRIVER_CREATED_BY_ADMIN",
        entity: "driver",
        entityId: driverId,
        meta: { requestId, username, phone, reviewedBy: reviewer }
      });

      out = { driverId, requestId, username, status: "approved" };
    }, "driver_admin_create");

    publishRealtime("admin:driver_requests", {
      type: "driver_created_by_admin",
      at: now,
      payload: out
    });

    return res.json({ ok: true, ...out });
  });

  r.post("/login", async (req, res) => {
    const parsed = DriverLoginSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const username = normalizeUsername(parsed.data.username);
    const password = safeText(parsed.data.password);
    if (!username) return res.status(400).json({ error: "USERNAME_REQUIRED" });
    const db = await readData();
    const anyDb = db as any;
    const drivers = Array.isArray(anyDb.drivers) ? anyDb.drivers : [];
    const driver = drivers.find((x: any) => normalizeUsername(x?.username) === username);
    if (!driver) return res.status(404).json({ error: "DRIVER_NOT_FOUND" });
    if (safeText(driver.status).toLowerCase() !== "approved" || driver.active === false) {
      return res.status(403).json({ error: "DRIVER_NOT_APPROVED" });
    }
    if (!verifyPassword(password, safeText(driver.passwordHash))) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    const token = signDriverToken({
      driverId: safeText(driver.id),
      phone: normalizePhone(driver.phone),
      name: safeText(driver.name),
      username: safeText(driver.username)
    });
    return res.json({
      ok: true,
      token,
      driver: {
        id: safeText(driver.id),
        name: safeText(driver.name),
        username: safeText(driver.username),
        phone: normalizePhone(driver.phone),
        email: safeText(driver.email),
        rating: Number(driver.rating || 4.5)
      }
    });
  });

  r.get("/me", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    const profile = await fetchDriverProfile(driverId);
    if (!profile) return res.status(404).json({ error: "DRIVER_NOT_FOUND" });
    const googleMapsJsApiKey = readGoogleMapsJsApiKey();
    return res.json({
      ok: true,
      driver: profile,
      googleMapsJsApiKey
    });
  });

  r.get("/me/profile", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    const profile = await fetchDriverProfile(driverId);
    if (!profile) return res.status(404).json({ error: "DRIVER_NOT_FOUND" });
    const googleMapsJsApiKey = readGoogleMapsJsApiKey();
    return res.json({ ok: true, driver: profile, googleMapsJsApiKey });
  });

  r.get("/maps-config", requireDriverAuth, async (_req, res) => {
    const googleMapsJsApiKey = readGoogleMapsJsApiKey();
    return res.json({ ok: true, googleMapsJsApiKey });
  });

  r.post("/me/vehicle", requireDriverAuth, async (req, res) => {
    const parsed = DriverVehicleUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    const now = new Date().toISOString();
    const carName = safeText(parsed.data.carName);
    const vehicleTypeInput = safeText(parsed.data.vehicleType).toLowerCase();
    if (!carName && !vehicleTypeInput) return res.status(400).json({ error: "VEHICLE_FIELDS_REQUIRED" });
    const vehicleType = vehicleTypeInput === "luxury"
      ? "Luxury"
      : vehicleTypeInput === "suv"
        ? "SUV"
        : vehicleTypeInput === "traveller"
          ? "Traveller"
          : "Ordinary";
    const seats = vehicleTypeInput === "traveller" ? 12 : vehicleTypeInput === "suv" ? 6 : 4;

    await mutateData((db) => {
      const anyDb = db as any;
      if (!Array.isArray(anyDb.driverVehicles)) anyDb.driverVehicles = [];
      const vehicles = anyDb.driverVehicles as any[];
      const existing = vehicles.find((x: any) => safeText(x?.driverId) === driverId);
      if (existing) {
        if (carName) {
          existing.model = carName;
          (existing as any).carName = carName;
        }
        if (vehicleTypeInput) {
          existing.vehicleType = vehicleType;
          existing.viechle_cat = vehicleType;
          existing.seats = seats;
        }
        existing.updatedAt = now;
      } else {
        vehicles.unshift({
          id: makeId("veh"),
          driverId,
          vehicleType: vehicleTypeInput ? vehicleType : "",
          viechle_cat: vehicleTypeInput ? vehicleType : "",
          vehicleNumber: "",
          model: carName,
          carName,
          seats: vehicleTypeInput ? seats : 4,
          createdAt: now,
          updatedAt: now
        });
      }
    }, "driver_vehicle_update");

    return res.json({ ok: true, carName, vehicleType: vehicleTypeInput ? vehicleType : "", seats: vehicleTypeInput ? seats : 4 });
  });

  r.post("/me/profile", requireDriverAuth, async (req, res) => {
    const parsed = DriverProfileUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    const nextNameInput = safeText(parsed.data.name);
    const nextPhoneInput = safeText(parsed.data.phone);
    if (nextPhoneInput) return res.status(400).json({ error: "PHONE_CHANGE_REQUEST_REQUIRED" });
    if (!nextNameInput && !nextPhoneInput) return res.status(400).json({ error: "PROFILE_FIELDS_REQUIRED" });
    const now = new Date().toISOString();
    let updated: any = null;

    await mutateData((db) => {
      const anyDb = db as any;
      if (!Array.isArray(anyDb.drivers)) anyDb.drivers = [];
      const drivers = anyDb.drivers as any[];
      const driver = drivers.find((x: any) => safeText(x?.id) === driverId);
      if (!driver) throw new Error("DRIVER_NOT_FOUND");

      const nextPhone = nextPhoneInput ? normalizePhone(nextPhoneInput) : normalizePhone(driver.phone);
      const nextName = nextNameInput || safeText(driver.name);
      if (!nextName) throw new Error("NAME_REQUIRED");
      if (!nextPhone) throw new Error("PHONE_REQUIRED");

      const duplicate = drivers.find((x: any) =>
        safeText(x?.id) !== driverId && normalizePhone(x?.phone) === nextPhone
      );
      if (duplicate) throw new Error("PHONE_ALREADY_IN_USE");

      driver.name = nextName;
      driver.phone = nextPhone;
      driver.updatedAt = now;

      if (Array.isArray(anyDb.driverRegistrationRequests)) {
        const reqRow = anyDb.driverRegistrationRequests.find((x: any) =>
          safeText(x?.id) === safeText(driver?.registrationRequestId || "")
        );
        if (reqRow) {
          reqRow.name = nextName;
          reqRow.phone = nextPhone;
          reqRow.updatedAt = now;
        }
      }

      updated = {
        id: safeText(driver.id),
        name: nextName,
        username: safeText(driver.username),
        phone: nextPhone,
        email: safeText(driver.email),
        rating: Number(driver.rating || 4.5)
      };
    }, "driver_profile_update");

    const refreshedToken = signDriverToken({
      driverId: safeText(updated.id),
      phone: normalizePhone(updated.phone),
      name: safeText(updated.name),
      username: safeText(updated.username)
    });

    return res.json({ ok: true, driver: updated, token: refreshedToken });
  });

  r.post("/me/request-phone-change", requireDriverAuth, async (req, res) => {
    const parsed = DriverPhoneChangeRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    const requestedPhone = normalizePhone(parsed.data.phone);
    if (!requestedPhone) return res.status(400).json({ error: "PHONE_REQUIRED" });
    const now = new Date().toISOString();
    let out: any = null;

    await mutateData((db) => {
      const anyDb = db as any;
      if (!Array.isArray(anyDb.driverRegistrationRequests)) anyDb.driverRegistrationRequests = [];
      if (!Array.isArray(anyDb.drivers)) anyDb.drivers = [];
      if (!Array.isArray(anyDb.driverVehicles)) anyDb.driverVehicles = [];
      const drivers = anyDb.drivers as any[];
      const requests = anyDb.driverRegistrationRequests as any[];
      const vehicles = anyDb.driverVehicles as any[];
      const driver = drivers.find((x: any) => safeText(x?.id) === driverId);
      if (!driver) throw new Error("DRIVER_NOT_FOUND");

      const currentPhone = normalizePhone(driver.phone);
      if (requestedPhone === currentPhone) throw new Error("PHONE_UNCHANGED");
      const duplicateDriver = drivers.find((x: any) =>
        safeText(x?.id) !== driverId && normalizePhone(x?.phone) === requestedPhone
      );
      if (duplicateDriver) throw new Error("PHONE_ALREADY_IN_USE");

      const duplicatePending = requests.find((x: any) =>
        safeText(x?.vehicleType).toLowerCase() === "phone_change_request" &&
        safeText(x?.status).toLowerCase() === "pending" &&
        safeText(x?.notes).includes(`driverId:${driverId}`)
      );
      if (duplicatePending) throw new Error("PHONE_CHANGE_REQUEST_ALREADY_PENDING");

      const vehicle = vehicles.find((x: any) => safeText(x?.driverId) === driverId) || {};
      const requestId = makeId("driver_req");
      const driverName = safeText(driver?.name || "Driver");
      const username = safeText(driver?.username || "");
      requests.unshift({
        id: requestId,
        name: driverName,
        phone: requestedPhone,
        email: safeText(driver?.email || ""),
        vehicleType: "phone_change_request",
        vehicleNumber: safeText(vehicle?.vehicleNumber || currentPhone || "phone-change"),
        licenseNumber: "phone_change_request",
        idProofUrl: "",
        notes: `driverId:${driverId}\nusername:${username}\ncurrentPhone:${currentPhone}\nrequestedPhone:${requestedPhone}\nrequestType:phone_change`,
        status: "pending",
        reviewedBy: "",
        reviewedAt: "",
        rejectionReason: "",
        createdAt: now
      });

      db.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: "DRIVER_PHONE_CHANGE_REQUEST_CREATED",
        entity: "driver_registration_request",
        entityId: requestId,
        meta: { driverId, currentPhone, requestedPhone, username }
      });

      out = { requestId, driverId, driverName, username, currentPhone, requestedPhone, status: "pending" };
    }, "driver_phone_change_request");

    publishRealtime("admin:driver_requests", {
      type: "driver_phone_change_requested",
      at: now,
      payload: out
    });

    await notifyDriverPhoneChangeRequestToAdmins(out).catch(() => {});

    return res.json({ ok: true, ...out });
  });

  r.post("/availability", requireDriverAuth, async (req, res) => {
    const parsed = DriverAvailabilitySchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    const now = new Date().toISOString();

    await mutateData((db) => {
      const anyDb = db as any;
      if (!Array.isArray(anyDb.driverAvailability)) anyDb.driverAvailability = [];
      const rows = anyDb.driverAvailability as any[];
      const row = rows.find((x: any) => safeText(x?.driverId) === driverId);
      const next = {
        id: row?.id || makeId("drv_av"),
        driverId,
        online: parsed.data.online,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        updatedAt: now
      };
      if (row) Object.assign(row, next);
      else rows.unshift(next);
    }, "driver_availability");

    publishRealtime("drivers:rides", {
      type: "driver_availability_updated",
      at: now,
      payload: { driverId, online: parsed.data.online }
    });

    return res.json({ ok: true });
  });

  r.get("/rides", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    try {
      await assertDriverExists(driverId);
    } catch (err: any) {
      const message = safeText(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "DRIVER_NOT_FOUND" });
    }
    const db = await readData();
    const anyDb = db as any;
    const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
    const assignments = Array.isArray(anyDb.rideAssignments) ? anyDb.rideAssignments : [];
    const bids = Array.isArray(anyDb.driverBids) ? anyDb.driverBids : [];
    const activeAssignmentStates = new Set(["assigned", "accepted", "started"]);
    const closedAssignmentStates = new Set(["completed", "cancelled"]);
    const list = rides
      .filter((x: any) => {
        const rideId = safeText(x?.id);
        const ownBid = bids
          .filter((b: any) => safeText(b?.rideRequestId) === rideId && safeText(b?.driverId) === driverId)
          .sort((a: any, b: any) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime())[0];
        const ownBidStatus = safeText(ownBid?.status).toLowerCase();
        const myAssignment = assignments.find((a: any) =>
          safeText(a?.rideRequestId) === rideId &&
          safeText(a?.driverId) === driverId &&
          activeAssignmentStates.has(safeText(a?.status).toLowerCase())
        );
        const assignedDriverMatch = safeText((x as any)?.assignedDriverId || (x as any)?.assigned_driver_id || "") === driverId;
        const implicitConfirmedForMe =
          (assignedDriverMatch || ownBidStatus === "accepted") &&
          !["cancelled", "completed", "rejected", "declined"].includes(safeText(x?.status).toLowerCase());
        if (myAssignment) return true;
        if (implicitConfirmedForMe) return true;
        const rideStatus = safeText(x?.status).toLowerCase();
        if (!["pending", "searching", "open"].includes(rideStatus)) return false;
        const takenByOther = assignments.some((a: any) =>
          safeText(a?.rideRequestId) === rideId &&
          safeText(a?.driverId) !== driverId &&
          (activeAssignmentStates.has(safeText(a?.status).toLowerCase()) || safeText(a?.status).toLowerCase() === "completed")
        );
        if (takenByOther) return false;
        if (["rejected", "declined", "cancelled", "completed"].includes(ownBidStatus)) return false;
        return true;
      })
      .sort((a: any, b: any) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
      .map((ride: any) => {
        const rideId = safeText(ride.id);
        const ownBid = bids
          .filter((b: any) => safeText(b?.rideRequestId) === rideId && safeText(b?.driverId) === driverId)
          .sort((a: any, b: any) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime())[0];
        const rideStatus = safeText((ride as any)?.status || "").toLowerCase();
        const myAssignment = assignments.find((a: any) =>
          safeText(a?.rideRequestId) === rideId &&
          safeText(a?.driverId) === driverId &&
          (activeAssignmentStates.has(safeText(a?.status).toLowerCase()) || closedAssignmentStates.has(safeText(a?.status).toLowerCase()))
        );
        const syntheticAssignment = !myAssignment &&
          (safeText((ride as any)?.assignedDriverId || (ride as any)?.assigned_driver_id || "") === driverId ||
            safeText(ownBid?.status).toLowerCase() === "accepted")
          ? {
              id: "",
              rideRequestId: rideId,
              driverId,
              bidId: safeText((ride as any)?.selectedBidId || (ride as any)?.selected_bid_id || ownBid?.id || ""),
              status:
                rideStatus === "started"
                  ? "started"
                  : rideStatus === "completed"
                    ? "completed"
                    : rideStatus === "cancelled"
                      ? "cancelled"
                      : "assigned",
            }
          : null;
        const effectiveAssignment = myAssignment || syntheticAssignment;
        return {
          id: rideId,
          customerName: safeText(ride.userName),
          customerPhone: normalizePhone(ride.phone),
          pickupLocation: safeText(ride.pickupLocation),
          pickupUpdatedAt: safeText((ride as any)?.pickupUpdatedAt || ""),
          dropLocation: safeText(ride.dropLocation),
          distance: Number(ride?.distanceKm || ride?.pricing?.distanceKm || 0),
          estimatedPrice: Number(ride?.pricing?.totalAmount || ride?.estimatedFare || 0),
          vehicleType: safeText(ride.vehicleType),
          passengers: Number(ride.passengers || 1),
          datetime: safeText(ride.datetime),
          createdAt: safeText(ride.createdAt),
          status: safeText((ride as any)?.status || ""),
          rideStatus: safeText((ride as any)?.status || ""),
          paymentStatus: deriveRidePaymentStatus(ride, effectiveAssignment, ownBid),
          assignmentStatus: safeText(effectiveAssignment?.status || ""),
          assignmentId: safeText(effectiveAssignment?.id || ""),
          bidId: safeText(ownBid?.id || ""),
          bidPrice: Number(ownBid?.bidPrice || 0),
          etaMin: Number(ownBid?.etaMin || 0),
          bidStatus: safeText(ownBid?.status || ""),
          otpRequired: deriveRideOtpRequired(ride, effectiveAssignment),
          otpStatus: normalizeRideOtpStatus(ride),
          otpVerifiedAt: safeText((ride as any)?.rideOtpVerifiedAt || "")
        };
      });
    return res.json({ ok: true, rides: list });
  });

  r.get("/assigned-rides", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    try {
      await assertDriverExists(driverId);
    } catch (err: any) {
      const message = safeText(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "DRIVER_NOT_FOUND" });
    }
    const db = await readData();
    const anyDb = db as any;
    const assignments = Array.isArray(anyDb.rideAssignments) ? anyDb.rideAssignments : [];
    const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
    const bids = Array.isArray(anyDb.driverBids) ? anyDb.driverBids : [];
    const actual = assignments
      .filter((a: any) => safeText(a?.driverId) === driverId && ["assigned", "accepted", "started", "cancelled", "completed"].includes(safeText(a?.status).toLowerCase()))
      .sort((a: any, b: any) => new Date(b?.updatedAt || b?.assignedAt || 0).getTime() - new Date(a?.updatedAt || a?.assignedAt || 0).getTime())
      .map((a: any) => {
        const ride = rides.find((r: any) => safeText(r?.id) === safeText(a?.rideRequestId)) || {};
        const assignmentStatus = safeText(a?.status);
        const assignmentStatusLower = assignmentStatus.toLowerCase();
        const rideStatus = safeText((ride as any)?.status || "");
        const rideStatusLower = rideStatus.toLowerCase();
        const active = ["assigned", "accepted", "started"].includes(assignmentStatusLower)
          && !["cancelled", "completed", "rejected", "declined"].includes(rideStatusLower)
          && !safeText((ride as any)?.cancelledAt || "")
          && !safeText((ride as any)?.completedAt || "");
        return {
          assignmentId: safeText(a?.id),
          rideRequestId: safeText(a?.rideRequestId),
          status: assignmentStatus,
          rideStatus,
          paymentStatus: deriveRidePaymentStatus(ride, a),
          active,
          customerName: safeText(ride?.userName),
          pickupLocation: safeText(ride?.pickupLocation),
          pickupUpdatedAt: safeText((ride as any)?.pickupUpdatedAt || ""),
          dropLocation: safeText(ride?.dropLocation),
          customerPhone: normalizePhone(ride?.phone),
          datetime: safeText(ride?.datetime),
          cancelledAt: safeText((ride as any)?.cancelledAt || ""),
          completedAt: safeText((ride as any)?.completedAt || ""),
          fineAmount: Number(ride?.fineAmount || 0),
          fineStatus: safeText(ride?.fineStatus || "none"),
          otpRequired: deriveRideOtpRequired(ride, a),
          otpStatus: normalizeRideOtpStatus(ride),
          otpVerifiedAt: safeText((ride as any)?.rideOtpVerifiedAt || "")
        };
      });
    const knownAssignmentRideIds = new Set(actual.map((item: any) => safeText(item?.rideRequestId)).filter(Boolean));
    const synthetic = rides
      .filter((ride: any) => {
        const rideId = safeText(ride?.id);
        if (!rideId || knownAssignmentRideIds.has(rideId)) return false;
        const assignedDriverId = safeText((ride as any)?.assignedDriverId || (ride as any)?.assigned_driver_id || "");
        if (assignedDriverId === driverId) return true;
        const ownBid = bids
          .filter((b: any) => safeText(b?.rideRequestId) === rideId && safeText(b?.driverId) === driverId)
          .sort((a: any, b: any) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime())[0];
        return safeText(ownBid?.status).toLowerCase() === "accepted";
      })
      .map((ride: any) => {
        const rideId = safeText(ride?.id);
        const ownBid = bids
          .filter((b: any) => safeText(b?.rideRequestId) === rideId && safeText(b?.driverId) === driverId)
          .sort((a: any, b: any) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime())[0];
        const rideStatus = safeText((ride as any)?.status || "");
        const rideStatusLower = rideStatus.toLowerCase();
        const status =
          rideStatusLower === "started"
            ? "started"
            : rideStatusLower === "completed"
              ? "completed"
              : rideStatusLower === "cancelled"
                ? "cancelled"
                : "assigned";
        const active = ["assigned", "accepted", "started"].includes(status)
          && !["cancelled", "completed", "rejected", "declined"].includes(rideStatusLower)
          && !safeText((ride as any)?.cancelledAt || "")
          && !safeText((ride as any)?.completedAt || "");
        return {
          assignmentId: "",
          rideRequestId: rideId,
          status,
          rideStatus,
          paymentStatus: deriveRidePaymentStatus(ride, { status, bidId: safeText(ownBid?.id || "") }, ownBid),
          active,
          customerName: safeText(ride?.userName),
          pickupLocation: safeText(ride?.pickupLocation),
          pickupUpdatedAt: safeText((ride as any)?.pickupUpdatedAt || ""),
          dropLocation: safeText(ride?.dropLocation),
          customerPhone: normalizePhone(ride?.phone),
          datetime: safeText(ride?.datetime),
          cancelledAt: safeText((ride as any)?.cancelledAt || ""),
          completedAt: safeText((ride as any)?.completedAt || ""),
          fineAmount: Number(ride?.fineAmount || 0),
          fineStatus: safeText(ride?.fineStatus || "none"),
          otpRequired: deriveRideOtpRequired(ride, { status }),
          otpStatus: normalizeRideOtpStatus(ride),
          otpVerifiedAt: safeText((ride as any)?.rideOtpVerifiedAt || "")
        };
      });
    return res.json({ ok: true, rides: [...actual, ...synthetic].sort((a: any, b: any) => new Date(b?.datetime || b?.assignedAt || b?.updatedAt || 0).getTime() - new Date(a?.datetime || a?.assignedAt || a?.updatedAt || 0).getTime()) });
  });

  r.post("/assigned-rides/:rideRequestId/verify-otp", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    const rideRequestId = safeText(req.params.rideRequestId);
    const parsed = z.object({
      otp: z.string().regex(/^\d{4,6}$/)
    }).safeParse(req.body ?? {});
    if (!rideRequestId || !parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const now = new Date().toISOString();
    let out: any = null;

    try {
      await mutateData((db) => {
        const anyDb = db as any;
        const assignments = Array.isArray(anyDb.rideAssignments) ? anyDb.rideAssignments : [];
        const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
        const assignment = assignments.find((a: any) =>
          safeText(a?.rideRequestId) === rideRequestId && safeText(a?.driverId) === driverId
        );
        if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
        const assignmentStatus = safeText(assignment?.status).toLowerCase();
        if (["completed", "cancelled"].includes(assignmentStatus)) throw new Error("TRIP_ALREADY_CLOSED");

        const ride = rides.find((r: any) => safeText(r?.id) === rideRequestId);
        if (!ride) throw new Error("RIDE_NOT_FOUND");
        const expectedOtp = safeText((ride as any)?.rideOtp || "");
        if (!expectedOtp) throw new Error("RIDE_OTP_NOT_READY");
        if (expectedOtp !== safeText(parsed.data.otp)) throw new Error("INVALID_RIDE_OTP");

        (ride as any).rideOtpStatus = "verified";
        (ride as any).rideOtpVerifiedAt = now;
        (ride as any).rideOtpVerifiedBy = driverId;
        if (!["completed", "cancelled"].includes(assignmentStatus)) {
          assignment.status = "started";
          assignment.updatedAt = now;
          (assignment as any).startedAt = safeText((assignment as any)?.startedAt || now);
        }
        out = {
          rideRequestId,
          assignmentId: safeText(assignment?.id),
          otpStatus: "verified",
          verifiedAt: now,
          assignmentStatus: safeText(assignment?.status || "started")
        };
      }, "driver_verify_ride_otp");
    } catch (err: any) {
      const message = safeText(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "OTP_VERIFY_FAILED" });
    }

    publishRealtime("drivers:rides", {
      type: "ride_otp_verified",
      at: now,
      payload: out
    });
    publishRealtime(`ride:${rideRequestId}:bids`, {
      type: "ride_otp_verified",
      at: now,
      payload: out
    });
    return res.json({ ok: true, ...out });
  });

  r.post("/assigned-rides/:rideRequestId/complete", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    const rideRequestId = safeText(req.params.rideRequestId);
    if (!rideRequestId) return res.status(400).json({ error: "RIDE_ID_REQUIRED" });
    const now = new Date().toISOString();
    let out: any = null;
    let completedRide: any = null;

    try {
      await mutateData((db) => {
        const anyDb = db as any;
        const assignments = Array.isArray(anyDb.rideAssignments) ? anyDb.rideAssignments : [];
        const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
        const assignment = assignments.find((a: any) =>
          safeText(a?.rideRequestId) === rideRequestId && safeText(a?.driverId) === driverId
        );
        if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
        const assignmentStatus = safeText(assignment?.status).toLowerCase();
        if (["completed", "cancelled"].includes(assignmentStatus)) throw new Error("TRIP_ALREADY_CLOSED");
        const ride = rides.find((r: any) => safeText(r?.id) === rideRequestId);
        if (ride && safeText((ride as any)?.rideOtp || "") && normalizeRideOtpStatus(ride) !== "verified") {
          throw new Error("OTP_VERIFICATION_REQUIRED");
        }

        assignment.status = "completed";
        assignment.updatedAt = now;
        (assignment as any).completedAt = now;

        if (ride) {
          ride.status = "completed";
          (ride as any).completedAt = now;
          completedRide = { ...ride };
        }
        out = { rideRequestId, assignmentId: safeText(assignment?.id), status: "completed", completedAt: now };
      }, "driver_trip_complete");
    } catch (err: any) {
      const message = safeText(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "TRIP_COMPLETE_FAILED" });
    }

    if (completedRide) {
      await ensureInvoiceForCompletedTransaction({
        table: "ev_cab_bookings",
        row: completedRide,
        source: "driver_complete_ride"
      }).catch(() => {});
    }

    publishRealtime("drivers:rides", {
      type: "ride_completed",
      at: now,
      payload: out
    });
    publishRealtime(`ride:${rideRequestId}:bids`, {
      type: "ride_completed",
      at: now,
      payload: out
    });
    return res.json({ ok: true, ...out });
  });

  r.post("/bids", requireDriverAuth, async (req, res) => {
    const parsed = DriverBidSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    const now = new Date().toISOString();
    let bidOut: any = null;
    let rideMeta: any = null;

    try {
      await mutateData((db) => {
        const anyDb = db as any;
        if (!Array.isArray(anyDb.driverBids)) anyDb.driverBids = [];
        const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
        const drivers = Array.isArray(anyDb.drivers) ? anyDb.drivers : [];
        const vehicles = Array.isArray(anyDb.driverVehicles) ? anyDb.driverVehicles : [];
        const ride = rides.find((x: any) => safeText(x?.id) === safeText(parsed.data.rideRequestId));
        if (!ride) throw new Error("RIDE_NOT_FOUND");
        const rideStatus = safeText(ride.status).toLowerCase();
        if (!["pending", "searching", "open"].includes(rideStatus)) throw new Error("RIDE_NOT_OPEN");
        const driver = drivers.find((x: any) => safeText(x?.id) === driverId);
        if (!driver) throw new Error("DRIVER_NOT_FOUND");
        if (safeText(driver.status).toLowerCase() !== "approved" || driver.active === false) throw new Error("DRIVER_NOT_APPROVED");
        const existing = (anyDb.driverBids as any[]).find((x: any) =>
          safeText(x?.rideRequestId) === safeText(parsed.data.rideRequestId) && safeText(x?.driverId) === driverId
        );
        const next = {
          id: existing?.id || makeId("bid"),
          rideRequestId: safeText(parsed.data.rideRequestId),
          driverId,
          bidPrice: Number(parsed.data.bidPrice),
          etaMin: Number(parsed.data.etaMin),
          status: "active",
          createdAt: existing?.createdAt || now,
          updatedAt: now
        };
        if (existing) Object.assign(existing, next);
        else (anyDb.driverBids as any[]).unshift(next);

        const vehicle = vehicles.find((x: any) => safeText(x?.driverId) === driverId);
        bidOut = {
          id: next.id,
          rideRequestId: next.rideRequestId,
          driverId,
          driverName: safeText(driver?.name),
          driverPhone: normalizePhone(driver?.phone),
          driverRating: Number(driver?.rating || 4.5),
          carType: safeText(vehicle?.vehicleType || ride?.vehicleType),
          carName: safeText(vehicle?.model || (vehicle as any)?.carName || ""),
          bidPrice: next.bidPrice,
          etaMin: next.etaMin,
          status: next.status,
          createdAt: next.createdAt,
          updatedAt: next.updatedAt
        };
        rideMeta = {
          pickupLocation: safeText(ride.pickupLocation),
          dropLocation: safeText(ride.dropLocation)
        };
      }, "driver_bid");
    } catch (err: any) {
      const message = safeText(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "BID_FAILED" });
    }

    publishRealtime(`ride:${safeText(parsed.data.rideRequestId)}:bids`, {
      type: "bid_updated",
      at: now,
      payload: bidOut
    });
    publishRealtime("drivers:rides", {
      type: "bid_placed",
      at: now,
      payload: { ...bidOut, ...rideMeta }
    });

    return res.json({ ok: true, bid: bidOut });
  });

  r.get("/bids/history", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req) as any;
    const driverId = safeText(claims?.sub);
    try {
      await assertDriverExists(driverId);
    } catch (err: any) {
      const message = safeText(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "DRIVER_NOT_FOUND" });
    }
    const db = await readData();
    const anyDb = db as any;
    const bids = Array.isArray(anyDb.driverBids) ? anyDb.driverBids : [];
    const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
    const history = bids
      .filter((b: any) => safeText(b?.driverId) === driverId)
      .sort((a: any, b: any) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime())
      .map((bid: any) => {
        const ride = rides.find((r: any) => safeText(r?.id) === safeText(bid?.rideRequestId)) || {};
        return {
          bidId: safeText(bid?.id),
          rideRequestId: safeText(bid?.rideRequestId),
          bidPrice: Number(bid?.bidPrice || 0),
          etaMin: Number(bid?.etaMin || 0),
          bidStatus: safeText(bid?.status || "active"),
          createdAt: safeText(bid?.createdAt),
          updatedAt: safeText(bid?.updatedAt),
          rideStatus: safeText(ride?.status || ""),
          carName: safeText((Array.isArray(anyDb.driverVehicles) ? anyDb.driverVehicles : []).find((v: any) => safeText(v?.driverId) === driverId)?.model || ""),
          pickupLocation: safeText(ride?.pickupLocation),
          dropLocation: safeText(ride?.dropLocation),
          tripTime: safeText(ride?.datetime),
          customerName: safeText(ride?.userName),
          customerPhone: normalizePhone(ride?.phone),
          finalFare: Number((ride as any)?.paymentDueAmount || ride?.estimatedFare || 0),
          paymentStatus: deriveRidePaymentStatus(ride, null, bid)
        };
      });
    return res.json({ ok: true, bids: history });
  });

  r.get("/stream", requireDriverAuth, async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    (res as any).flushHeaders?.();
    res.write(`event: hello\ndata: ${JSON.stringify({ ok: true, at: new Date().toISOString() })}\n\n`);

    const unsub = subscribeRealtime("drivers:rides", (event) => {
      res.write(`event: ${safeText(event?.type || "message")}\ndata: ${JSON.stringify(event?.payload || {})}\n\n`);
    });
    const ping = setInterval(() => {
      res.write(`event: ping\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
    }, 20000);
    req.on("close", () => {
      clearInterval(ping);
      unsub();
      res.end();
    });
  });

  // Turns the sentinel codes the handlers throw into an HTTP status and a
  // sentence the driver app can show. Anything unrecognised stays a 500 with a
  // plain apology rather than leaking an internal code.
  const DRIVER_ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
    RIDE_NOT_FOUND: { status: 404, message: "That ride is no longer listed." },
    RIDE_NOT_OPEN: { status: 409, message: "This ride is no longer accepting offers." },
    RIDE_OTP_NOT_READY: { status: 409, message: "The rider's trip OTP has not been issued yet." },
    INVALID_RIDE_OTP: { status: 400, message: "That OTP does not match. Ask the rider to read it again." },
    OTP_VERIFICATION_REQUIRED: { status: 409, message: "Verify the rider's OTP before starting the trip." },
    TRIP_ALREADY_CLOSED: { status: 409, message: "This trip has already been closed." },
    ASSIGNMENT_NOT_FOUND: { status: 404, message: "You are not assigned to that ride." },
    DRIVER_NOT_FOUND: { status: 404, message: "We could not find that driver account." },
    DRIVER_NOT_APPROVED: { status: 403, message: "This driver account is not approved yet." },
    REQUEST_NOT_FOUND: { status: 404, message: "We could not find that request." },
    REGISTRATION_ALREADY_EXISTS: { status: 409, message: "A registration already exists for this number." },
    PHONE_ALREADY_IN_USE: { status: 409, message: "That phone number is already registered." },
    PHONE_CHANGE_REQUEST_ALREADY_PENDING: { status: 409, message: "A number change is already awaiting review." },
    PHONE_UNCHANGED: { status: 400, message: "That is already the number on this account." },
    PHONE_REQUIRED: { status: 400, message: "Enter a phone number." },
    NAME_REQUIRED: { status: 400, message: "Enter a name." },
    USERNAME_REQUIRED: { status: 400, message: "Choose a username." },
    USERNAME_ALREADY_IN_USE: { status: 409, message: "That username is already taken." },
    PASSWORD_REQUIRED: { status: 400, message: "Choose a password." },
    SUPABASE_NOT_CONFIGURED: { status: 503, message: "Storage is not available right now. Please try again later." },
    SUPABASE_UPLOAD_FAILED: { status: 502, message: "We could not store that upload. Please try again." }
  };
  r.use((err: any, _req: any, res: any, next: any) => {
    if (res.headersSent) return next(err);
    const code = String(err?.message || err || "");
    const match = Object.keys(DRIVER_ERROR_RESPONSES).find((key) => code.includes(key));
    if (match) {
      const mapped = DRIVER_ERROR_RESPONSES[match];
      return res.status(mapped.status).json({ error: match, message: mapped.message });
    }
    return res.status(500).json({
      error: "DRIVER_REQUEST_FAILED",
      message: "Something went wrong on our side. Please try again in a moment."
    });
  });

  return r;
}

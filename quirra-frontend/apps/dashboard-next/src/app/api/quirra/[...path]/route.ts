// apps/dashboard-next/src/app/api/quirra/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.QUIRRA_BACKEND || "http://127.0.0.1:8000").replace(/\/+$/, "");
const SERVER_SECRET = process.env.QUIRRA_SECRET || "";

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx);
}

async function forward(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const url = `${BACKEND}/api/${path.join("/")}${req.nextUrl.search}`;

  const outH = buildHeaders(req.headers);

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: outH,
      body: body ?? undefined,
      redirect: "manual",
    });

    // Stream the response back as-is
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: upstream.headers,
    });
  } catch (err) {
    console.error("[quirra-proxy] upstream fetch failed:", err);
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

function buildHeaders(incoming: Headers): Headers {
  const h = new Headers();

  // Forward safe headers only — drop hop-by-hop headers
  const DROP = new Set(["host", "connection", "transfer-encoding", "keep-alive", "upgrade"]);
  incoming.forEach((value, key) => {
    if (!DROP.has(key.toLowerCase())) h.set(key, value);
  });

  // FIX: translate X-Quirra-Secret (used by extension + dashboard) into
  // X-Ingest-Secret (what Django's _check_ingest_secret() reads).
  // Priority: server-side env secret overrides whatever the client sent.
  const clientSecret = incoming.get("x-quirra-secret") || "";
  const effectiveSecret = SERVER_SECRET || clientSecret;
  if (effectiveSecret) {
    h.set("X-Ingest-Secret", effectiveSecret);
  }
  h.delete("x-quirra-secret"); // don't forward the old name

  return h;
}
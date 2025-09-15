// quirrq-frontend/apps/dashboard-next/src/app/api/quirra/[...path]/route.ts


import { NextRequest } from "next/server";

const BACKEND = process.env.QUIRRA_BACKEND || "http://127.0.0.1:8000";
const SECRET = process.env.QUIRRA_SECRET || "";

export async function GET(req: NextRequest, ctx: any) { return forward(req, ctx); }
export async function POST(req: NextRequest, ctx: any) { return forward(req, ctx); }
export async function PUT(req: NextRequest, ctx: any) { return forward(req, ctx); }
export async function PATCH(req: NextRequest, ctx: any) { return forward(req, ctx); }
export async function DELETE(req: NextRequest, ctx: any) { return forward(req, ctx); }

async function forward(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${BACKEND}/${params.path.join("/")}${req.nextUrl.search}`;
  const init: RequestInit = {
    method: req.method,
    headers: outHeaders(req.headers),
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    redirect: "manual"
  };
  const r = await fetch(url, init);
  return new Response(r.body, { status: r.status, headers: r.headers });
}

function outHeaders(incoming: Headers) {
  const h = new Headers(incoming);
  h.delete("host");
  h.delete("connection");
  if (SECRET) h.set("X-Quirra-Secret", SECRET);
  return h;
}

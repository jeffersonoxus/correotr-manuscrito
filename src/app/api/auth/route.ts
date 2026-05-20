import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (password === adminPassword) {
      const token = Buffer.from(`admin:${Date.now()}`).toString("base64");
      return Response.json({ success: true, token });
    }

    return Response.json({ success: false, error: "Senha incorreta" }, { status: 401 });
  } catch {
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}

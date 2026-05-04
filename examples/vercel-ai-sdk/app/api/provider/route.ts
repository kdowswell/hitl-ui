import { describeProvider } from "@/lib/provider";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ provider: describeProvider() });
}

import { NextRequest } from "next/server";
import { parseInput } from "@/lib/validation";
import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { becomeOwner } from "@/modules/auth/auth.service";
import { becomeOwnerSchema } from "@/modules/auth/auth.schema";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const input = parseInput(becomeOwnerSchema, await request.json());
    await becomeOwner(user.id, input);
    return Response.json({ ok: true, roles: Array.from(new Set([...user.roles, "owner"])) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

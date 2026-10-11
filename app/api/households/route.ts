import { NextResponse } from "next/server";
import { apiError } from "@/app/lib/apiError";
import {
  getHouseholdData,
  createHousehold,
  shareHousehold,
  acceptInvitation,
  declineInvitation,
  switchHousehold,
  changeMemberRole,
  revokeAccess,
  renameHousehold,
} from "@/app/actions/households";
export async function GET() {
  try {
    return NextResponse.json(await getHouseholdData());
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const b = await request.json();
    let result: unknown;
    switch (b.action) {
      case "create":
        result = await createHousehold(b.name);
        break;
      case "share":
        result = await shareHousehold(b.email);
        break;
      case "accept":
        await acceptInvitation(b.id);
        break;
      case "decline":
        await declineInvitation(b.id);
        break;
      case "switch":
        await switchHousehold(b.id);
        break;
      case "role":
        await changeMemberRole();
        break;
      case "revoke":
        await revokeAccess(b.email);
        break;
      case "rename":
        await renameHousehold(b.name);
        break;
      default:
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }
    return NextResponse.json({ result: result ?? null });
  } catch (e) {
    return apiError(e);
  }
}

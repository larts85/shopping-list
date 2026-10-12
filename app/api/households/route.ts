import { NextResponse } from "next/server";
import { apiError } from "@/app/lib/apiError";
import {
  getHouseholdData,
  getHomeLists,
  resolveListSlug,
  createHousehold,
  shareHousehold,
  acceptInvitation,
  declineInvitation,
  switchHousehold,
  changeMemberRole,
  revokeAccess,
  renameHousehold,
  suggestHouseholdName,
  reviewHouseholdName,
} from "@/app/actions/households";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("view") === "home")
      return NextResponse.json(await getHomeLists());
    const slug = url.searchParams.get("slug");
    return NextResponse.json(
      slug !== null ? await resolveListSlug(slug) : await getHouseholdData(),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const b = await request.json();
    let result: unknown;
    switch (b.action) {
      case "create": {
        const created = await createHousehold(b.name);
        return NextResponse.json({ result: created.id, slug: created.slug });
      }
      case "share":
        result = await shareHousehold(b.email);
        break;
      case "accept":
        result = await acceptInvitation(b.id);
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
      case "suggest-name":
        await suggestHouseholdName(b.name);
        break;
      case "review-name":
        await reviewHouseholdName(b.id, b.decision);
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

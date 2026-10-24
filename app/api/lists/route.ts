import { NextResponse } from "next/server";
import { apiError } from "@/app/lib/apiError";
import { DataError } from "@/app/lib/database";
import {
  getListData,
  getHomeLists,
  resolveListSlug,
  createList,
  deleteList,
  shareList,
  acceptInvitation,
  declineInvitation,
  switchList,
  changeMemberRole,
  revokeAccess,
  renameList,
  suggestListName,
  leaveList,
  suggestListDeletion,
  reviewListName,
} from "@/app/actions/lists";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("view") === "home")
      return NextResponse.json(await getHomeLists());
    const slug = url.searchParams.get("slug");
    return NextResponse.json(
      slug !== null ? await resolveListSlug(slug) : await getListData(),
    );
  } catch (e) {
    return apiError(e, request);
  }
}
export async function POST(request: Request) {
  try {
    const b = await request.json();
    let result: unknown;
    switch (b.action) {
      case "create": {
        const created = await createList(b.name, b.activate !== false);
        return NextResponse.json({ result: created.id, slug: created.slug });
      }
      case "delete":
        await deleteList(b.id);
        break;
      case "share": {
        const shared = await shareList(b.email, undefined, b.role);
        if (shared.status === "error") throw new DataError(shared.error);
        result = {
          delivery: shared.delivery,
          email: shared.email,
          slug: shared.slug,
          role: shared.accessRole,
        };
        break;
      }
      case "accept":
        result = await acceptInvitation(b.id);
        break;
      case "decline":
        await declineInvitation(b.id);
        break;
      case "switch":
        await switchList(b.id);
        break;
      case "role":
        await changeMemberRole();
        break;
      case "revoke":
        await revokeAccess(b.email);
        break;
      case "suggest-name":
        await suggestListName(b.name);
        break;
      case "review-name":
        await reviewListName(b.id, b.decision);
        break;
      case "rename":
        await renameList(b.name);
        break;
      case "leave":
        await leaveList(b.id);
        break;
      case "suggest-delete":
        await suggestListDeletion(b.id);
        break;
      default:
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }
    return NextResponse.json({ result: result ?? null });
  } catch (e) {
    return apiError(e, request);
  }
}

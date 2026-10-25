"use server";
import { defaultListName } from "../lib/listName";
import { listShareUrl } from "../lib/listShareUrl";
import { deliverInvitation } from "../lib/invitationDelivery";
import {
  withList,
  withListItemEditor,
  withListEditor,
  identity,
  transaction,
  text,
  DataError,
  requireRow,
  listRole,
  canManageList,
  canEditList,
  appRole,
  type MemberRole,
  type ListAccessRole,
} from "../lib/database";
export async function getPendingInvitations() {
  const { email } = await identity();
  return transaction(
    email,
    async (db) =>
      (
        await db.query(
          "select i.id,h.name,h.owner_email,i.role from list_invitations i join lists h on h.id=i.list_id where i.email=$1 and h.status='active' and not exists (select 1 from list_members m where m.list_id=i.list_id and m.email=i.email) order by h.name,i.id",
          [email],
        )
      ).rows as { id: string; name: string; owner_email: string; role: ListAccessRole }[],
  );
}
export async function getListData(scope?: string) {
  return withList(async (db, h, email) => {
    const role = await listRole(db, h, email);
    const canManage = canManageList(role);
    return {
      email,
      role: await appRole(db, email),
      canEditList: canEditList(role),
      canManageList: canManage,
      listRole: role,
      memberCount: Number(
        (
          await db.query(
            "select count(*) from list_members where list_id=$1",
            [h],
          )
        ).rows[0].count,
      ),
       list: (
        await db.query(
          "select id,slug,name,owner_email from lists where id=$1",
          [h],
        )
      ).rows[0] as {
        id: string;
        slug: string;
        name: string;
        owner_email: string;
      },
      members:
        canManage
          ? ((
              await db.query(
                "select m.email,case when m.email=h.owner_email then 'owner' else m.role end role from list_members m join lists h on h.id=m.list_id where h.id=$1 order by m.email",
                [h],
              )
            ).rows as { email: string; role: MemberRole }[])
          : [],
      lists: (
        await db.query(
          "select h.id,h.slug,h.name,h.owner_email from lists h join list_members m on m.list_id=h.id where m.email=$1 and h.status='active' order by h.created_at,h.id",
          [email],
        )
      ).rows as {
        id: string;
        slug: string;
        name: string;
        owner_email: string;
      }[],
      invitations: (
        await db.query(
          "select i.id,h.name,h.owner_email,i.role from list_invitations i join lists h on h.id=i.list_id where i.email=$1 and h.status='active' and not exists (select 1 from list_members m where m.list_id=i.list_id and m.email=i.email)",
          [email],
        )
        ).rows as {
        id: string;
        name: string;
        owner_email: string;
          role: ListAccessRole;
      }[],
      nameSuggestions: (
        await db.query(
          "select id,email,name,status from list_name_suggestions where list_id=$1 and ($2 or email=$3) order by created_at desc,id desc limit 100",
          [h, canManage, email],
        )
      ).rows as {
        id: string;
        email: string;
        name: string;
        status: "pending" | "approved" | "rejected";
      }[],
      pending:
        canManage
          ? ((
              await db.query(
                "select i.id,i.email,i.role from list_invitations i join lists h on h.id=i.list_id where i.list_id=$1 and h.status='active' and not exists (select 1 from list_members m where m.list_id=i.list_id and m.email=i.email)",
                [h],
              )
            ).rows as { id: string; email: string; role: ListAccessRole }[])
          : [],
    };
  }, scope);
}
export async function getHomeLists() {
  const { email } = await identity();
  return transaction(email, async (db) => {
    const role = await appRole(db, email);
    const lists = await db.query(
      "select h.id,h.slug,h.name,h.owner_email from lists h join list_members m on m.list_id=h.id where m.email=$1 and h.status='active' order by h.created_at,h.id",
      [email],
    );
    const invitations = await db.query(
      "select i.id,h.slug,h.name,h.owner_email from list_invitations i join lists h on h.id=i.list_id where i.email=$1 and h.status='active' and not exists (select 1 from list_members m where m.list_id=i.list_id and m.email=i.email) order by h.created_at,i.id",
      [email],
    );
    const pendingNameSuggestions = await db.query(
      `select s.id,s.list_id,h.name as list_name,h.slug,s.name,s.email
       from list_name_suggestions s join lists h on h.id=s.list_id
       where h.owner_email=$1 and h.status='active' and s.status='pending'
       order by s.created_at desc,s.id desc limit 100`,
      [email],
    );
    const pendingListSuggestions = await db.query(
      `select s.list_id,count(*)::int as count
       from list_suggestions s join lists h on h.id=s.list_id
       where h.status='active' and s.status='pending' and (
         h.owner_email=$1 or s.email=$1
       )
         and exists (
           select 1 from list_members m
           where m.list_id=s.list_id and m.email=$1
         )
       group by s.list_id`,
      [email],
    );
    const pendingCatalogRequests = await db.query(
      "select count(*)::int as count from catalog_requests where status='pending' and ($1 or email=$2)",
      [role === "admin", email],
    );
    return {
      email,
      lists: lists.rows as {
        id: string;
        slug: string;
        name: string;
        owner_email: string;
      }[],
      invitations: invitations.rows as {
        id: string;
        slug: string;
        name: string;
        owner_email: string;
      }[],
      pendingNameSuggestions: pendingNameSuggestions.rows as {
        id: string;
        list_id: string;
        list_name: string;
        slug: string;
        name: string;
        email: string;
      }[],
      pendingListSuggestions: pendingListSuggestions.rows as {
        list_id: string;
        count: number;
      }[],
      pendingCatalogRequests: Number(pendingCatalogRequests.rows[0].count),
    };
  });
}

export async function createList(
  name?: string,
  activate = true,
): Promise<{ id: string; slug: string }> {
  const label = name === undefined ? defaultListName() : text(name);
  const { email } = await identity();
  return transaction(email, async (db) => {
    const {
      rows: [home],
    } = await db.query(
      "insert into lists(owner_email,name) values($1,$2) returning id,slug",
      [email, label],
    );
    await db.query(
      "insert into list_members(list_id,email,role) values($1,$2,'list_editor')",
      [home.id, email],
    );
    if (activate)
      await db.query(
        "insert into user_preferences(email,list_id) values($1,$2) on conflict(email) do update set list_id=excluded.list_id",
        [email, home.id],
      );
    return home as { id: string; slug: string };
  });
}
export async function deleteList(id: string): Promise<void> {
  const  listId = text(id);
  await withList(async (db,  list, email) => {
    const owned = await db.query(
      "select 1 from lists where id=$1 and owner_email=$2 for update",
      [ list, email],
    );
    if (!owned.rowCount)
      throw new DataError("Solo el propietario puede eliminar esta lista", 403);
    await db.query("delete from user_preferences where list_id=$1", [
       list,
    ]);
    requireRow(
      (
        await db.query("delete from lists where id=$1", [ list])
      ).rowCount,
    );
  },  listId);
}
export async function renameList(
  name: string,
  scope?: string,
): Promise<void> {
  await withListItemEditor(async (db, h) => {
    await db.query("update lists set name=$2 where id=$1", [
      h,
      text(name),
    ]);
  }, scope);
}
export async function shareList(
  recipient: string,
  scope: string | undefined,
  accessRole: unknown,
): Promise<
  | { status: "error"; error: string }
  | {
      status: "ok";
      delivery: "not_configured" | "sent" | "failed";
      email: string;
      slug: string;
      accessRole: ListAccessRole;
    }
> {
  const email = text(recipient).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new DataError("Email inválido");
  if (accessRole !== "list_viewer" && accessRole !== "list_editor")
    throw new DataError("Tipo de acceso inválido");
  const selectedRole = accessRole as ListAccessRole;
  const list = await withListEditor(async (db, h) => {
    if (
      (
        await db.query(
          "select 1 from list_members where list_id=$1 and email=$2",
          [h, email],
        )
      ).rowCount
    )
      return { status: "already_member" as const };
    await db.query(
      "insert into list_invitations(list_id,email,role) values($1,$2,$3) on conflict(list_id,email) do update set role=excluded.role",
      [h, email, selectedRole],
    );
    return {
      status: "invite" as const,
      accessRole: selectedRole,
      list: (await db.query("select name,slug from lists where id=$1", [h]))
        .rows[0] as { name: string; slug: string },
    };
  }, scope);
  if (list.status === "already_member")
    return { status: "error", error: "La persona ya pertenece a la lista" };
  const delivery = await deliverInvitation({
    email,
    name: list.list.name,
    url: listShareUrl(list.list.slug),
    accessRole: list.accessRole,
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.INVITATION_FROM,
    gmailUser: process.env.GMAIL_USER_EMAIL,
    gmailPassword: process.env.GMAIL_APP_PASSWORD,
  });
  console.info(`list_invitation delivery=${delivery}`);
  return {
    status: "ok",
    delivery,
    email,
    slug: list.list.slug,
    accessRole: list.accessRole,
  };
}
export async function acceptInvitation(
  id: string,
): Promise<{ id: string; slug: string }> {
  const { email } = await identity();
  return transaction(email, async (db) => {
    const invite = await db.query(
      "select i.list_id,h.slug,i.role from list_invitations i join lists h on h.id=i.list_id where i.id::text=$1 and i.email=$2 and h.status='active'",
      [text(id), email],
    );
    requireRow(invite.rowCount);
    const h = invite.rows[0].list_id;
    await db.query("select pg_advisory_xact_lock(hashtextextended($1,1))", [h]);
    const lockedInvite = await db.query(
      "select i.role from list_invitations i join lists h on h.id=i.list_id where i.id::text=$1 and i.email=$2 and h.status='active' for update of i",
      [id, email],
    );
    requireRow(lockedInvite.rowCount);
    await db.query(
      "insert into list_members(list_id,email,role) values($1,$2,$3) on conflict do nothing",
      [h, email, lockedInvite.rows[0].role],
    );
    await db.query(
      "delete from list_invitations where id::text=$1 and email=$2",
      [id, email],
    );
    return { id: h, slug: invite.rows[0].slug };
  });
}
export async function declineInvitation(id: string): Promise<void> {
  const { email } = await identity();
  await transaction(email, async (db) => {
    requireRow(
      (
        await db.query(
          "delete from list_invitations where id::text=$1 and email=$2",
          [text(id), email],
        )
      ).rowCount,
    );
  });
}
export async function switchList(id: string): Promise<void> {
  const { email } = await identity();
  await transaction(email, async (db) => {
    requireRow(
      (
        await db.query(
          "select 1 from list_members m join lists h on h.id=m.list_id where m.list_id::text=$1 and m.email=$2 and h.status='active'",
          [text(id), email],
        )
      ).rowCount,
    );
    await db.query(
      "insert into user_preferences(email,list_id) values($1,$2) on conflict(email) do update set list_id=excluded.list_id",
      [email, id],
    );
  });
}
export async function changeMemberRole(): Promise<void> {
  throw new DataError(
    "Los roles de la app no se pueden cambiar desde una lista",
    403,
  );
}
export async function revokeAccess(
  recipient: string,
  scope?: string,
): Promise<void> {
  await withListEditor(async (db, h, email) => {
    const target = text(recipient).toLowerCase();
    if (target === email)
      throw new DataError("No puedes quitar tu propio acceso");
    const  list = await db.query(
      "select owner_email from lists where id=$1",
      [h],
    );
    requireRow( list.rowCount);
    if (target ===  list.rows[0].owner_email)
      throw new DataError("No puedes quitar el acceso del propietario");
    await db.query(
      "delete from user_preferences where list_id=$1 and email=$2",
      [h, target],
    );
    await db.query(
      "delete from list_members where list_id=$1 and email=$2",
      [h, target],
    );
    await db.query(
      "delete from list_invitations where list_id=$1 and email=$2",
      [h, target],
    );
  }, scope);
}

export async function leaveList(scope?: string): Promise<void> {
  await withList(async (db, h, email) => {
    const owner = await db.query("select owner_email from lists where id=$1", [h]);
    requireRow(owner.rowCount);
    if (owner.rows[0].owner_email === email)
      throw new DataError("El propietario no puede abandonar su propia lista");
    await db.query("delete from user_preferences where list_id=$1 and email=$2", [h, email]);
    requireRow((await db.query("delete from list_members where list_id=$1 and email=$2", [h, email])).rowCount);
  }, scope);
}

export async function suggestListDeletion(scope?: string): Promise<void> {
  await withListItemEditor(async (db, h, email) => {
    const owner = await db.query("select owner_email from lists where id=$1", [h]);
    requireRow(owner.rowCount);
    if (owner.rows[0].owner_email === email)
      throw new DataError("El propietario puede eliminar la lista directamente");
    await db.query(
      "insert into  list_deletion_suggestions(list_id,email) values($1,$2) on conflict (list_id,email) do update set status='pending',created_at=now()",
      [h, email],
    );
  }, scope);
}

// Only return list metadata after membership or an invitation for this identity.
export async function resolveListSlug(
  slug: string,
): Promise<
  | { kind: "member"; id: string }
  | { kind: "invitation"; invitationId: string; name: string; owner: string; role: ListAccessRole }
> {
  if (!/^lista-[0-9a-f]{32}$/.test(slug))
    throw new DataError("Enlace de lista inválido", 400);
  const { email } = await identity();
  return transaction(email, async (db) => {
    const result = await db.query(
      `select h.id,h.name,h.owner_email,m.email as member,i.id as invitation,i.role as invitation_role
       from lists h
       left join list_members m on m.list_id=h.id and m.email=$2
       left join list_invitations i on i.list_id=h.id and i.email=$2
       where h.slug=$1 and h.status='active' and (m.email is not null or i.id is not null)`,
      [slug, email],
    );
    if (!result.rowCount)
      throw new DataError(
        "La lista no está disponible o no tienes acceso. Solicita una invitación al propietario.",
        403,
      );
    const list = result.rows[0];
    return list.member
      ? { kind: "member", id: list.id }
      : {
          kind: "invitation",
          invitationId: list.invitation,
          name: list.name,
          owner: list.owner_email,
          role: list.invitation_role as ListAccessRole,
        };
  });
}

export async function suggestListName(
  name: string,
  scope?: string,
): Promise<void> {
  const label = text(name);
  await withListItemEditor(async (db, h, email) => {
    await db.query(
      "insert into list_name_suggestions(list_id,email,name) values($1,$2,$3)",
      [h, email, label],
    );
  }, scope);
}

export async function reviewListName(
  id: string,
  decision: "approve" | "reject",
  scope?: string,
): Promise<void> {
  if (!["approve", "reject"].includes(decision))
    throw new DataError("Decisión inválida");
  await withListEditor(async (db, h, email) => {
    const suggestion = await db.query(
      "select email,name,status from list_name_suggestions where list_id=$1 and id::text=$2 for update",
      [h, text(id)],
    );
    requireRow(suggestion.rowCount);
    const proposed = suggestion.rows[0];
    if (proposed.status !== "pending")
      throw new DataError("La sugerencia ya fue revisada");
    if (decision === "approve") {
      requireRow(
        (
          await db.query(
          "select 1 from list_members where list_id=$1 and email=$2",
            [h, proposed.email],
          )
        ).rowCount,
      );
      await db.query("update lists set name=$2 where id=$1", [
        h,
        text(proposed.name),
      ]);
    }
    await db.query(
      "update list_name_suggestions set status=$3,reviewed_by=$4,reviewed_at=now() where list_id=$1 and id::text=$2",
      [h, id, decision === "approve" ? "approved" : "rejected", email],
    );
  }, scope);
}

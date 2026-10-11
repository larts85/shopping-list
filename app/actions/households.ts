"use server";
import { deliverInvitation } from "../lib/invitationDelivery";
import {
  withHousehold,
  withListEditor,
  identity,
  transaction,
  text,
  DataError,
  requireRow,
  householdRole,
  appRole,
  type MemberRole,
} from "../lib/database";
export async function getPendingInvitations() {
  const { email } = await identity();
  return transaction(
    email,
    async (db) =>
      (
        await db.query(
          "select i.id,h.name,h.owner_email from household_invitations i join households h on h.id=i.household_id where i.email=$1 order by h.name,i.id",
          [email],
        )
      ).rows as { id: string; name: string; owner_email: string }[],
  );
}
export async function getHouseholdData(scope?: string) {
  return withHousehold(async (db, h, email) => {
    const role = await householdRole(db, h, email);
    return {
      email,
      role: await appRole(db, email),
      canEditList: role === "owner",
      memberCount: Number(
        (
          await db.query(
            "select count(*) from household_members where household_id=$1",
            [h],
          )
        ).rows[0].count,
      ),
      household: (
        await db.query(
          "select id,slug,name,owner_email from households where id=$1",
          [h],
        )
      ).rows[0] as {
        id: string;
        slug: string;
        name: string;
        owner_email: string;
      },
      members:
        email ===
        (await db.query("select owner_email from households where id=$1", [h]))
          .rows[0].owner_email
          ? ((
              await db.query(
                "select m.email,case when m.email=h.owner_email then 'owner' else 'collaborator' end role from household_members m join households h on h.id=m.household_id where h.id=$1 order by m.email",
                [h],
              )
            ).rows as { email: string; role: MemberRole }[])
          : [],
      households: (
        await db.query(
          "select h.id,h.slug,h.name,h.owner_email from households h join household_members m on m.household_id=h.id where m.email=$1 order by h.created_at,h.id",
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
          "select i.id,h.name,h.owner_email from household_invitations i join households h on h.id=i.household_id where i.email=$1",
          [email],
        )
      ).rows as {
        id: string;
        name: string;
        owner_email: string;
      }[],
      pending:
        email ===
        (await db.query("select owner_email from households where id=$1", [h]))
          .rows[0].owner_email
          ? ((
              await db.query(
                "select id,email from household_invitations where household_id=$1",
                [h],
              )
            ).rows as { id: string; email: string }[])
          : [],
    };
  }, scope);
}
export async function createHousehold(
  name: string,
  scope?: string,
): Promise<string> {
  const label = text(name);
  return withHousehold(async (db, _source, email) => {
    const {
      rows: [home],
    } = await db.query(
      "insert into households(owner_email,name) values($1,$2) returning id",
      [email, label],
    );
    const h: string = home.id;
    await db.query(
      "insert into household_members(household_id,email,role) values($1,$2,'suggester')",
      [h, email],
    );
    await db.query(
      "update user_preferences set household_id=$2 where email=$1",
      [email, h],
    );
    return h;
  }, scope);
}
export async function renameHousehold(
  name: string,
  scope?: string,
): Promise<void> {
  await withListEditor(async (db, h) => {
    await db.query("update households set name=$2 where id=$1", [
      h,
      text(name),
    ]);
  }, scope);
}
export async function shareHousehold(
  recipient: string,
  scope?: string,
): Promise<{ delivery: "not_configured" | "sent" | "failed"; email: string }> {
  const email = text(recipient).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new DataError("Email inválido");
  const list = await withHousehold(async (db, h, owner) => {
    requireRow(
      (
        await db.query(
          "select 1 from households where id=$1 and owner_email=$2",
          [h, owner],
        )
      ).rowCount,
    );
    if (
      (
        await db.query(
          "select 1 from household_members where household_id=$1 and email=$2",
          [h, email],
        )
      ).rowCount
    )
      throw new DataError("La persona ya pertenece a la lista");
    await db.query(
      "insert into household_invitations(household_id,email) values($1,$2) on conflict do nothing",
      [h, email],
    );
    return (await db.query("select name,slug from households where id=$1", [h]))
      .rows[0] as { name: string; slug: string };
  }, scope);
  const url =
    process.env.APP_URL ||
    (process.env.VERCEL_ENV === "preview"
      ? "https://home-logistics-git-develop-larts85s-projects.vercel.app"
      : "https://elcarritodelacompra.vercel.app");
  const delivery = await deliverInvitation({
    email,
    name: list.name,
    url: new URL(`/logistic/lists/${list.slug}`, url).href,
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.INVITATION_FROM,
    gmailUser: process.env.GMAIL_USER_EMAIL,
    gmailPassword: process.env.GMAIL_APP_PASSWORD,
  });
  console.info(`list_invitation delivery=${delivery}`);
  return { delivery, email };
}
export async function acceptInvitation(id: string): Promise<void> {
  const { email } = await identity();
  await transaction(email, async (db) => {
    const invite = await db.query(
      "select household_id from household_invitations where id::text=$1 and email=$2",
      [text(id), email],
    );
    requireRow(invite.rowCount);
    const h = invite.rows[0].household_id;
    await db.query("select pg_advisory_xact_lock(hashtextextended($1,1))", [h]);
    requireRow(
      (
        await db.query(
          "select 1 from household_invitations where id::text=$1 and email=$2 for update",
          [id, email],
        )
      ).rowCount,
    );
    await db.query(
      "insert into household_members(household_id,email,role) values($1,$2,'suggester') on conflict do nothing",
      [h, email],
    );
    await db.query(
      "insert into user_preferences(email,household_id) values($1,$2) on conflict(email) do update set household_id=excluded.household_id",
      [email, h],
    );
    await db.query(
      "delete from household_invitations where id::text=$1 and email=$2",
      [id, email],
    );
  });
}
export async function declineInvitation(id: string): Promise<void> {
  const { email } = await identity();
  await transaction(email, async (db) => {
    requireRow(
      (
        await db.query(
          "delete from household_invitations where id::text=$1 and email=$2",
          [text(id), email],
        )
      ).rowCount,
    );
  });
}
export async function switchHousehold(id: string): Promise<void> {
  const { email } = await identity();
  await transaction(email, async (db) => {
    requireRow(
      (
        await db.query(
          "select 1 from household_members where household_id::text=$1 and email=$2",
          [text(id), email],
        )
      ).rowCount,
    );
    await db.query(
      "insert into user_preferences(email,household_id) values($1,$2) on conflict(email) do update set household_id=excluded.household_id",
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
  await withHousehold(async (db, h, email) => {
    requireRow(
      (
        await db.query(
          "select 1 from households where id=$1 and owner_email=$2",
          [h, email],
        )
      ).rowCount,
    );
    const target = text(recipient).toLowerCase();
    if (target === email)
      throw new DataError("No puedes quitar al propietario");
    await db.query(
      "delete from user_preferences where household_id=$1 and email=$2",
      [h, target],
    );
    await db.query(
      "delete from household_members where household_id=$1 and email=$2",
      [h, target],
    );
    await db.query(
      "delete from household_invitations where household_id=$1 and email=$2",
      [h, target],
    );
  }, scope);
}

// Only return list metadata after membership or an invitation for this identity.
export async function resolveListSlug(
  slug: string,
): Promise<
  | { kind: "member"; id: string }
  | { kind: "invitation"; invitationId: string; name: string; owner: string }
> {
  if (!/^lista-[0-9a-f]{32}$/.test(slug))
    throw new DataError("Enlace de lista inválido", 400);
  const { email } = await identity();
  return transaction(email, async (db) => {
    const result = await db.query(
      `select h.id,h.name,h.owner_email,m.email as member,i.id as invitation
       from households h
       left join household_members m on m.household_id=h.id and m.email=$2
       left join household_invitations i on i.household_id=h.id and i.email=$2
       where h.slug=$1 and (m.email is not null or i.id is not null)`,
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
        };
  });
}

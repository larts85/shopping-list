"use server";
import {
  withHousehold,
  identity,
  transaction,
  text,
  DataError,
  requireRow,
} from "../lib/database";
export async function getHouseholdData() {
  return withHousehold(async (db, h, email) => ({
    email,
    household: (
      await db.query("select id,name,owner_email from households where id=$1", [
        h,
      ])
    ).rows[0] as { id: string; name: string; owner_email: string },
    members: (
      await db.query(
        "select email from household_members where household_id=$1 order by email",
        [h],
      )
    ).rows as { email: string }[],
    households: (
      await db.query(
        "select h.id,h.name,h.owner_email from households h join household_members m on m.household_id=h.id where m.email=$1 order by h.created_at",
        [email],
      )
    ).rows as { id: string; name: string; owner_email: string }[],
    invitations: (
      await db.query(
        "select i.id,h.name,h.owner_email from household_invitations i join households h on h.id=i.household_id where i.email=$1",
        [email],
      )
    ).rows as { id: string; name: string; owner_email: string }[],
    pending: (
      await db.query(
        "select id,email from household_invitations where household_id=$1",
        [h],
      )
    ).rows as { id: string; email: string }[],
    imported: Boolean(
      (
        await db.query("select 1 from legacy_imports where household_id=$1", [
          h,
        ])
      ).rowCount,
    ),
  }));
}
export async function shareHousehold(recipient: string): Promise<void> {
  const email = text(recipient).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new DataError("Email inválido");
  await withHousehold(async (db, h, owner) => {
    const home = await db.query(
      "select 1 from households where id=$1 and owner_email=$2",
      [h, owner],
    );
    if (!home.rowCount)
      throw new DataError("Solo el propietario puede compartir el hogar", 403);
    if (
      (
        await db.query(
          "select 1 from household_members where household_id=$1 and email=$2",
          [h, email],
        )
      ).rowCount
    )
      throw new DataError("La persona ya pertenece al hogar");
    await db.query(
      "insert into household_invitations(household_id,email) values($1,$2) on conflict do nothing",
      [h, email],
    );
  });
}
export async function acceptInvitation(id: string): Promise<void> {
  const { email } = await identity();
  await transaction(email, async (db) => {
    const invite = await db.query(
      "select household_id from household_invitations where id::text=$1 and email=$2 for update",
      [text(id), email],
    );
    requireRow(invite.rowCount);
    const h = invite.rows[0].household_id;
    await db.query(
      "insert into household_members(household_id,email) values($1,$2) on conflict do nothing",
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
      "update user_preferences set household_id=$2 where email=$1",
      [email, id],
    );
  });
}
export async function revokeAccess(recipient: string): Promise<void> {
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
  });
}

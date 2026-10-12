import assert from "node:assert/strict";
import { defaultListName } from "../app/lib/listName.ts";
import { listShareUrl } from "../app/lib/listShareUrl.ts";
import { deliverInvitation } from "../app/lib/invitationDelivery.ts";
const message = {
  email: "qa@example.invalid",
  name: "Lista <de prueba>",
  url: "https://preview.example.invalid/logistic/lists/lista-0123456789abcdef0123456789abcdef",
  apiKey: "fake-test-token",
  from: "QA <sender@example.invalid>",
};
let calls = 0;
assert.equal(
  await deliverInvitation({ ...message, apiKey: undefined }, async () => {
    calls++;
    throw Error("Must not send");
  }),
  "not_configured",
);
assert.equal(calls, 0);
assert.equal(
  await deliverInvitation({ ...message, from: undefined }, async () => {
    throw Error("Must not send");
  }),
  "not_configured",
);
assert.equal(
  await deliverInvitation(message, async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer fake-test-token");
    const payload = JSON.parse(options.body);
    assert.deepEqual(payload.to, ["qa@example.invalid"]);
    assert.equal(payload.from, message.from);
    assert(payload.text.includes(message.url));
    assert(!payload.text.includes(message.url + "/logistic"));
    assert(payload.text.includes(message.name));
    return new Response("{}", { status: 200 });
  }),
  "sent",
);
assert.equal(
  await deliverInvitation(
    message,
    async () => new Response("{}", { status: 403 }),
  ),
  "failed",
);
assert.equal(
  await deliverInvitation(message, async () => {
    throw Error("Timeout");
  }),
  "failed",
);
console.log("13 offline invitation-delivery checks passed; no messages sent");
const gmail = {
  ...message,
  apiKey: undefined,
  from: undefined,
  gmailUser: "sender@example.invalid",
  gmailPassword: "fake-app-password",
};
assert.equal(
  await deliverInvitation(
    gmail,
    async () => {
      throw Error("Do not use Resend");
    },
    async (mail, credentials) => {
      assert.equal(mail.from, gmail.gmailUser);
      assert.equal(mail.to, gmail.email);
      assert(mail.text.includes(gmail.url));
      assert.deepEqual(credentials, {
        user: gmail.gmailUser,
        pass: "fake-app-password",
      });
      return true;
    },
  ),
  "sent",
);
assert.equal(
  await deliverInvitation(gmail, fetch, async () => false),
  "failed",
);
assert.equal(
  await deliverInvitation(gmail, fetch, async () => {
    throw Error("EAUTH");
  }),
  "failed",
);
assert.equal(
  await deliverInvitation(
    { ...gmail, gmailPassword: undefined },
    fetch,
    async () => {
      throw Error("Must not send");
    },
  ),
  "not_configured",
);
console.log("8 offline Gmail checks passed; no messages sent");

const slug = "lista-0123456789abcdef0123456789abcdef";
assert.equal(
  listShareUrl(slug, {
    VERCEL_ENV: "preview",
    VERCEL_BRANCH_URL: "current-branch.vercel.app",
    VERCEL_URL: "immutable.vercel.app",
    APP_URL: "https://production.example.invalid",
  }),
  `https://current-branch.vercel.app/logistic/lists/${slug}`,
);
assert.equal(
  listShareUrl(slug, {
    VERCEL_ENV: "preview",
    VERCEL_URL: "immutable.vercel.app",
    APP_URL: "https://production.example.invalid",
  }),
  `https://immutable.vercel.app/logistic/lists/${slug}`,
);
assert.equal(
  listShareUrl(slug, {
    VERCEL_ENV: "preview",
    APP_URL: "https://production.example.invalid",
  }),
  `https://home-logistics-git-develop-larts85s-projects.vercel.app/logistic/lists/${slug}`,
);
assert.equal(
  listShareUrl(slug, {
    VERCEL_ENV: "production",
    APP_URL: "https://production.example.invalid",
  }),
  `https://production.example.invalid/logistic/lists/${slug}`,
);
console.log("4 invitation environment isolation checks passed");

assert.equal(
  defaultListName(new Date("2026-10-12T02:59:59Z")),
  "Compras 11/10/2026",
);
assert.equal(
  defaultListName(new Date("2026-10-12T03:00:00Z")),
  "Compras 12/10/2026",
);
console.log("2 Argentine calendar boundary checks passed");

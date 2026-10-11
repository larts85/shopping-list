import assert from "node:assert/strict";
import { deliverInvitation } from "../app/lib/invitationDelivery.ts";
const message = {
  email: "qa@example.invalid",
  name: "Lista <de prueba>",
  url: "https://preview.example.invalid",
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
    assert(payload.text.includes("https://preview.example.invalid/logistic"));
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

import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  OAuthError,
  requireBearerAuth,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import { pool } from "./databaseConnection";
import { databaseSchema } from "./databaseSchema";

export type HomeLogisticsAuthInfo = AuthInfo & {
  email: string;
  subject: string;
};

type JwtPayload = {
  aud?: string | string[];
  client_id?: string;
  email?: string;
  exp?: number;
  iss?: string;
  scope?: string;
  sub?: string;
};

function configuration() {
  const authUrl = process.env.SUPABASE_AUTH_URL?.replace(/\/+$/, "");
  const publishableKey = process.env.SUPABASE_AUTH_PUBLISHABLE_KEY;
  const resourceUrl = process.env.MCP_SERVER_URL;
  const allowedClientIds = (process.env.MCP_OAUTH_ALLOWED_CLIENT_IDS ?? "")
    .split(",")
    .map((clientId) => clientId.trim())
    .filter(Boolean);

  if (!authUrl || !publishableKey || !resourceUrl)
    throw new Error("La autenticación MCP no está configurada");

  const parsedResource = new URL(resourceUrl);
  if (parsedResource.protocol !== "https:" && parsedResource.hostname !== "localhost")
    throw new Error("MCP_SERVER_URL debe usar HTTPS");

  return { authUrl, publishableKey, resourceUrl, allowedClientIds };
}

function decodePayload(token: string): JwtPayload {
  const payload = token.split(".")[1];
  if (!payload) throw new OAuthError("invalid_token", "Token inválido");
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new OAuthError("invalid_token", "Token inválido");
  }
}

async function resolveLinkedEmail(userId: string, email: string) {
  const db = await pool().connect();
  try {
    await db.query("begin read only");
    await db.query("select set_config('search_path',$1,true)", [
      databaseSchema(),
    ]);
    const result = await db.query(
      "select email from app_users where auth_user_id=$1 and email=$2",
      [userId, email.toLowerCase()],
    );
    await db.query("commit");
    return result.rows[0]?.email as string | undefined;
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}

const verifier = {
  async verifyAccessToken(token: string): Promise<HomeLogisticsAuthInfo> {
    const { authUrl, publishableKey, allowedClientIds } =
      configuration();
    const payload = decodePayload(token);
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const expectedIssuer = `${authUrl}/auth/v1`;
    if (
      payload.iss !== expectedIssuer ||
      !audience.includes("authenticated") ||
      !payload.sub ||
      !payload.email ||
      !payload.exp ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      !payload.client_id ||
      !allowedClientIds.length ||
      !allowedClientIds.includes(payload.client_id)
    )
      throw new OAuthError("invalid_token", "Token no autorizado para MCP");

    const supabase = createClient(authUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (
      error ||
      !data.user ||
      data.user.id !== payload.sub ||
      data.user.email?.toLowerCase() !== payload.email.toLowerCase() ||
      !data.user.email_confirmed_at
    )
      throw new OAuthError("invalid_token", "No se pudo verificar el usuario");

    const linkedEmail = await resolveLinkedEmail(data.user.id, data.user.email);
    if (!linkedEmail)
      throw new OAuthError("invalid_token", "La cuenta no está vinculada a Home Logistics");

    return {
      token,
      clientId: payload.client_id,
      scopes: (payload.scope ?? "").split(/\s+/).filter(Boolean),
      expiresAt: payload.exp,
      subject: data.user.id,
      email: linkedEmail,
    };
  },
};

export function getMcpBearerAuth() {
  const { resourceUrl } = configuration();
  const metadataUrl = new URL("/.well-known/oauth-protected-resource/mcp", resourceUrl).toString();
  return requireBearerAuth({ verifier, resourceMetadataUrl: metadataUrl });
}

export function getMcpOAuthMetadata() {
  const { authUrl, resourceUrl } = configuration();
  return {
    resource: resourceUrl,
    authorization_servers: [`${authUrl}/auth/v1`],
    scopes_supported: ["openid", "email", "profile"],
  };
}

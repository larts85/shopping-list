import {
  createMcpHandler,
  McpServer,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import { bulkAddToList, getListPageData, setBought } from "@/app/actions/list";
import { getProducts } from "@/app/actions/products";
import { DataError } from "@/app/lib/database";
import { runWithMcpIdentity } from "@/app/lib/mcpIdentity";
import {
  getMcpBearerAuth,
  type HomeLogisticsAuthInfo,
} from "@/app/lib/mcpAuth";

export const runtime = "nodejs";

const oauthSecurity = [{ type: "oauth2", scopes: ["openid", "email"] }];
function result<T extends Record<string, unknown>>(value: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

function toolError(error: unknown) {
  const message =
    error instanceof DataError
      ? error.message
      : "No se pudo completar la operación. Inténtalo nuevamente.";
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-AR");
}

function addSecuritySchemes(response: Response) {
  if (!response.headers.get("content-type")?.includes("application/json"))
    return response;

  return response
    .clone()
    .json()
    .then((body: unknown) => {
      if (
        !body ||
        typeof body !== "object" ||
        !("result" in body) ||
        !body.result ||
        typeof body.result !== "object" ||
        !("tools" in body.result) ||
        !Array.isArray(body.result.tools)
      )
        return response;

      const responseBody = body as {
        result: { tools: Array<Record<string, unknown>> };
      };
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      headers.delete("transfer-encoding");
      responseBody.result.tools = responseBody.result.tools.map((tool) => ({
        ...tool,
        securitySchemes: oauthSecurity,
        _meta: {
          ...(tool._meta && typeof tool._meta === "object" ? tool._meta : {}),
          securitySchemes: oauthSecurity,
        },
      }));
      return new Response(JSON.stringify(responseBody), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    })
    .catch(() => response);
}

function createHandler() {
  return createMcpHandler(
    ({ authInfo }) => {
      const email = (authInfo as HomeLogisticsAuthInfo | undefined)?.email;
      const subject = (authInfo as HomeLogisticsAuthInfo | undefined)?.subject;
      const server = new McpServer({ name: "home-logistics", version: "1.0.0" });

      server.registerTool(
        "get_account_profile",
        {
          title: "Ver cuenta conectada",
          description: "Devuelve la identidad de Home Logistics conectada a esta cuenta.",
          inputSchema: z.object({}),
          _meta: { "openai/profile": true },
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async () =>
          email && subject
            ? result({ id: subject, email })
            : toolError(new DataError("Vuelve a conectar tu cuenta", 401)),
      );

      server.registerTool(
        "get_active_shopping_list",
        {
          title: "Consultar lista activa",
          description: "Muestra los artículos de la lista activa del hogar y sus cantidades, unidades y precios registrados.",
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async () => {
          if (!email) return toolError(new DataError("Vuelve a conectar tu cuenta", 401));
          try {
            return await runWithMcpIdentity(email, async () => {
              const data = await getListPageData();
              const categories = new Map(data.categories.map((category) => [category.id, category.name]));
              const items = Object.values(data.list).flat().map((item) => ({
                id: item.id,
                name: item.name,
                category: categories.get(item.id_category) ?? "",
                quantity: item.cantidad,
                unit: item.unit ?? item.productUnit ?? "un",
                purchased: item.comprado === "1",
                price: item.precioValue ?? null,
                currency: "ARS",
              }));
              return result({ household: data.household.name, items });
            });
          } catch (error) {
            return toolError(error);
          }
        },
      );

      server.registerTool(
        "search_products",
        {
          title: "Buscar productos",
          description: "Busca productos disponibles para agregar en el catálogo del hogar activo.",
          inputSchema: z.object({ query: z.string().trim().min(1).max(100) }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        },
        async ({ query }) => {
          if (!email) return toolError(new DataError("Vuelve a conectar tu cuenta", 401));
          try {
            return await runWithMcpIdentity(email, async () => {
              const [products, page] = await Promise.all([getProducts(), getListPageData()]);
              const categories = new Map(page.categories.map((category) => [category.id, category.name]));
              const term = normalized(query);
              const matches = products
                .filter((product) => normalized(product.name).includes(term))
                .slice(0, 20)
                .map((product) => ({
                  name: product.name,
                  category: categories.get(product.id_category) ?? "",
                  categoryId: product.id_category,
                  unit: product.unit ?? "un",
                  availableUnits: product.availableUnits ?? [],
                }));
              return result({ matches });
            });
          } catch (error) {
            return toolError(error);
          }
        },
      );

      server.registerTool(
        "add_item_to_list",
        {
          title: "Agregar artículo a la lista",
          description: "Agrega un producto del catálogo a la lista activa. Si hay varios nombres parecidos, primero devuelve opciones para que el usuario elija.",
          inputSchema: z.object({
            name: z.string().trim().min(1).max(200),
            quantity: z.number().positive().finite().optional(),
            unit: z.enum(["un", "kg", "g", "mg", "comp", "lt", "ml"]).optional(),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
        },
        async ({ name, quantity, unit }) => {
          if (!email) return toolError(new DataError("Vuelve a conectar tu cuenta", 401));
          try {
            return await runWithMcpIdentity(email, async () => {
              const [products, page] = await Promise.all([getProducts(), getListPageData()]);
              const categories = new Map(page.categories.map((category) => [category.id, category.name]));
              const query = normalized(name);
              const exact = products.filter((product) => normalized(product.name) === query);
              const candidates = exact.length
                ? exact
                : products.filter((product) => normalized(product.name).includes(query));
              if (candidates.length !== 1) {
                return result({
                  added: false,
                  options: candidates.slice(0, 10).map((product) => ({
                    name: product.name,
                    category: categories.get(product.id_category) ?? "",
                  })),
                  message: candidates.length
                    ? "Hay más de una coincidencia; pide al usuario que elija una."
                    : "No se encontró el producto en el catálogo. Busca otro nombre o agrégalo desde Home Logistics.",
                });
              }

              const product = candidates[0];
              const selectedUnit = unit ?? product.unit ?? "un";
              const added = await bulkAddToList([
                {
                  name: product.name,
                  idCategory: product.id_category,
                  cantidad: quantity ?? 1,
                  unit: selectedUnit,
                  availableUnits: product.availableUnits,
                },
              ]);
              return result({ added: true, product: product.name, quantity: quantity ?? 1, unit: selectedUnit, ...added });
            });
          } catch (error) {
            return toolError(error);
          }
        },
      );

      server.registerTool(
        "mark_item_purchased",
        {
          title: "Marcar artículo comprado",
          description: "Registra la compra de un artículo de la lista activa. Si no se indica cantidad, conserva la cantidad que figura en la lista.",
          inputSchema: z.object({
            itemId: z.string().min(1).max(200),
            quantity: z.number().positive().finite().optional(),
            measure: z.number().positive().finite().optional(),
            price: z.number().nonnegative().finite().nullable().optional(),
            priceMode: z.enum(["unit", "total"]).optional(),
            unit: z.enum(["un", "kg", "g", "mg", "comp", "lt", "ml"]).optional(),
            description: z.string().max(500).optional(),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
        },
        async ({ itemId, quantity, measure, price, priceMode, unit, description }) => {
          if (!email) return toolError(new DataError("Vuelve a conectar tu cuenta", 401));
          try {
            return await runWithMcpIdentity(email, async () => {
              const page = await getListPageData();
              const item = Object.values(page.list).flat().find((candidate) => candidate.id === itemId);
              if (!item) return toolError(new DataError("El artículo ya no está en la lista activa", 404));
              const purchasedQuantity = quantity ?? (Number(item.cantidad) || 1);
              const selectedUnit = unit ?? item.unit ?? item.productUnit ?? "un";
              await setBought(
                itemId,
                purchasedQuantity,
                measure ?? 1,
                price ?? null,
                selectedUnit,
                priceMode ?? "unit",
                description,
              );
              return result({
                purchased: true,
                item: item.name,
                quantity: purchasedQuantity,
                unit: selectedUnit,
                price: price ?? null,
                currency: "ARS",
              });
            });
          } catch (error) {
            return toolError(error);
          }
        },
      );

      return server;
    },
    { responseMode: "json" },
  );
}

let handler: ReturnType<typeof createHandler> | undefined;

async function handle(request: Request) {
  try {
    const gate = await getMcpBearerAuth()(request);
    if (gate instanceof Response) return gate;
    const authenticated = gate as HomeLogisticsAuthInfo;
    if (!authenticated.subject || !authenticated.clientId)
      return new Response("No autorizado", { status: 401 });

    const response = await (handler ??= createHandler()).fetch(request, {
      authInfo: gate as AuthInfo,
    });
    return addSecuritySchemes(response);
  } catch (error) {
    console.error("MCP request failed", error);
    return new Response("MCP no está configurado", { status: 503 });
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;

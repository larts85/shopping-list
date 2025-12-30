"use server";

import { googleSessionAuth } from "../lib/googleSessionAuth";

export const checkFolderExists = async (folderName: string) => {
  const { session, accessToken } = await googleSessionAuth();

  if (!session || !("accessToken" in session)) {
    throw new Error("There are problems with user authentication");
  }

  const query = encodeURIComponent(
    `name='${folderName}' and mimeType='application/vnd.google-apps.folder'and trashed=false`
  );

  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&includeItemsFromAllDrives=true&supportsAllDrives=true`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Error al buscar la carpeta: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();

  return data.files.length > 0 ? data.files[0] : null;
};

export async function getFolderId(folderName: string): Promise<string | null> {
  const { session } = await googleSessionAuth();
  if (!session || !("accessToken" in session)) {
    throw new Error("No se pudo autenticar el usuario.");
  }

  const accessToken = session.accessToken as string;
  if (!accessToken) {
    throw new Error("No se pudo obtener el accessToken.");
  }

  const searchFolderURL = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
    folderName
  )}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchResponse = await fetch(searchFolderURL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!searchResponse.ok) {
    throw new Error("Error al buscar la carpeta");
  }

  const data = await searchResponse.json();

  if (data.files && data.files.length > 0) {
    return data.files[0].id; // Devuelve el ID de la primera carpeta encontrada con el nombre especificado
  } else {
    return null; // Si no se encuentra ninguna carpeta con ese nombre
  }
}
export async function getFileInFolder(folderId: string, fileName: string) {
  const { accessToken } = await googleSessionAuth();

  if (!accessToken) {
    throw new Error("No se pudo obtener el token de acceso.");
  }

  // Query para buscar el archivo en la carpeta específica
  const query = encodeURIComponent(
    `name='${fileName}' and '${folderId}' in parents and trashed=false`
  );

  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Error al buscar el archivo: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();

  // Verificar si se encontró el archivo y devolver su información
  return data.files.length > 0 ? data.files[0] : null;
}

export async function shareFolder(
  folderName: string,
  folderId: string,
  emailToShare: string
) {
  const { session } = await googleSessionAuth();
  
  if (!session || !("accessToken" in session)) {
    throw new Error("No se pudo autenticar el usuario.");
  }
  const accessToken = session.accessToken as string;
  if (!accessToken) {
    throw new Error("No se pudo obtener el accessToken.");
  }
  const createFolderURL = `https://www.googleapis.com/drive/v3/files/${folderId}/permissions`;
  const permissionMetadata = {
    role: "writer",
    type: "user",
    emailAddress: emailToShare,
  };
  const shareResponse = await fetch(createFolderURL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(permissionMetadata),
  });

  if (!shareResponse.ok) {
    throw new Error("Error al compartir la carpeta");
  }
  return "shared";
}

export async function listFilesInSharedFolder(folderId: string) {
  const { session } = await googleSessionAuth();
  if (!session || !("accessToken" in session)) {
    throw new Error("No se pudo autenticar el usuario.");
  }
  const accessToken = session.accessToken as string;
  if (!accessToken) {
    throw new Error("No se pudo obtener el accessToken.");
  }
  const listFolderURL = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents`;

  const response = await fetch(listFolderURL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Error al mostrar carpetas compartida");
  }
  const data = await response.json();
  return data.files;
}

export async function sendEmail(to: string, subject: string, message: string) {
  const { session } = await googleSessionAuth();
  if (!session || !("accessToken" in session)) {
    throw new Error("No se pudo autenticar el usuario.");
  }
  const accessToken = session.accessToken as string;
  try {
    const email = [`To: ${to}`, `Subject: ${subject}`, "", message].join("\n");

    const rawMessage = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: rawMessage,
        }),
      }
    );

    const data = await response.json();
    console.log("Correo enviado:", data);
  } catch (error) {
    console.error("Error al enviar correo:", error);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createFolderAndSheet(
  folderName: string,
  sheetName: string
) {
  const folder = await checkFolderExists(folderName);
  if (!folder) {
    const { session } = await googleSessionAuth();
    if (!session || !("accessToken" in session)) {
      throw new Error("There are problems with user authentication");
    }
    const accessToken = session.accessToken as string;

    // Crear la carpeta en Google Drive
    const folderResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
        }),
      }
    );

    if (!folderResponse.ok) {
      throw new Error("Error al crear la carpeta");
    }

    const folderData = await folderResponse.json();
    const folderId = folderData.id;

    // Crear el archivo de Google Sheets dentro de la carpeta creada
    const sheetResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: sheetName,
          mimeType: "application/vnd.google-apps.spreadsheet",
          parents: [folderId],
        }),
      }
    );

    if (!sheetResponse.ok) {
      throw new Error("Error al crear la hoja de cálculo");
    }

    const sheetData = await sheetResponse.json();
    const sheetId = sheetData.id;

    // Intentar obtener la lista de hojas con reintentos
    let sheetsInfo;
    for (let attempt = 0; attempt < 5; attempt++) {
      await delay(1000); // Espera 1 segundo antes de cada intento
      const getSheetsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (getSheetsResponse.ok) {
        sheetsInfo = await getSheetsResponse.json();
        if (sheetsInfo.sheets && sheetsInfo.sheets.length > 0) {
          break;
        }
      }
    }

    if (!sheetsInfo || !sheetsInfo.sheets || sheetsInfo.sheets.length === 0) {
      throw new Error(
        "No se pudo encontrar ninguna hoja en la hoja de cálculo creada"
      );
    }

    const firstSheetId = sheetsInfo.sheets[0].properties.sheetId;

    // Crear las hojas "categories", "products", "list", "historical"
    const createSheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: "categories",
                },
              },
            },
            {
              addSheet: {
                properties: {
                  title: "products",
                },
              },
            },
            {
              addSheet: {
                properties: {
                  title: "list",
                },
              },
            },
            {
              addSheet: {
                properties: {
                  title: "historical",
                },
              },
            },
          ],
        }),
      }
    );

    if (!createSheetsResponse.ok) {
      throw new Error("Error al crear las hojas");
    }

    const sheetsData = await createSheetsResponse.json();
    const sheetsMap: Record<string, number> = {};
    sheetsData.replies.forEach((reply: any) => {
      const sheet = reply.addSheet.properties;
      sheetsMap[sheet.title] = sheet.sheetId;
    });

    // Configurar las columnas de cada hoja
    const configureSheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              updateCells: {
                range: {
                  sheetId: sheetsMap["categories"],
                  startRowIndex: 0,
                  startColumnIndex: 0,
                  endRowIndex: 1,
                  endColumnIndex: 2,
                },
                rows: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: "id" } },
                      { userEnteredValue: { stringValue: "name" } },
                    ],
                  },
                ],
                fields: "userEnteredValue",
              },
            },
            {
              updateCells: {
                range: {
                  sheetId: sheetsMap["products"],
                  startRowIndex: 0,
                  startColumnIndex: 0,
                  endRowIndex: 1,
                  endColumnIndex: 4,
                },
                rows: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: "id" } },
                      { userEnteredValue: { stringValue: "name" } },
                      { userEnteredValue: { stringValue: "id_category" } },
                      { userEnteredValue: { stringValue: "checked" } },
                    ],
                  },
                ],
                fields: "userEnteredValue",
              },
            },
            {
              updateCells: {
                range: {
                  sheetId: sheetsMap["list"],
                  startRowIndex: 0,
                  startColumnIndex: 0,
                  endRowIndex: 1,
                  endColumnIndex: 11,
                },
                rows: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: "id" } },
                      { userEnteredValue: { stringValue: "id_product" } },
                      { userEnteredValue: { stringValue: "name" } },
                      { userEnteredValue: { stringValue: "id_category" } },
                      { userEnteredValue: { stringValue: "cantidad" } },
                      { userEnteredValue: { stringValue: "medida" } },
                      { userEnteredValue: { stringValue: "precio" } },
                      { userEnteredValue: { stringValue: "precio_total" } },
                      { userEnteredValue: { stringValue: "precio_kg" } },
                      { userEnteredValue: { stringValue: "kg_total" } },
                      { userEnteredValue: { stringValue: "comprado" } },
                    ],
                  },
                ],
                fields: "userEnteredValue",
              },
            },
            {
              updateCells: {
                range: {
                  sheetId: sheetsMap["historical"],
                  startRowIndex: 0,
                  startColumnIndex: 0,
                  endRowIndex: 1,
                  endColumnIndex: 13,
                },
                rows: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: "id" } },
                      { userEnteredValue: { stringValue: "id_list" } },
                      { userEnteredValue: { stringValue: "id_product" } },
                      { userEnteredValue: { stringValue: "name" } },
                      { userEnteredValue: { stringValue: "id_category" } },
                      { userEnteredValue: { stringValue: "cantidad" } },
                      { userEnteredValue: { stringValue: "medida" } },
                      { userEnteredValue: { stringValue: "precio" } },
                      { userEnteredValue: { stringValue: "precio_total" } },
                      { userEnteredValue: { stringValue: "precio_kg" } },
                      { userEnteredValue: { stringValue: "kg_total" } },
                      { userEnteredValue: { stringValue: "comprado" } },
                      { userEnteredValue: { stringValue: "fecha" } },
                    ],
                  },
                ],
                fields: "userEnteredValue",
              },
            },
          ],
        }),
      }
    );

    if (!configureSheetsResponse.ok) {
      throw new Error("Error al configurar las hojas de cálculo");
    }

    // Delete page1
    const deleteSheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              deleteSheet: {
                sheetId: firstSheetId,
              },
            },
          ],
        }),
      }
    );

    return { folderId, sheetId };
  }
  return console.log("La carpeta ya existe");
}

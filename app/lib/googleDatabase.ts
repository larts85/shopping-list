import { checkFolderExists } from "../actions/googleDrive";
import { getFileInFolder } from "../actions/googleDrive";
import { googleSessionAuth } from "./googleSessionAuth";

export const getSheetFileId = async () => {
  const folderHomeLogist = await checkFolderExists("homeLogistic");
  if (!folderHomeLogist) {
    throw new Error("folder'homeLogistic' does not exist");
  }
  const idFolderHomeLogist = folderHomeLogist.id;
  const sheetFile = await getFileInFolder(
    idFolderHomeLogist,
    "homeLogisticSheet"
  );
  if (!sheetFile) {
    throw new Error("El archivo 'homeLogisticSheet' no existe en la carpeta.");
  }
  const sheetId = sheetFile.id;
  return sheetId;
};

export const getCategoriesId = async () => {
  const sheetFileId = await getSheetFileId();
  const { session } = await googleSessionAuth();
  if (!session || !("accessToken" in session)) {
    throw new Error("No se pudo autenticar el usuario.");
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    throw new Error("No se pudo obtener el accessToken.");
  }
  const sheetMetadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetFileId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!sheetMetadataResponse.ok) {
    throw new Error("No se pudo obtener la metadata de la hoja de cálculo.");
  }

  const sheetMetadata = await sheetMetadataResponse.json();
  const categorySheet = sheetMetadata.sheets.find(
    (sheet: any) => sheet.properties.title === "categories"
  );

  if (!categorySheet) {
    throw new Error("La pestaña 'categories' no existe en la hoja de cálculo.");
  }

  const categorySheetId = categorySheet.properties.sheetId;
  return categorySheetId;
};

export const getproductsId = async () => {
  const sheetFileId = await getSheetFileId();
  const { session } = await googleSessionAuth();
  
  if (!session || !("accessToken" in session)) {
    throw new Error("No se pudo autenticar el usuario.");
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    throw new Error("No se pudo obtener el accessToken.");
  }
  const sheetMetadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetFileId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!sheetMetadataResponse.ok) {
    throw new Error("No se pudo obtener la metadata de la hoja de cálculo.");
  }

  const sheetMetadata = await sheetMetadataResponse.json();
  const categorySheet = sheetMetadata.sheets.find(
    (sheet: any) => sheet.properties.title === "products"
  );

  if (!categorySheet) {
    throw new Error("La pestaña 'categories' no existe en la hoja de cálculo.");
  }

  const categorySheetId = categorySheet.properties.sheetId;
  return categorySheetId;
};

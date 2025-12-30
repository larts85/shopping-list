import { GoogleSpreadsheet } from "google-spreadsheet";
import { googleSessionAuth } from "../lib/googleSessionAuth";
import { getSheetFileId } from "../lib/googleDatabase";
import { OAuth2Client } from "google-auth-library";

// Función para obtener el cliente OAuth2
const getOAuth2Client = (accessToken: string): OAuth2Client => {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
};

export const sheetDoc = async () => {
  const { session } = await googleSessionAuth();
  if (!session || !("accessToken" in session)) {
    throw new Error(
      "No se pudo autenticar el usuario o no se obtuvo el accessToken."
    );
  }
  const accessToken = session.accessToken as string;
  const sheetFileId = await getSheetFileId();
  if (!sheetFileId) {
    throw new Error("No se pudo obtener el ID de la hoja de cálculo.");
  }
  // Obtener el cliente OAuth2
  const authClient = getOAuth2Client(accessToken);
  // Crear una instancia de GoogleSpreadsheet
  return new GoogleSpreadsheet(sheetFileId, authClient);
};

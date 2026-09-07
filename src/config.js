import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3001,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  googleSheetId: process.env.GOOGLE_SHEET_ID,
  googleCredentials: loadGoogleCredentials(),
  fixedInversion: Number(process.env.APORTACION_FIJA_INVERSION) || 200,
  frontendOrigin: process.env.FRONTEND_ORIGIN || null,
  appPassword: process.env.APP_PASSWORD,
  sessionSecret: process.env.SESSION_SECRET,
};

function loadGoogleCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  }
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

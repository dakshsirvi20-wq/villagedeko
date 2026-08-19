const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");

const CLOUDINARY_API_KEY = defineSecret("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = defineSecret("CLOUDINARY_API_SECRET");

exports.createCloudinaryUploadSignature = onCall(
  {
    secrets: [CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET],
    region: "asia-south1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in."
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const paramsToSign = {
      timestamp,
      upload_preset: "unsigned_preset",
    };

    const stringToSign = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join("&");

    const signature = crypto
      .createHash("sha1")
      .update(stringToSign + CLOUDINARY_API_SECRET.value())
      .digest("hex");

    return {
      signature,
      timestamp,
      apiKey: CLOUDINARY_API_KEY.value(),
      cloudName: "cyo6vdu5",
      uploadPreset: "unsigned_preset",
    };
  }
);

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

exports.detectPotholesFromVideo = async (videoPath) => {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(videoPath));

    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/detect/video`,
      formData,
      {
        headers: formData.getHeaders(),

        // 🔥 VERY IMPORTANT for large video uploads
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 0, // ⛔ disables axios timeout
      }
    );

    return response.data;
  } catch (error) {
    console.error("AI Service Error:", error.message);
    throw error;
  }
};

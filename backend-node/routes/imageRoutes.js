// backend-node/routes/imageRoutes.js
import express from "express";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const router = express.Router();
const PYTHON_SERVER = "http://localhost:5000";

// Upload image
router.post("/upload", async (req, res) => {
  try {
    const imageFile = req.files?.find((f) => f.fieldname === "image");
    if (!imageFile) return res.status(400).json({ error: "No image uploaded" });

    const formData = new FormData();
    formData.append("image", fs.createReadStream(imageFile.path), {
      filename: imageFile.originalname,
    });

    const response = await axios.post(`${PYTHON_SERVER}/api/upload`, formData, {
      headers: formData.getHeaders(),
      responseType: "arraybuffer",
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // Hapus file sementara
    fs.unlinkSync(imageFile.path);

    res.set("Content-Type", "image/png");
    res.send(response.data);
  } catch (error) {
    console.error("Error uploading to Python:", error.message);
    res.status(500).json({
      error: "Terjadi kesalahan saat upload gambar ke Python backend",
      details: error.message,
    });
  }
});

// Open image from path
router.post("/open_image", async (req, res) => {
  try {
    const { image_path } = req.body;
    if (!image_path)
      return res.status(400).json({ error: "No image path provided" });

    const formData = new FormData();
    formData.append("image_path", image_path);

    const response = await axios.post(
      `${PYTHON_SERVER}/api/batch/open_image`,
      formData,
      {
        headers: formData.getHeaders(),
        responseType: "arraybuffer",
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    res.set("Content-Type", "image/png");
    res.send(response.data);
  } catch (error) {
    console.error("Error opening image:", error.message);
    res.status(500).json({
      error: "Terjadi kesalahan saat membuka gambar",
      details: error.message,
    });
  }
});

// Save image to path
router.post("/save_image", async (req, res) => {
  try {
    const imageFile = req.files?.find((f) => f.fieldname === "image");
    if (!imageFile) return res.status(400).json({ error: "No image uploaded" });

    const { save_path, format } = req.body;
    if (!save_path)
      return res.status(400).json({ error: "No save path provided" });

    const formData = new FormData();
    formData.append("image", fs.createReadStream(imageFile.path), {
      filename: imageFile.originalname,
    });
    formData.append("save_path", save_path);
    if (format) formData.append("format", format);

    const response = await axios.post(
      `${PYTHON_SERVER}/api/batch/save_image`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    // Hapus file sementara
    fs.unlinkSync(imageFile.path);

    res.json(response.data);
  } catch (error) {
    console.error("Error saving image:", error.message);
    res.status(500).json({
      error: "Terjadi kesalahan saat menyimpan gambar",
      details: error.message,
    });
  }
});

// Export image in format
router.post("/export_image", async (req, res) => {
  try {
    const imageFile = req.files?.find((f) => f.fieldname === "image");
    if (!imageFile) return res.status(400).json({ error: "No image uploaded" });

    const { format } = req.body;

    const formData = new FormData();
    formData.append("image", fs.createReadStream(imageFile.path), {
      filename: imageFile.originalname,
    });
    if (format) formData.append("format", format);

    const response = await axios.post(
      `${PYTHON_SERVER}/api/batch/export_image`,
      formData,
      {
        headers: formData.getHeaders(),
        responseType: "arraybuffer",
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    // Hapus file sementara
    fs.unlinkSync(imageFile.path);

    const mimeType = format ? `image/${format.toLowerCase()}` : "image/png";
    res.set("Content-Type", mimeType);
    res.send(response.data);
  } catch (error) {
    console.error("Error exporting image:", error.message);
    res.status(500).json({
      error: "Terjadi kesalahan saat mengekspor gambar",
      details: error.message,
    });
  }
});

export default router;

import express from "express";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const router = express.Router();
const PYTHON_SERVER = "http://localhost:5000";

router.post("/edit", async (req, res) => {
  try {
    const imageFile = req.files?.find((f) => f.fieldname === "image");

    const formData = new FormData();
    if (req.body.params) formData.append("params", req.body.params);
    if (req.body.operation) formData.append("operation", req.body.operation);

    if (imageFile) {
      formData.append("image", fs.createReadStream(imageFile.path), {
        filename: imageFile.originalname,
      });
    }

    const response = await axios.post(`${PYTHON_SERVER}/api/edit`, formData, {
      headers: formData.getHeaders(),
      responseType: "arraybuffer",
      timeout:
        req.body.operation === "super_resolution.realesrgan" ? 300000 : 30000,
    });

    // Hapus file sementara
    if (imageFile) fs.unlinkSync(imageFile.path);

    res.set("Content-Type", "image/png");
    res.send(response.data);
  } catch (error) {
    console.error("Error proxying to Python:", error.message);
    res.status(500).json({
      error: "Terjadi kesalahan saat memproses gambar di Python backend",
      details: error.message,
    });
  }
});

export default router;

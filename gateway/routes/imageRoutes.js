const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const upload = multer();
const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:5000";

// this is Handle file upload and image processing
router.post("/edit", upload.single("image"), async (req, res) => {
  try {
    const { operation, params } = req.body;
    const formData = new FormData();

    // to Forward the image file
    formData.append("image", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // to Forward operation and parameters
    formData.append("operation", operation);
    formData.append("params", JSON.stringify(params || {}));

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/api/edit`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Accept: "image/*",
        },
        responseType: "arraybuffer",
      }
    );

    // to Send processed image back to client
    res.set("Content-Type", response.headers["content-type"]);
    res.send(response.data);
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).send("Error processing image");
  }
});

// to Handle batch processing
router.post("/batch", upload.array("images"), async (req, res) => {
  try {
    const { operation, params } = req.body;
    const results = [];

    for (const file of req.files) {
      const formData = new FormData();
      formData.append("image", file.buffer, file.originalname);
      formData.append("operation", operation);
      formData.append("params", JSON.stringify(params || {}));

      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/api/edit`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Accept: "image/*",
          },
          responseType: "arraybuffer",
        }
      );

      results.push({
        filename: file.originalname,
        data: response.data,
      });
    }

    res.json({ message: "Batch processing completed", results });
  } catch (error) {
    console.error("Error in batch processing:", error);
    res.status(500).send("Error in batch processing");
  }
});

router.post("/image/create_empty_layer", upload.none(), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append("width", req.body.width || 800);
    formData.append("height", req.body.height || 600);

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/api/image/create_empty_layer`,
      formData,
      {
        headers: formData.getHeaders(),
        responseType: "arraybuffer",
      }
    );

    res.set("Content-Type", "image/png");
    res.send(response.data);
  } catch (error) {
    console.error("Error creating empty layer:", error);
    res.status(500).send("Error creating empty layer");
  }
});

// to Handle cloud storage integration
router.post("/cloud/upload", upload.single("image"), async (req, res) => {
  // to Implement cloud storage upload logic here
});

module.exports = router;

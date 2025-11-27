// backend-node/server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import imageRoutes from "./routes/imageRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());

// ✅ Pasang multer dulu agar stream multipart tidak terganggu
const upload = multer({ dest: "uploads/" });
app.use(upload.any()); // menangani semua file upload

// ✅ Baru pasang body-parser
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/image", imageRoutes);
app.use("/api/ai", aiRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("🧠 Node.js Backend is running!");
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Node.js server running on http://localhost:${PORT}`);
});

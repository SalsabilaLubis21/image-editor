import fs from "fs";
import axios from "axios";
import FormData from "form-data";

// Konfigurasi
const imagePath = "./family--phtophoto.jpg"; // ganti dengan path file kamu
const outputPath = "result.png";
const operation = "super_resolution.realesrgan"; // ubah sesuai kebutuhan
const params = {}; // bisa isi tile, half, scale, dll

// Validasi file
if (!fs.existsSync(imagePath)) {
  console.error("❌ File tidak ditemukan:", imagePath);
  process.exit(1);
}

// Siapkan form data
const formData = new FormData();
formData.append("image", fs.createReadStream(imagePath));
formData.append("operation", operation);
formData.append("params", JSON.stringify(params));

// Kirim ke Flask
axios
  .post("http://localhost:5000/api/edit", formData, {
    headers: formData.getHeaders(),
    responseType: "arraybuffer",
    timeout: 15000, // 15 detik
  })
  .then((res) => {
    fs.writeFileSync(outputPath, res.data);
    console.log(
      `✅ Gambar berhasil diproses dan disimpan sebagai ${outputPath}`
    );
  })
  .catch((err) => {
    if (err.response) {
      console.error("❌ Server responded with:", err.response.status);
      console.error("❌ Response data:", err.response.data.toString());
    } else {
      console.error("❌ Error:", err.message);
    }
  });

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// 🔴 MUST MATCH SHARED PRINTER NAME
const PRINTER_SHARE = "SNBC_LP46";

// temp folder
const TMP_DIR = path.join(process.cwd(), "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

app.post("/print-labels", (req, res) => {
  const { left, qty } = req.body;

  if (!left || !left.variant || !left.barcode || !left.price || !qty) {
    return res.status(400).json({ success: false, error: "Invalid payload" });
  }

  let epl = `
ZB
q812
Q344,24
S3
D10
`;

  for (let i = 0; i < qty; i += 2) {
    epl += `
N
A20,115,0,3,1,1,N,"${left.variant}"
B20,155,0,1,2,2,45,N,"${left.barcode}"
A20,220,0,3,1,1,N,"${left.barcode}"
A20,265,0,4,2,2,N,"Rs. ${left.price}"
`;

    if (i + 1 < qty) {
      epl += `
A420,115,0,3,1,1,N,"${left.variant}"
B420,155,0,1,2,2,45,N,"${left.barcode}"
A420,220,0,3,1,1,N,"${left.barcode}"
A420,265,0,4,2,2,N,"Rs. ${left.price}"
`;
    }

    epl += `
P1
`;
  }

  epl = epl.replace(/\n/g, "\r\n");

  const filePath = path.join(TMP_DIR, `label-${Date.now()}.epl`);
  fs.writeFileSync(filePath, epl, "ascii");

  const cmd = `copy /b "${filePath}" "\\\\localhost\\${PRINTER_SHARE}"`;

  exec(cmd, (err) => {
    fs.unlinkSync(filePath);

    if (err) {
      console.error("Print error:", err);
      return res.status(500).json({ success: false });
    }

    res.json({ success: true });
  });
});

app.listen(3005, () => {
  console.log("🖨 Printer service running on port 3005");
});

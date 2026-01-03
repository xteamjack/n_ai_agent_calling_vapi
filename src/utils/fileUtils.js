const fs = require("fs");
const path = require("path");
const axios = require("axios");

function ensureCallDir(callId) {
  const dir = path.join(__dirname, "..", "data", "calls", callId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveText(callId, fileName, content) {
  const dir = ensureCallDir(callId);
  fs.writeFileSync(path.join(dir, fileName), content, "utf-8");
}

async function downloadRecording(callId, url) {
  if (!url) return;

  const dir = ensureCallDir(callId);
  const filePath = path.join(dir, "recording.wav");

  const response = await axios.get(url, { responseType: "stream" });
  const writer = fs.createWriteStream(filePath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

module.exports = {
  saveText,
  downloadRecording,
};

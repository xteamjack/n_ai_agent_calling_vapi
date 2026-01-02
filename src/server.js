require("dotenv").config();

const express = require("express");
const { getCollection } = require("./libs/db");
const { startCall } = require("./services/callService");

const app = express();
app.use(express.json());

const COLLECTION = "survey_calls";

/**
 * VAPI WEBHOOK
 */

app.get("/vapi/health", async (req, res) => {
  res.send("Ok");
});

app.get("/vapi/info", async (req, res) => {
  res.send("VAPI endpoint v0.2.23");
});

app.post("/vapi/webhook", async (req, res) => {
  const event = req.body;
  const collection = await getCollection(COLLECTION);

  console.log(event);

  try {
    switch (event.type) {
      case "call.started":
        console.log("call started");
        await collection.updateOne(
          { callId: event.callId },
          {
            $set: {
              status: "in-progress",
              startedAt: new Date(),
            },
          }
        );
        break;

      case "tool.called":
        console.log("tool called");
        if (event.tool?.name === "saveSurveyAnswer") {
          await collection.updateOne(
            { callId: event.callId },
            {
              $set: {
                [`answers.${event.tool.arguments.questionId}`]:
                  event.tool.arguments.answer,
              },
            }
          );
        }
        break;

      case "transcript.updated":
        console.log("transcript update");
        await saveTranscript(callId, event.transcript);
        break;

      case "call.ended":
        console.log("call emd");
        await collection.updateOne(
          { callId: event.callId },
          {
            $set: {
              status: event.reason,
              endedAt: new Date(),
              transcript: event.transcript,
              recordingUrl: event.recordingUrl,
            },
          }
        );
        break;
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

async function saveTranscript(callId, transcript) {
  const file = path.join(process.env.TRANSCRIPTS_DIR, `${callId}.txt`);

  const text = transcript.map((t) => `[${t.speaker}] ${t.text}`).join("\n");

  await fs.outputFile(file, text);
}

app.post("/vapi/test-call", async (req, res) => {
  const { phone } = req.body;

  try {
    const callId = await startCall(phone);
    res.json({ success: true, callId });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ success: false });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
  console.log(formatIST(new Date()));
});

function formatIST(dateInput) {
  const date = new Date(dateInput); // can be Date object, ISO string, or timestamp

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

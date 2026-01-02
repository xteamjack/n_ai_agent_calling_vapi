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
app.post("/webhook/vapi", async (req, res) => {
  const event = req.body;
  const collection = await getCollection(COLLECTION);

  try {
    switch (event.type) {
      case "call.started":
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

      case "call.ended":
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

app.post("/test-call", async (req, res) => {
  const { phone } = req.body;

  try {
    const callId = await startCall(phone);
    res.json({ success: true, callId });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ success: false });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);

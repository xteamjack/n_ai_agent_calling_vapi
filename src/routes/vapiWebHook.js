const express = require("express");
const router = express.Router();

const { getCollection } = require("../libs/db");
const { saveText, downloadRecording } = require("../utils/fileUtils");
const formatTranscript = require("../utils/formatTranscript");

const COLLECTION = "calls";

router.post("/vapi/webhook", async (req, res) => {
  try {
    const event = req.body.message;
    if (!event?.type) return res.sendStatus(400);

    const callId = event.call?.id;
    const collection = await getCollection(COLLECTION);

    console.log("VAPI EVENT:", event.type, "CALL:", callId);

    switch (event.type) {
      case "assistant.started":
        await collection.updateOne(
          { callId },
          {
            $set: {
              callId,
              assistantId: event.assistant?.id,
              assistantName: event.assistant?.name,
              startedAt: new Date(event.timestamp),
              status: "started",
            },
          },
          { upsert: true }
        );
        break;

      case "status-update":
        await collection.updateOne(
          { callId },
          { $set: { status: event.status } }
        );
        break;

      case "conversation-update":
        if (event.artifact?.messages?.length) {
          await collection.updateOne(
            { callId },
            {
              $push: {
                conversation: { $each: event.artifact.messages },
              },
            }
          );
        }
        break;

      case "end-of-call-report": {
        const messages = event.artifact?.messages || [];
        const transcriptText = formatTranscript(messages);

        // Save files
        saveText(callId, "transcript.txt", transcriptText);

        const summaryText = `
Call ID: ${callId}
Assistant: ${event.assistant?.name}
Status: ${event.call?.status}
Cost: $${event.call?.cost}
Duration: ${event.call?.durationSeconds} seconds
Started At: ${event.call?.startedAt}
Ended At: ${event.call?.endedAt}
`;
        saveText(callId, "summary.txt", summaryText);

        await downloadRecording(callId, event.call?.recordingUrl);

        // Save DB
        await collection.updateOne(
          { callId },
          {
            $set: {
              status: "ended",
              endedAt: new Date(event.timestamp),
              durationSeconds: event.call?.durationSeconds,
              cost: event.call?.cost,
              recordingUrl: event.call?.recordingUrl,
              finalTranscript: transcriptText,
            },
          }
        );

        break;
      }

      default:
        // ignore speech-update etc.
        break;
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;

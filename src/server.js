require("dotenv").config();

const express = require("express");
const { getCollection } = require("./libs/db");
const { startCall } = require("./services/callService");

const app = express();
// app.use(express.json());
// 🔴 MUST be before routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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

// app.post("/vapi/webhook", async (req, res) => {
//   try {
//     const event = req.body.message;

//     if (!event?.type) {
//       console.error("Unknown webhook payload shape", req.body);
//       return res.sendStatus(400);
//     }

//     const callId = event.call?.id;
//     const collection = await getCollection(COLLECTION);

//     console.log("VAPI EVENT:", event.type, "CALL:", callId);

//     switch (event.type) {
//       case "status-update":
//         if (event.status === "in-progress") {
//           await collection.updateOne(
//             { callId },
//             {
//               $set: {
//                 status: "in-progress",
//                 startedAt: new Date(event.timestamp),
//               },
//             },
//             { upsert: true }
//           );
//         }
//         break;

//       case "assistant.started":
//         await collection.updateOne(
//           { callId },
//           {
//             $set: {
//               assistantId: event.assistant?.id,
//               assistantName: event.assistant?.name,
//             },
//           },
//           { upsert: true }
//         );
//         break;

//       case "tool.called":
//         if (event.tool?.name === "saveSurveyAnswer") {
//           await collection.updateOne(
//             { callId },
//             {
//               $set: {
//                 [`answers.${event.tool.arguments.questionId}`]:
//                   event.tool.arguments.answer,
//               },
//             }
//           );
//         }
//         break;

//       case "speech-update":
//         // optional: track speech lifecycle
//         break;

//       case "call.ended":
//         await collection.updateOne(
//           { callId },
//           {
//             $set: {
//               status: "ended",
//               endedAt: new Date(event.timestamp),
//               transcript: event.artifact?.messages,
//             },
//           }
//         );
//         break;

//       default:
//         console.log("Unhandled VAPI event:", event.type);
//     }

//     res.sendStatus(200);
//   } catch (err) {
//     console.error("Webhook error:", err);
//     res.sendStatus(500);
//   }
// });

// async function saveTranscript(callId, transcript) {
//   const file = path.join(process.env.TRANSCRIPTS_DIR, `${callId}.txt`);

//   const text = transcript.map((t) => `[${t.speaker}] ${t.text}`).join("\n");

//   await fs.outputFile(file, text);
// }

app.use(require("./routes/vapiWebHook"));

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

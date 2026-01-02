const axios = require("axios");
const { getCollection } = require("../libs/db");

const COLLECTION = "survey_calls";

async function startCall(phone) {
  const collection = await getCollection(COLLECTION);

  const response = await axios.post(
    "https://api.vapi.ai/call",
    {
      phoneNumber: phone,
      assistantId: process.env.VAPI_ASSISTANT_ID,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const callId = response.data.callId;

  await collection.insertOne({
    callId,
    phone,
    status: "initiated",
    answers: {},
    createdAt: new Date(),
  });

  return callId;
}

module.exports = {
  startCall,
};

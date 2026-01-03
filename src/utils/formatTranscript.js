module.exports = function formatTranscript(messages = []) {
  return messages
    .map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
    .join("\n\n");
};

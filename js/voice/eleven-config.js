// The ElevenLabs voice used for recordings and for new words.
// Shared by the game and tools/record-voice.mjs.
export const ELEVEN = {
  voiceName: 'Alice',
  voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
  modelId: 'eleven_flash_v2_5',
  languageCode: 'en',
  outputFormat: 'mp3_44100_64',
  dir: 'alice', // recordings live in audio/<dir>/
};

export function elevenRequest(text) {
  return {
    url: `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN.voiceId}?output_format=${ELEVEN.outputFormat}`,
    body: { text, model_id: ELEVEN.modelId, language_code: ELEVEN.languageCode },
  };
}

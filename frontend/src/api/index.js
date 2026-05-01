import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const analyzeHandwriting = async (formData) => {
  const response = await axios.post(`${BASE_URL}/analyze/handwriting`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const analyzeSpeech = async (formData) => {
  const response = await axios.post(`${BASE_URL}/analyze/speech`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const analyzeLetters = async (blobs) => {
  // blobs: array of 5 PNG Blobs, one per word [bed, dog, pup, quit, mum]
  const formData = new FormData();
  blobs.forEach((blob, i) => formData.append("files", blob, `word_${i}.png`));
  const response = await axios.post(`${BASE_URL}/analyze/letters`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const analyzeSpeechWithTranscript = async (audioBlob, browserTranscript) => {
  const formData = new FormData();
  formData.append("file", audioBlob, "speech.wav");
  if (browserTranscript && browserTranscript.trim()) {
    formData.append("browser_transcript", browserTranscript.trim());
  }
  const response = await axios.post(`${BASE_URL}/analyze/speech`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

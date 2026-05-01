import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeSpeech } from "../api";

const PASSAGE = `When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow.
The rainbow is a division of white light into many beautiful colors.
These take the shape of a long round arch, with its path high above and its two ends apparently beyond the horizon.`;

export default function SpeechTest() {
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleAnalyze = async () => {
    if (!audioBlob) {
      setError("Please record your speech first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "speech.wav");
      const result = await analyzeSpeech(formData);
      navigate("/results", { state: { speech: result, source: "speech" } });
    } catch (err) {
      setError("Analysis failed. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen px-8 py-16" style={{ background: "#f0f4ff" }}>
      <div className="max-w-2xl mx-auto">

        <button onClick={() => navigate("/test")} className="text-blue-600 text-sm mb-6 hover:underline">
          ← Back to Test Selection
        </button>

        <h1 className="text-3xl font-bold mb-2" style={{ color: "#1e3a5f" }}>Speech Analysis</h1>
        <p className="text-gray-500 mb-8">
          Read the passage below aloud, clearly and at your natural pace. We will analyze your reading fluency.
        </p>

        {/* Passage */}
        <div className="bg-white rounded-2xl shadow p-8 mb-8 border-l-4" style={{ borderColor: "#2563eb" }}>
          <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Read this passage aloud:</h3>
          <p className="text-gray-700 leading-relaxed text-lg">{PASSAGE}</p>
        </div>

        {/* Recording Controls */}
        <div className="bg-white rounded-2xl shadow p-8 mb-6 text-center">
          {recording ? (
            <div>
              <div className="w-20 h-20 bg-red-500 rounded-full mx-auto flex items-center justify-center mb-4 animate-pulse">
                <span className="text-white text-2xl">🎙️</span>
              </div>
              <div className="text-red-500 font-bold text-2xl mb-2">{formatTime(timer)}</div>
              <p className="text-gray-500 text-sm mb-6">Recording in progress... Read the passage above</p>
              <button
                onClick={stopRecording}
                className="bg-red-500 text-white font-bold px-10 py-3 rounded-full hover:bg-red-600 transition-all"
              >
                Stop Recording
              </button>
            </div>
          ) : (
            <div>
              <div className="text-6xl mb-4">🎙️</div>
              <p className="text-gray-500 mb-6 text-sm">Click the button and start reading the passage aloud</p>
              <button
                onClick={startRecording}
                style={{ background: "#16a34a" }}
                className="text-white font-bold px-10 py-3 rounded-full hover:opacity-90 transition-all"
              >
                Start Recording
              </button>
            </div>
          )}
        </div>

        {/* Playback */}
        {audioUrl && !recording && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h3 className="font-bold text-gray-700 mb-3">Your Recording:</h3>
            <audio controls src={audioUrl} className="w-full" />
            <button
              onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
              className="text-red-500 text-sm mt-3 hover:underline"
            >
              Re-record
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !audioBlob}
          style={{ background: loading || !audioBlob ? "#9ca3af" : "#2563eb" }}
          className="text-white font-bold px-10 py-4 rounded-full w-full text-lg transition-all"
        >
          {loading ? "Analyzing Speech..." : "Analyze Speech"}
        </button>

        {loading && (
          <div className="text-center mt-6 text-gray-500 text-sm animate-pulse">
            Transcribing with Whisper and calculating metrics...
          </div>
        )}
      </div>
    </div>
  );
}

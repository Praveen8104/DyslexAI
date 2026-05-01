import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { analyzeHandwriting } from "../api";

export default function HandwritingTest() {
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png"] },
    maxFiles: 1,
  });

  const handleAnalyze = async () => {
    if (!image) {
      setError("Please upload a handwriting image first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", image);
      const result = await analyzeHandwriting(formData);
      navigate("/results", { state: { handwriting: result, source: "handwriting" } });
    } catch (err) {
      setError("Analysis failed. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-8 py-16" style={{ background: "#f0f4ff" }}>
      <div className="max-w-2xl mx-auto">

        <button onClick={() => navigate("/test")} className="text-blue-600 text-sm mb-6 hover:underline">
          ← Back to Test Selection
        </button>

        <h1 className="text-3xl font-bold mb-2" style={{ color: "#1e3a5f" }}>Handwriting Analysis</h1>
        <p className="text-gray-500 mb-8">
          Upload a handwriting sample. Ask the child to write the alphabet (a–z) or copy a sentence.
          The AI model will detect reversal patterns, spacing issues, and other dyslexia indicators.
        </p>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8">
          <h3 className="font-bold text-blue-800 mb-2">Instructions for best results:</h3>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
            <li>Ask the child to write the alphabet in lowercase: a b c d e f...</li>
            <li>Or write this sentence: "The quick brown fox jumps over the lazy dog"</li>
            <li>Use plain white paper with no lines if possible</li>
            <li>Take a clear, well-lit photo</li>
          </ul>
        </div>

        {/* Upload Box */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all mb-6 ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:border-blue-400"
          }`}
        >
          <input {...getInputProps()} />
          {preview ? (
            <div>
              <img src={preview} alt="Uploaded handwriting" className="max-h-64 mx-auto rounded-lg shadow" />
              <p className="text-sm text-gray-500 mt-3">Click or drag to replace</p>
            </div>
          ) : (
            <div>
              <div className="text-5xl mb-4">📷</div>
              <p className="text-gray-600 font-medium">
                {isDragActive ? "Drop the image here..." : "Drag & drop or click to upload"}
              </p>
              <p className="text-gray-400 text-sm mt-2">Supports JPG, PNG</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !image}
          style={{ background: loading || !image ? "#9ca3af" : "#2563eb" }}
          className="text-white font-bold px-10 py-4 rounded-full w-full text-lg transition-all"
        >
          {loading ? "Analyzing... Please wait" : "Analyze Handwriting"}
        </button>

        {loading && (
          <div className="text-center mt-6 text-gray-500 text-sm animate-pulse">
            Running CNN model on your image...
          </div>
        )}
      </div>
    </div>
  );
}

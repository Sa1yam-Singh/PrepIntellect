import { useEffect, useRef } from "react";

export default function WaveformVisualizer({ stream, isRecording }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!isRecording || !stream) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Initialize Web Audio API
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Small fftSize for clean, spaced waveform bars

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current) return;
        animationRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          // Calculate scale and value
          const value = dataArray[i];
          const percent = value / 255;
          barHeight = Math.max(4, percent * canvas.height * 0.85);

          // Draw double-sided mirror bars centered vertically
          const y = (canvas.height - barHeight) / 2;

          // Create a gorgeous gradient for each bar
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, "#818cf8"); // Indigo-400
          gradient.addColorStop(0.5, "#a78bfa"); // Purple-400
          gradient.addColorStop(1, "#22d3ee"); // Cyan-400

          ctx.fillStyle = gradient;
          
          // Draw rounded bar
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth - 3, barHeight, 4);
          ctx.fill();

          x += barWidth;
        }
      };

      draw();
    } catch (err) {
      console.warn("Failed to initialize waveform visualizer:", err);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, [stream, isRecording]);

  return (
    <div className="flex items-center justify-center bg-black/10 border border-white/5 rounded-2xl p-4 h-16 w-full max-w-sm mx-auto backdrop-blur-sm">
      {isRecording ? (
        <canvas
          ref={canvasRef}
          width={300}
          height={40}
          className="w-full h-full"
        />
      ) : (
        <div className="text-xs text-gray-500 font-semibold tracking-wider uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gray-600 animate-pulse" />
          Microphone Standby
        </div>
      )}
    </div>
  );
}

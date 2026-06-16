import { useState, useEffect, useRef } from "react";
import { Terminal, Cpu, Activity, FolderCode, X, FileJson, Code2, Database, Camera, CameraOff, Mic, MicOff, Monitor, MonitorOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { JarvisHud } from "./components/JarvisHud";
import { AudioVisualizer } from "./components/AudioVisualizer";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface JarvisFile {
  id: string;
  name: string;
  content: string;
  type: string;
  timestamp: string;
}

interface HistoryItem {
  id: string;
  command: string;
  response: string;
  timestamp: string;
}

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("System Ready");
  const [bootSequence, setBootSequence] = useState(true);
  const [files, setFiles] = useState<JarvisFile[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<JarvisFile | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const recognitionRef = useRef<any>(null);
  const isActuallyStarted = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const startListening = () => {
    if (recognitionRef.current && !isActuallyStarted.current) {
      try {
        recognitionRef.current.start();
        isActuallyStarted.current = true;
        setIsListening(true);
        setStatus("Monitoring Audio...");
      } catch (e) {
        console.error("Failed to start listening:", e);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setBootSequence(false), 3000);
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'hi-IN';

      recognitionRef.current.onstart = () => {
        isActuallyStarted.current = true;
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[event.results.length - 1][0].transcript;
        setTranscript(text);
        processCommand(text);
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        console.error("Speech Error:", event.error);
        setStatus("Protocol: " + event.error);
        setIsListening(false);
        isActuallyStarted.current = false;
      };

      recognitionRef.current.onend = () => {
        isActuallyStarted.current = false;
        setIsListening(false);
        setStatus("System Ready");
      };
    }

    return () => {
      clearTimeout(timer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [status, isListening]);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  useEffect(() => {
    if (isScreenSharing && screenVideoRef.current && screenStreamRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
    }
  }, [isScreenSharing]);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      // Mobile check
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        setStatus("Mobile Block");
        setResponse("बॉस, मोबाइल ब्राउज़र पर स्क्रीन शेयरिंग संभव नहीं है। कृपया डेस्कटॉप का उपयोग करें।");
        speak("बॉस, मोबाइल ब्राउज़र पर स्क्रीन शेयरिंग संभव नहीं है। कृपया डेस्कटॉप का उपयोग करें।");
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setStatus("Display API Missing");
        setResponse("बॉस, यह ब्राउज़र स्क्रीन शेयरिंग (Screen Sharing) को सपोर्ट नहीं करता है।");
        speak("बॉस, यह ब्राउज़र स्क्रीन शेयरिंग को सपोर्ट नहीं करता है।");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { cursor: "always" } as any,
          audio: false 
        });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        setStatus("Display Link: OK");
        
        // Handle stream stop from browser UI
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };
      } catch (err: any) {
        console.error("Screen share access denied:", err);
        if (err.name === "NotAllowedError") {
          setStatus("Access Denied");
          setResponse("बॉस, स्क्रीन शेयरिंग के लिए अनुमति नहीं दी गई।");
          speak("बॉस, स्क्रीन शेयरिंग के लिए अनुमति नहीं दी गई।");
        } else {
          setStatus("Display Sync Error");
          setResponse("बॉस, स्क्रीन शेयरिंग शुरू करने में समस्या हुई। शायद आपके ब्राउज़र ने इसे ब्लॉक कर दिया है।");
          speak("बॉस, स्क्रीन शेयरिंग शुरू करने में समस्या हुई।");
        }
      }
    }
  };

  const toggleCamera = async () => {
    if (isCameraOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsCameraOpen(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setIsCameraOpen(true);
        setStatus("Optic Link: OK");
      } catch (err: any) {
        console.error("Camera access denied:", err);
        if (err.name === "NotAllowedError" || err.message?.includes("dismissed")) {
          setStatus("Camera Access Required");
          setResponse("बॉस, मुझे देखने के लिए कैमरा एक्सेस की आवश्यकता है। कृपया अनुमति दें।");
          speak("बॉस, मुझे देखने के लिए कैमरा एक्सेस की आवश्यकता है। कृपया अनुमति दें।");
        } else {
          setStatus("Camera Protocol Error");
        }
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
        setIsListening(false);
        isActuallyStarted.current = false;
        setStatus("System Paused");
      } catch (e) {}
    } else {
      startListening();
    }
  };

  const parseFilesFromResponse = (text: string) => {
    const fileRegex = /\[FILE:\s*(.*?)\]([\s\S]*?)\[\/FILE\]/g;
    let match;
    const newFiles: JarvisFile[] = [];
    let cleanText = text;

    while ((match = fileRegex.exec(text)) !== null) {
      const fileName = match[1].trim();
      const content = match[2].trim();
      newFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: fileName,
        content: content,
        type: fileName.split('.').pop() || 'txt',
        timestamp: new Date().toLocaleTimeString()
      });
      cleanText = cleanText.replace(match[0], `(New File Created: ${fileName})`);
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...newFiles, ...prev]);
      setIsPanelOpen(true);
      setActiveFile(newFiles[0]);
    }

    return cleanText;
  };

  const captureFrame = (videoElement: HTMLVideoElement) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
      }
    } catch (e) {
      console.error("Frame capture failed:", e);
    }
    return null;
  };

  const processCommand = async (text: string) => {
    setIsProcessing(true);
    setStatus("Analysing...");
    
    try {
      let imageData: string | null = null;
      if (isScreenSharing && screenVideoRef.current) {
        imageData = captureFrame(screenVideoRef.current);
      } else if (isCameraOpen && videoRef.current) {
        imageData = captureFrame(videoRef.current);
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text,
          image: imageData
        }),
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      const cleanResponse = parseFilesFromResponse(data.text);
      setResponse(cleanResponse);
      setHistory(prev => [{
        id: `hist-${Date.now()}`,
        command: text,
        response: cleanResponse,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev]);
      setStatus("Responding");
      speak(cleanResponse);
    } catch (error: any) {
      setResponse("सिस्टम विफलता। बॉस, न्यूरल लिंक बाधित है।");
      setStatus("Error");
    } finally {
      setIsProcessing(false);
    }
  };

  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    
    const voices = synth.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes("hi-IN") && (v.name.includes("Female") || v.name.includes("Shruti") || v.name.includes("Google")));
    if (hindiVoice) utterance.voice = hindiVoice;
    
    utterance.onstart = () => {
      setStatus("Speaking");
      try { recognitionRef.current.stop(); } catch(e) {}
    };

    utterance.onend = () => {
      setStatus("System Ready");
      setIsListening(false);
    };
    
    synth.speak(utterance);
  };

  if (bootSequence) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-jarvis-bg text-jarvis-blue overflow-hidden px-4 text-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="font-display text-4xl tracking-[1rem] uppercase glow-text mb-8"
        >
          Shruti
        </motion.div>
        <div className="w-full max-w-xs h-1 bg-white/10 rounded-full relative overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="absolute top-0 left-0 h-full bg-jarvis-blue shadow-[0_0_15px_#00f2ff]"
          />
        </div>
        <div className="mt-8 font-mono text-[10px] grid grid-cols-2 gap-4 opacity-40">
          <div>CORE_INIT: OK</div>
          <div>AUDIO_DRIVER: OK</div>
          <div>NEURAL_SYNC: OK</div>
          <div>HINDI_P_RELAY: OK</div>
        </div>
      </div>
    );
  }


  return (
    <div className="relative min-h-screen flex overflow-hidden">
      <div className="scanline" />
      
      {/* Main Container */}
      <div className={`flex-1 flex flex-col items-center justify-between p-6 transition-all duration-500 ${isPanelOpen ? 'mr-80' : 'mr-0'}`}>
        {/* Top Bar */}
        <div className="w-full flex justify-between items-start z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-jarvis-blue" />
              <span className="font-display text-sm tracking-widest uppercase glow-text">Shruti OS v4.0</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${status === "Error" ? "bg-red-500 shadow-[0_0_10px_#ef4444]" : "bg-cyan-500 shadow-[0_0_10px_#00f2ff]"}`} />
              <span className="font-mono text-[9px] text-white/50 uppercase tracking-tighter">Status: {status}</span>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <button 
              onClick={toggleScreenShare}
              className={`glass-panel p-2 rounded-full transition-all relative group ${isScreenSharing ? 'bg-jarvis-blue/20' : 'hover:bg-jarvis-blue/20'}`}
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5 text-jarvis-blue" /> : <Monitor className="w-5 h-5 text-jarvis-blue" />}
            </button>
            <button 
              onClick={toggleCamera}
              className={`glass-panel p-2 rounded-full transition-all relative group ${isCameraOpen ? 'bg-jarvis-blue/20' : 'hover:bg-jarvis-blue/20'}`}
            >
              {isCameraOpen ? <CameraOff className="w-5 h-5 text-jarvis-blue" /> : <Camera className="w-5 h-5 text-jarvis-blue" />}
            </button>
            <button 
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="glass-panel p-2 rounded-full hover:bg-jarvis-blue/20 transition-all relative group"
            >
              <FolderCode className="w-5 h-5 text-jarvis-blue" />
              {files.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1 rounded-full">{files.length}</span>
              )}
            </button>
            <Activity className="w-4 h-4 text-jarvis-blue opacity-50" />
          </div>
        </div>

        {/* HUD Area */}
        <div className="relative flex-1 w-full flex items-center justify-center">
          <JarvisHud />
          
          <AnimatePresence>
            {isScreenSharing && (
              <motion.div
                key="screen-share"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-1/4 right-[10%] glass-panel p-2 rounded-lg overflow-hidden border border-jarvis-blue shadow-[0_0_20px_rgba(0,242,255,0.3)] z-20"
              >
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-80 h-45 md:w-[480px] md:h-[270px] object-cover rounded"
                />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                  <span className="font-mono text-[10px] text-white/70 uppercase">Visual Stream: Linked</span>
                </div>
              </motion.div>
            )}

            {isCameraOpen && (
              <motion.div
                key="camera-feed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-1/4 glass-panel p-2 rounded-lg overflow-hidden border border-jarvis-blue shadow-[0_0_20px_rgba(0,242,255,0.3)] z-20"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-64 h-48 md:w-80 md:h-60 object-cover rounded"
                />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-mono text-[10px] text-white/70 uppercase">Optic Feed: Active</span>
                </div>
              </motion.div>
            )}

            {response && (
              <motion.div
                key="neural-response"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-1/4 max-w-lg glass-panel p-6 rounded-lg text-center mx-4 border border-jarvis-blue/30 backdrop-blur-xl shadow-[0_0_30px_rgba(0,242,255,0.1)]"
              >
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-jarvis-blue/50 rounded-tl -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-jarvis-blue/50 rounded-tr -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-jarvis-blue/50 rounded-bl -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-jarvis-blue/50 rounded-br -mb-1 -mr-1" />
                
                <div className="neural-line absolute top-0 left-0" />
                <p className="font-sans text-sm leading-relaxed text-jarvis-blue mb-2 font-medium">
                  {response}
                </p>
                <div className="neural-line absolute bottom-0 left-0" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Interface */}
        <div className="w-full max-w-xl flex flex-col items-center gap-6 py-8 pointer-events-auto">
          {transcript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono text-[11px] text-white/40 text-center max-w-sm mb-4"
            >
              DETECTED: "{transcript}"
            </motion.div>
          )}

          {/* Command History */}
          {history.length > 0 && (
            <div className="w-full max-h-40 overflow-y-auto mb-6 code-scrollbar px-4 border-t border-b border-jarvis-blue/10 py-4 glass-panel bg-black/20">
              <div className="flex flex-col gap-4">
                {history.map((item) => (
                  <div key={item.id} className="text-left border-l border-jarvis-blue/30 pl-4 py-1 transition-all hover:bg-jarvis-blue/5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[8px] text-jarvis-blue tracking-widest uppercase opacity-40">Entry: {item.timestamp}</span>
                      <Terminal className="w-3 h-3 text-jarvis-blue opacity-20" />
                    </div>
                    <div className="font-mono text-[10px] text-white/60 mb-1 leading-relaxed">
                      <span className="text-jarvis-blue/40 mr-2">&gt;</span>{item.command}
                    </div>
                    <div className="font-sans text-[10px] text-jarvis-blue/90 font-light italic leading-relaxed">
                      <span className="opacity-40 mr-2">SHRUTI:</span>{item.response.length > 100 ? item.response.substring(0, 100) + "..." : item.response}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AudioVisualizer isActive={isListening || isProcessing || status === "Speaking"} />
          
          <div className="flex items-center gap-8">
            <button className="glass-panel p-3 rounded-full hover:bg-jarvis-blue/10 transition-colors group">
              <Terminal className="w-4 h-4 text-jarvis-blue/60 group-hover:text-jarvis-blue" />
            </button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleListening}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                isListening 
                  ? "bg-jarvis-blue/10 border border-jarvis-blue shadow-[0_0_20px_rgba(0,242,255,0.3)]" 
                  : "bg-red-500/20 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              }`}
            >
              {isListening ? (
                <Mic className="w-6 h-6 text-jarvis-blue" />
              ) : (
                <MicOff className="w-6 h-6 text-red-500" />
              )}
            </motion.button>

            <button className="glass-panel p-3 rounded-full hover:bg-jarvis-blue/10 transition-colors group">
              <Activity className="w-4 h-4 text-jarvis-blue/60 group-hover:text-jarvis-blue" />
            </button>
          </div>

          <div className="flex gap-12 mt-2 opacity-30 font-mono text-[8px] uppercase tracking-widest">
            <div className="flex items-center gap-1">Audio Feed</div>
            <div className="flex items-center gap-1">Secure Link</div>
            <div className="flex items-center gap-1">Neural Sync</div>
          </div>
        </div>
      </div>

      {/* Side Panel: Neural Files */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            key="side-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed top-0 right-0 w-80 h-full glass-panel z-50 border-l border-jarvis-blue/30 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-jarvis-blue/20 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-2 text-jarvis-blue">
                <Database className="w-4 h-4" />
                <span className="font-display text-xs tracking-widest uppercase">Neural Cache</span>
              </div>
              <button onClick={() => setIsPanelOpen(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto code-scrollbar p-0">
              {files.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 opacity-20 text-center">
                  <Terminal className="w-12 h-12 mb-4" />
                  <p className="font-mono text-[10px] uppercase">No files generated in current cache.</p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* File List */}
                  {!activeFile ? (
                    <div className="flex flex-col">
                      {files.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => setActiveFile(file)}
                          className="w-full p-4 border-b border-jarvis-blue/10 flex items-center gap-3 hover:bg-jarvis-blue/5 transition-all text-left"
                        >
                          <div className="bg-jarvis-blue/20 p-2 rounded">
                            {file.type === 'json' ? <FileJson className="w-4 h-4 text-jarvis-blue" /> : <Code2 className="w-4 h-4 text-jarvis-blue" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-xs text-white/80 truncate">{file.name}</span>
                            <span className="text-[8px] text-white/30 uppercase">{file.timestamp}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* File Viewer */
                    <div className="flex flex-col h-full bg-black/40">
                      <div className="p-3 border-b border-jarvis-blue/10 flex items-center gap-4">
                        <button onClick={() => setActiveFile(null)} className="text-jarvis-blue text-[10px] uppercase font-mono hover:underline">← Back</button>
                        <span className="font-mono text-[10px] text-jarvis-blue truncate">{activeFile.name}</span>
                      </div>
                      <pre className="flex-1 p-4 font-mono text-[10px] text-cyan-200/80 overflow-auto code-scrollbar whitespace-pre-wrap leading-relaxed">
                        {activeFile.content}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

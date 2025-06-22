/* eslint-disable */
"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import axios from "axios";

type Message = {
  text: string | string[];
  sender: "user" | "bot";
  spotifyLink?: { song: string; link: string; iframe?: string }[];
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition {
  start: () => void;
  stop: () => void;
  onstart?: () => void;
  onend?: () => void;
  onresult?: (event: any) => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hello! How can I assist you today?", sender: "bot" }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-US";

    let silenceTimer: NodeJS.Timeout;

    recog.onstart = () => {
      setIsListening(true);

      silenceTimer = setTimeout(() => {
        recog.stop(); 
        console.log("Stopped due to silence");
      }, 20000); 
    };

    recog.onresult = async (event: any) => {
      clearTimeout(silenceTimer); 
      const transcript = event.results[0][0].transcript;
      await sendMessage(transcript);
      recog.stop(); 
    };

    recog.onend = () => {
      setIsListening(false);
      clearTimeout(silenceTimer); 
    };

    recog.onerror = (e: any) => {
      console.error("Speech error:", e);
      setIsListening(false);
      clearTimeout(silenceTimer);
    };

    setRecognition(recog);
  } else {
    alert("Speech recognition is not supported on this browser.");
  }
}, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const startListening = () => {
    if (recognition) recognition.start();
  };

  const stopListening = () => {
    if (recognition) recognition.stop();
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMessage: Message = { text, sender: "user" };
    console.log(userMessage)
    setMessages((prev) => [...prev, userMessage]);

    try {
      const botResponses = await fetchBotResponse(text);
      setMessages((prev) => [...prev, ...botResponses]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { text: "Something went wrong. Please try again.", sender: "bot" }
      ]);
    }
  };

  const fetchBotResponse = async (userInput: string): Promise<Message[]> => {
    try {
      const response = await axios.post("/api/chat", { userMessage: userInput });
      const { content, spotifyLinks } = response.data;

      let botMessages: Message[] = [];

      if (Array.isArray(content)) {
        botMessages = content.map((song: { title: string; artist: string }) => ({
          text: `${song.title} - ${song.artist}`,
          sender: "bot",
          spotifyLink: spotifyLinks || []
        }));
      } else {
        botMessages = [
          {
            text: content,
            sender: "bot",
            spotifyLink: spotifyLinks || []
          }
        ];
      }

      return botMessages;
    } catch (error) {
      return [
        {
          text: "Sorry, I am having trouble responding right now.",
          sender: "bot"
        }
      ];
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900   overflow-none">
      <div
        ref={chatRef}
        className="overflow-y-auto p-4 rounded-lg relative h-[84vh] bg-gray-50  w-screen"
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-3 my-2 rounded-xl w-fit max-w-xs ${
              msg.sender === "user"
                ? "bg-black text-white self-end ml-auto shadow-md"
                : "bg-purple-500 text-white shadow-md"
            }`}
          >
            {typeof msg.text === "string" && msg.text.includes("1.") ? (
              <>
                <p>{msg.text.split("\n")[0]}</p>
                <ul className="list-disc list-inside">
                  {msg.text
                    .split("\n")
                    .slice(1)
                    .map((line, idx) => (
                      <li key={idx}>{line.replace(/^\d+\.\s*/, "")}</li>
                    ))}
                </ul>
              </>
            ) : Array.isArray(msg.text) ? (
              msg.text.map((line, idx) => <p key={idx}>{line}</p>)
            ) : (
              <p>{msg.text}</p>
            )}

            {msg.spotifyLink && msg.spotifyLink.length > 0 && (
              <div className="mt-2">
                {msg.spotifyLink.map((song, idx) => (
                  <div key={idx} className="mb-2">
                    {song.iframe && (
                      <div
                        className="mt-1"
                        dangerouslySetInnerHTML={{ __html: song.iframe }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center mt-2">
        <button
          onClick={toggleListening}
          className={`p-5 rounded-full ${isListening ? "bg-red-500" : "bg-purple-500"}`}
        >
          {isListening ? (
            <MicOff size={30} color="white" />
          ) : (
            <Mic size={40} color="white" />
          )}
        </button>
      </div>
    </div>
  );
}

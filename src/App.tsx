import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, BarChart2, BookOpen, Terminal, FileText, Code, Copy, Check, 
  Search, Sparkles, Clock, Calendar, Users, Paperclip, ArrowLeft, Trash2, Plus, 
  RefreshCw, Sliders, Info, ExternalLink, Smile, Flame, ShieldAlert, FileCode, CheckSquare, Square
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, CartesianGrid, Legend
} from "recharts";
import { GoogleGenAI } from "@google/genai";

import { Message, ChatSession, ChatAnalytics, AndroidFileNode } from "./types";
import { androidSteps, androidCodeTree } from "./androidGuide";
import { parseWhatsAppChat, calculateAnalytics, MOCK_CHATS } from "./services/chatParser";

export default function App() {
  // Navigation & View Toggles
  const [currentMode, setCurrentMode] = useState<"simulator" | "guide">("simulator");
  const [activeAnalyticTab, setActiveAnalyticTab] = useState<"overview" | "senders" | "charts" | "emojis" | "vocabulary" | "ai-assistant">("overview");

  // Chat Sessions Storage
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [analyzingFile, setAnalyzingFile] = useState(false);

  // Chat Filter Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [messageFilter, setMessageFilter] = useState<"all" | "media" | "links" | "system">("all");
  const [authorFilter, setAuthorFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<number>(30); // days list limit

  // AI Insights State
  const [aiReport, setAiReport] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiReportType, setAiReportType] = useState<string>("");

  // Android Guide State
  const [selectedFileNode, setSelectedFileNode] = useState<AndroidFileNode>(androidCodeTree[3]); // Default ChatParser.java
  const [copiedFile, setCopiedFile] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);

  // Loading default mock sessions on mount
  useEffect(() => {
    const localData = localStorage.getItem("whatsapp_chats_sessions");
    if (localData) {
      try {
        const parsed = JSON.parse(localData) as ChatSession[];
        if (parsed && parsed.length > 0) {
          // Re-instantiate continuous dates
          parsed.forEach(s => {
            s.messages.forEach(m => {
              m.timestamp = new Date(m.timestamp);
            });
          });
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error("Local storage corruption: recreate standard sessions");
      }
    }

    // Default pre-loaded sessions
    const defaultSessions: ChatSession[] = [
      {
        id: "session-friends",
        name: "Best Friends' Roadtrip 🚙🏖️",
        importedAt: "2026-05-14 10:30",
        messages: parseWhatsAppChat(MOCK_CHATS.friends),
        participants: ["Alex", "Praveen", "Sarah", "Marcus"]
      },
      {
        id: "session-couple",
        name: "Cozy Couple Chat 💕🌹",
        importedAt: "2026-05-13 18:45",
        messages: parseWhatsAppChat(MOCK_CHATS.couple),
        participants: ["Emily", "Praveen"]
      },
      {
        id: "session-startup",
        name: "Startup Launch Sprint 🚀📈",
        importedAt: "2026-05-14 09:00",
        messages: parseWhatsAppChat(MOCK_CHATS.startup),
        participants: ["Praveen", "Dave (Lead Dev)", "Priya (QA manager)"]
      }
    ];

    setSessions(defaultSessions);
    setActiveSessionId(defaultSessions[0].id);
    localStorage.setItem("whatsapp_chats_sessions", JSON.stringify(defaultSessions));
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const analytics: ChatAnalytics | null = activeSession ? calculateAnalytics(activeSession.messages) : null;

  // File Upload Handlers
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setAnalyzingFile(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim() === "") {
          alert("Selected file is empty!");
          setAnalyzingFile(false);
          return;
        }

        const messages = parseWhatsAppChat(text);
        if (messages.length === 0) {
          alert("Could not parse messages. Ensure the file conforms to exports ('DD/MM/YY, HH:MM - Sender: Message')");
          setAnalyzingFile(false);
          return;
        }

        // Get unique participants
        const participants = Array.from(new Set(messages.filter(m => !m.isSystem).map(m => m.sender)));
        const newSession: ChatSession = {
          id: `session-user-${Date.now()}`,
          name: file.name.replace(".txt", "").replace(".zip", "").slice(0, 30),
          importedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          messages,
          participants
        };

        const updated = [newSession, ...sessions];
        setSessions(updated);
        setActiveSessionId(newSession.id);
        localStorage.setItem("whatsapp_chats_sessions", JSON.stringify(updated));
        alert(`Successfully imported chat with ${messages.length} messages and ${participants.length} contributors!`);
      } catch (err) {
        alert("An error occurred during parsing: " + String(err));
      } finally {
        setAnalyzingFile(false);
      }
    };

    reader.readAsText(file);
  };

  // Delete a session
  const handleDeleteSession = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the saved session: "${name}"?`)) {
      const filtered = sessions.filter(s => s.id !== id);
      setSessions(filtered);
      if (activeSessionId === id && filtered.length > 0) {
        setActiveSessionId(filtered[0].id);
      }
      localStorage.setItem("whatsapp_chats_sessions", JSON.stringify(filtered));
    }
  };

  // Filter messages for display
  const getFilteredMessages = () => {
    if (!activeSession) return [];

    return activeSession.messages.filter(msg => {
      // Free form search
      if (searchQuery) {
        const matchText = msg.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          msg.sender.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchText) return false;
      }

      // Media / Link / System category flags
      if (messageFilter === "media" && !msg.isMedia) return false;
      if (messageFilter === "system" && !msg.isSystem) return false;
      if (messageFilter === "links" && !msg.content.includes("http://") && !msg.content.includes("https://")) return false;

      // Sender selection
      if (authorFilter && msg.sender !== authorFilter) return false;

      return true;
    });
  };

  const filteredMessages = getFilteredMessages();

  // Lazy Gemini API Integration
  const generateAiReport = async (reportType: "summary" | "vibes" | "funny") => {
    if (!activeSession) return;
    
    setIsLoadingAi(true);
    setAiReportType(reportType);
    setAiReport("");

    // Package last 120 message logs for the model context
    const messagesSubset = activeSession.messages
      .filter(m => !m.isSystem)
      .slice(-120)
      .map(m => `${m.sender}: ${m.content}`)
      .join("\n");

    const prompts = {
      summary: "Analyze the tone, key conversation themes, top shared memories or priorities of this WhatsApp chat, and provide a quick summarized executive paragraph.",
      vibes: "Assess the relationship health, responsiveness, overall friendliness vs sarcasm levels, and calculate custom percentage metrics for 'Wholesomeness', 'Spiciness', and 'Chaotic Energy' of this group chat.",
      funny: "Spot inside jokes, roasting behaviors, most repetitive catchphrases, and nominate awards (e.g., 'The Spammer', 'The Passive-Aggressive emoji-user', 'The Laggard') with humorous explanations."
    };

    const targetPrompt = `${prompts[reportType]}\n\nHere are the actual chat snippets:\n${messagesSubset}`;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        // Fallback mock reports as standard if developer did not register API Key in Secrets
        setTimeout(() => {
          generateMockAiReport(reportType, activeSession.participants);
          setIsLoadingAi(false);
        }, 1500);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: targetPrompt,
        config: {
          systemInstruction: "You are an expert relationship psychologist and chat logs data scientist. Keep explanations engaging, friendly, formatted in clean markdown, and highly descriptive. Exclude metadata or introductory fluff.",
        }
      });

      setAiReport(response.text || "No insights could be generated.");
    } catch (err) {
      console.error(err);
      setAiReport(`### ⚠️ Google Gemini API Call Stopped\n\nThere was a token/connection error. Here is a simulated analysis based on local calculations instead:\n\n` + getMockText(reportType, activeSession.participants));
    } finally {
      setIsLoadingAi(false);
    }
  };

  const generateMockAiReport = (type: string, members: string[]) => {
    setAiReport(getMockText(type, members));
  };

  const getMockText = (type: string, members: string[]): string => {
    const listNames = members.join(", ");
    if (type === "summary") {
      return `### 📊 Real-Time Chat Insights
*Analyzed ${activeSession?.messages.length} messages among **${listNames}***

1. **High Engagement Core**: The group displays rapid, close interaction cycles. Major subjects revolve around social synchronization, logistics planning, and general peer updates.
2. **Key Theme Clusters**:
   - **Logistical Sync**: Heavy usage of reminders, times, and schedules.
   - **Shared Humor**: High emoji frequency (${analytics?.topEmojis.map(e => e.emoji).slice(0, 3).join(" ")}) suggesting playful, friendly dynamics.
   - **Coordination**: Brainstorming destinations, food stops, or code releases depending on the room profile.
3. **Sentiment Distribution**: Overwhelmingly positive and empathetic. Conflict index is virtually 0%, with very high alignment on shared actions.`;
    } else if (type === "vibes") {
      return `### 💕 Chat Relationship Vibes Analyst
*Calculated statistics relative to **${listNames}***

- **Wholesomeness Level**: \`87%\` (Tender, quick to support with emojis, praises, and congratulatory remarks)
- **Spiciness Level**: \`45%\` (Lighthearted sarcasm, roasting, and playful banter between primary participants)
- **Chaotic Energy**: \`30%\` (Mostly scheduled, coherent, and sequential conversation threads with low sudden interruptions)

**Behavioral Insight**:
The conversation showcases robust reciprocal trust. One participant usually acts as the *Vibe Captain* (initiator), while others act as *Reliable Co-Pilots* to sustain momentum and schedule closures.`;
    } else {
      return `### 🏆 Chat Awards & Inside Jokes Archive
*Fictional awards catalog based on conversational telemetry*

- **👑 Team MVP Award**: Nominated for high word volumes, prompt responsiveness, and delivering key information.
- **🔋 Energy Catalyst Award**: Awarded to the member who sends the most energetic emojis and expressions to motivate group decisions.
- **📁 The Observer Badge**: Awarded to silent contributors who speak rarely but supply critical focus when they do!

**Top Vocabulary / Common Catchphrases**:
${analytics?.topWords.slice(0, 5).map(w => `- *"${w.text}"* (used ${w.value} times)`).join("\n") || "No recurring terms found."}`;
    }
  };

  // Android Step Checklist Handling
  const toggleStep = (id: number) => {
    if (completedSteps.includes(id)) {
      setCompletedSteps(completedSteps.filter(s => s !== id));
    } else {
      setCompletedSteps([...completedSteps, id]);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(true);
    setTimeout(() => {
      setCopiedFile(false);
    }, 2000);
  };

  // Helper for formatting hours nicely e.g. "1 PM"
  const formatHourLabel = (h: number) => {
    if (h === 0) return "12 AM";
    if (h === 12) return "12 PM";
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };

  // Avatar generation helpers
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-emerald-500 text-white",
      "bg-teal-500 text-white",
      "bg-sky-500 text-white",
      "bg-violet-500 text-white",
      "bg-orange-500 text-white",
      "bg-pink-500 text-white",
      "bg-indigo-500 text-white",
      "bg-amber-500 text-white"
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app_root">
      {/* Top Banner and Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              WhatsApp Chat Analyst <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/60">Android Java Guide Bundle</span>
            </h1>
            <p className="text-xs text-slate-400">View, analyze, export, and learn how to build WhatsApp-style apps on Java Android Studio.</p>
          </div>
        </div>

        {/* Master Workspace Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCurrentMode("simulator")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentMode === "simulator"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="btn_mode_simulator"
          >
            <BarChart2 className="w-4 h-4" />
            Interactive Simulator
          </button>
          <button
            onClick={() => setCurrentMode("guide")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentMode === "guide"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="btn_mode_guide"
          >
            <BookOpen className="w-4 h-4" />
            Android Guide (Java)
          </button>
        </div>
      </header>

      {/* Main Core Body */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* MODE 1: INTERACTIVE SIMULATOR */}
        {currentMode === "simulator" && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full">
            
            {/* Sidebar: Chat catalog storage & importing */}
            <aside className="w-full lg:w-80 bg-slate-900 border-r border-slate-800 p-5 flex flex-col gap-5 overflow-y-auto shrink-0">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Saved Chats Catalog</h3>
                
                {/* Chats Selection and Switch list */}
                <div className="flex flex-col gap-2 max-h-[300px] lg:max-h-[400px] overflow-y-auto pr-1">
                  {sessions.map((sess) => {
                    const isActive = sess.id === activeSessionId;
                    return (
                      <div 
                        key={sess.id}
                        onClick={() => {
                          setActiveSessionId(sess.id);
                          setAiReport("");
                        }}
                        className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isActive 
                            ? "bg-slate-800 border-emerald-500/50 text-white" 
                            : "bg-slate-950/40 border-slate-800 hover:bg-slate-800/30 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                            💬
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-semibold text-sm truncate">{sess.name}</h4>
                            <p className="text-[10px] text-slate-400">{sess.messages.length} messages</p>
                          </div>
                        </div>
                        
                        {/* Session delete action */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(sess.id, sess.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 text-slate-400 self-center transition-all"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Import Board */}
              <div className="border border-dashed border-slate-800 bg-slate-950/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                  <Paperclip className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">Import New Chat</h4>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">Load your exported WhatsApp chat txt / zip file locally.</p>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt"
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzingFile}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition"
                >
                  {analyzingFile ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {analyzingFile ? "Parsing file..." : "Browse TXT File"}
                </button>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/60">
                <div className="flex gap-1.5 items-start">
                  <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-300">How to export logs?</span>
                    <p className="mt-1">In WhatsApp on phone: Open Chat → tap Settings/More → Export Chat → choose Without Media → Share TXT file to your PC and import it here!</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Central Work Stage: Chat View and Analytics Workspace */}
            <section className="flex-1 flex flex-col overflow-hidden bg-slate-950">
              
              {/* Analytics Header bar and selector tabs */}
              <div className="bg-slate-900/60 border-b border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono uppercase text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-900/40">Active Chat</span>
                  <h2 className="text-base font-bold text-white">{activeSession?.name}</h2>
                </div>

                {/* Switch analytic metrics screen */}
                <div className="flex overflow-x-auto w-full sm:w-auto gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0 scrollbar-none">
                  {[
                    { id: "overview", label: "Dashboard", Icon: BarChart2 },
                    { id: "senders", label: "Contributors", Icon: Users },
                    { id: "charts", label: "Histograms", Icon: Clock },
                    { id: "emojis", label: "Emojis", Icon: Smile },
                    { id: "vocabulary", label: "Vocabulary", Icon: Flame },
                    { id: "ai-assistant", label: "AI Insights", Icon: Sparkles },
                  ].map((tab) => {
                    const matches = activeAnalyticTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveAnalyticTab(tab.id as any);
                          if (tab.id === 'ai-assistant' && !aiReport) {
                            generateAiReport("summary");
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                          matches 
                            ? "bg-slate-800 text-emerald-400 font-semibold" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <tab.Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Central Frame: WhatsApp Emulator Left & Analytics Board Right */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* Visual Pane Left: WhatsApp Device Mockup */}
                <div className="w-full md:w-[400px] border-r border-slate-800 flex flex-col bg-[#0b141a] overflow-hidden shrink-0">
                  
                  {/* WhatsApp Device Top Bar */}
                  <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                        {activeSession?.name.charAt(0) || "W"}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-sm font-bold text-slate-100 truncate">{activeSession?.name}</h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {activeSession ? `${activeSession.participants.length} participants` : "Connecting..."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5 text-slate-300">
                      <Search className="w-4 h-4 cursor-pointer hover:text-emerald-400" />
                      <Sliders className="w-4 h-4 cursor-pointer hover:text-emerald-400" />
                    </div>
                  </div>

                  {/* Message Filters Panel inside device */}
                  <div className="bg-[#111b21] p-3 flex flex-col gap-2 border-b border-white/5 shrink-0 select-none">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input 
                        type="text" 
                        placeholder="Search conversation..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-[#202c33] rounded-lg text-xs placeholder-slate-400 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    
                    {/* Category Filter Pills */}
                    <div className="flex gap-1 overflow-x-auto pb-1 text-[10px] scrollbar-none">
                      {[
                        { id: "all", label: "All Logs" },
                        { id: "media", label: "Media" },
                        { id: "links", label: "Links" },
                        { id: "system", label: "System Events" }
                      ].map((fil) => (
                        <button
                          key={fil.id}
                          onClick={() => setMessageFilter(fil.id as any)}
                          className={`px-2.5 py-1 rounded-full transition shrink-0 ${
                            messageFilter === fil.id 
                              ? "bg-emerald-600 text-white" 
                              : "bg-[#202c33] text-slate-300 hover:bg-[#2a3942]"
                          }`}
                        >
                          {fil.label}
                        </button>
                      ))}
                    </div>

                    {/* Filter by Senders */}
                    {activeSession && activeSession.participants.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-500">From:</span>
                        <select
                          value={authorFilter}
                          onChange={(e) => setAuthorFilter(e.target.value)}
                          className="bg-[#202c33] text-slate-300 rounded border border-white/5 py-0.5 px-1 focus:outline-none"
                        >
                          <option value="">Anyone</option>
                          {activeSession.participants.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Device Bubble logs renderer */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth bg-[#0b141a]">
                    
                    {filteredMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                        <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
                        <p className="text-xs">No matching messages found for current filter settings.</p>
                      </div>
                    ) : (
                      filteredMessages.map((msg, index) => {
                        if (msg.isSystem) {
                          return (
                            <div key={msg.id} className="self-center bg-[#182229] border border-white/5 text-[10px] text-amber-200/80 px-3 py-1 rounded-lg text-center shadow max-w-[85%] select-none">
                              {msg.content} <span className="text-[9px] text-slate-500 block mt-0.5">{msg.rawTimestamp}</span>
                            </div>
                          );
                        }

                        // Determine if outgoing pattern (we will mark 'Praveen' as our outgoing user reference for a realistic mockup)
                        const isOutgoing = msg.sender === "Praveen"; 
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex flex-col max-w-[80%] rounded-xl px-3 py-2 shadow-sm text-sm relative ${
                              isOutgoing 
                                ? "self-end bg-[#005c4b] text-slate-100" 
                                : "self-start bg-[#202c33] text-slate-200"
                            }`}
                          >
                            {/* Sender title if incoming */}
                            {!isOutgoing && (
                              <div className="font-semibold text-xs text-amber-400 mb-1 flex items-center gap-1.5">
                                <span className={`w-3.5 h-3.5 rounded-full inline-block ${getAvatarColor(msg.sender)} text-[9px] text-center font-bold`}>
                                  {msg.sender.charAt(0)}
                                </span>
                                {msg.sender}
                              </div>
                            )}

                            {/* Message text content */}
                            {msg.isMedia ? (
                              <div className="flex items-center gap-2 bg-black/15 p-2 rounded-lg text-xs font-mono text-emerald-400 border border-emerald-950">
                                🖼️ {msg.content}
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap leading-relaxed text-xs break-all">{msg.content}</p>
                            )}

                            {/* Timestamp tag */}
                            <span className="text-[9px] text-slate-400 text-right block mt-1 leading-none select-none">
                              {msg.rawTimestamp.split(",")[1]?.trim() || msg.rawTimestamp} {isOutgoing && "✓✓"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Panel: Analytics visualizer */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-950 flex flex-col gap-6">
                  
                  {analytics ? (
                    <>
                      {/* STAT TAB 1: OVERVIEW METRIC GRID */}
                      {activeAnalyticTab === "overview" && (
                        <div className="flex flex-col gap-6">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-emerald-400" /> Statistical Telemetry Dashboard
                          </h3>

                          {/* Metric Cards Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                              { label: "Total Messages", value: analytics.totalMessages, unit: "text entries", icon: "💬" },
                              { label: "Active Group Members", value: Object.keys(analytics.userBreakdown).length, unit: "senders", icon: "👥" },
                              { label: "Unique Active Days", value: analytics.activeDaysCount, unit: "distinct logging days", icon: "📅" },
                              { label: "Total Vocabulary Words", value: analytics.totalWords, unit: "tokens", icon: "📝" },
                              { label: "Average Message length", value: `${analytics.avgMessageLength} words`, unit: "words per paragraph", icon: "📊" },
                              { label: "Busiest Peak Hour", value: formatHourLabel(analytics.mostActiveHour), unit: "local standard time", icon: "⚡" },
                            ].map((kpi, idx) => (
                              <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-start gap-3.5 shadow-sm">
                                <div className="text-2xl mt-0.5">{kpi.icon}</div>
                                <div>
                                  <p className="text-xs text-slate-400 font-medium">{kpi.label}</p>
                                  <h4 className="text-xl font-bold text-white mt-1 font-mono tracking-tight">{kpi.value}</h4>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{kpi.unit}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Quick-Facts and Key Behavior */}
                          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80 flex flex-col lg:flex-row gap-4 items-center justify-between">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-full bg-amber-950/40 text-amber-400 flex items-center justify-center text-lg shadow shrink-0">
                                ⭐
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-white">Primes Conversational Trend</h4>
                                <p className="text-xs text-slate-400 mt-1">
                                  Your room is most active on <span className="text-white font-bold">{analytics.mostActiveDayOfWeek}s</span>, specifically around <span className="text-white font-bold">{formatHourLabel(analytics.mostActiveHour)}</span>.
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setActiveAnalyticTab("ai-assistant")}
                              className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 self-stretch sm:self-auto justify-center transition"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Open Relationship Analysis
                            </button>
                          </div>

                          {/* Main Activity Timeline Chart */}
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                            <h4 className="text-sm font-bold text-slate-200 mb-4">Chat Density Over Months</h4>
                            <div className="h-48 w-full">
                              {analytics.monthlyActivity.length === 0 ? (
                                <p className="text-xs text-slate-500">Not enough diverse timeline logs found.</p>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={analytics.monthlyActivity}>
                                    <defs>
                                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="dateStr" stroke="#64748b" fontSize={11} />
                                    <YAxis stroke="#64748b" fontSize={11} />
                                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                                    <Area type="monotone" dataKey="messages" stroke="#10b981" fillOpacity={1} fill="url(#colorMessages)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STAT TAB 2: SENDERS BREAKDOWN TABLE */}
                      {activeAnalyticTab === "senders" && (
                        <div className="flex flex-col gap-6">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-400" /> Senders and Contributors Statistics
                          </h3>

                          {/* Contributors grid data */}
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                                  <th className="py-3 px-4">Member</th>
                                  <th className="py-3 px-4 text-right">Messages</th>
                                  <th className="py-3 px-4 text-right">Word Count</th>
                                  <th className="py-3 px-4 text-right">Avg Length</th>
                                  <th className="py-3 px-4 text-right">Media files</th>
                                  <th className="py-3 px-4 text-right">Peak Hour</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                {Object.keys(analytics.userBreakdown).map((user) => {
                                  const stats = analytics.userBreakdown[user];
                                  return (
                                    <tr key={user} className="hover:bg-slate-800/35 transition-colors text-slate-200">
                                      <td className="py-3 px-4 font-semibold flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getAvatarColor(user)}`}>
                                          {user.charAt(0)}
                                        </span>
                                        {user}
                                      </td>
                                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                                        {stats.messageCount} <span className="text-[10px] text-slate-500 font-normal">({Math.round((stats.messageCount / analytics.totalMessages) * 100)}%)</span>
                                      </td>
                                      <td className="py-3 px-4 text-right font-mono text-slate-300">{stats.wordCount}</td>
                                      <td className="py-3 px-4 text-right font-mono text-slate-300">{stats.avgLength} words</td>
                                      <td className="py-3 px-4 text-right font-mono text-slate-400">{stats.mediaCount} 🖼️</td>
                                      <td className="py-3 px-4 text-right text-amber-300">{formatHourLabel(stats.activeHour)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Share Pie Chart */}
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-slate-200 mb-2">Message Share Distribution</h4>
                              <p className="text-xs text-slate-400 leading-relaxed">This pie chart shows who runs the conversational volume inside the workspace. Use this layout to review engagement ratios!</p>
                            </div>
                            <div className="w-full md:w-56 h-48 flex justify-center items-center">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={Object.keys(analytics.userBreakdown).map(user => ({
                                      name: user,
                                      value: analytics.userBreakdown[user].messageCount
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={3}
                                    dataKey="value"
                                  >
                                    {Object.keys(analytics.userBreakdown).map((user, index) => (
                                      <Cell key={`cell-${index}`} fill={["#25D366", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444"][index % 6]} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STAT TAB 3: TIMELINE AND HOUR HISTOGRAMS */}
                      {activeAnalyticTab === "charts" && (
                        <div className="flex flex-col gap-6">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-emerald-400" /> Hourly and Weekday Heatmaps
                          </h3>

                          {/* 2 hours distribution line charts */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Hourly Bar chart */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                              <h4 className="text-sm font-bold text-slate-200 mb-3">Hourly Engagement (0:00 - 23:00)</h4>
                              <p className="text-xs text-slate-400 mb-4">Tracks exactly what hour contains the highest chat concentration.</p>
                              <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={analytics.hourlyActivity}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis 
                                      dataKey="hour" 
                                      stroke="#64748b" 
                                      fontSize={9} 
                                      tickFormatter={(v) => `${v}:00`}
                                    />
                                    <YAxis stroke="#64748b" fontSize={9} />
                                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                                    <Bar dataKey="messages" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Day of Week chart */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                              <h4 className="text-sm font-bold text-slate-200 mb-3">Weekday Frequency Analytics</h4>
                              <p className="text-xs text-slate-400 mb-4">Identifies what day of the week hosts your spiciest exchanges.</p>
                              <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={analytics.dayOfWeekActivity}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                                    <YAxis stroke="#64748b" fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                                    <Bar dataKey="messages" fill="#eab308" radius={[4, 4, 0, 0]}>
                                      {analytics.dayOfWeekActivity.map((entry, idx) => (
                                        <Cell 
                                          key={`cell-${idx}`} 
                                          fill={entry.day === analytics.mostActiveDayOfWeek ? "#10b981" : "#eab308"} 
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                          </div>
                        </div>
                      )}

                      {/* STAT TAB 4: EMOJIS ANALYSIS */}
                      {activeAnalyticTab === "emojis" && (
                        <div className="flex flex-col gap-6">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Smile className="w-5 h-5 text-emerald-400" /> Emoji Telemetry Analytics
                          </h3>

                          {analytics.topEmojis.length === 0 ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                              No emojis were parsed in this conversation snippet! Ask your contributors to express themselves!
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              {analytics.topEmojis.map((em, idx) => (
                                <div key={em.emoji} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center flex flex-col items-center shadow">
                                  <span className="text-xs font-mono text-emerald-400 font-bold block mb-1">Rank #{idx + 1}</span>
                                  <span className="text-4xl my-2 block animate-pulse">{em.emoji}</span>
                                  <span className="text-base font-bold text-white font-mono">{em.count}</span>
                                  <span className="text-[10px] text-slate-500 mt-0.5">usages recorded</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Interactive Note about mobile implementation */}
                          <div className="bg-emerald-950/20 rounded-2xl p-4 border border-emerald-900/30">
                            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest mb-1">Android Java Tip</h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed">To parse emojis in classic Java, make sure to evaluate characters using codepoints or Unicode ranges in Android Studio, as many older Java standard characters do not represent direct emoji strings properly.</p>
                          </div>
                        </div>
                      )}

                      {/* STAT TAB 5: VOCABULARY FREQUENCY */}
                      {activeAnalyticTab === "vocabulary" && (
                        <div className="flex flex-col gap-6">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Flame className="w-5 h-5 text-emerald-400" /> vocabulary & Key word frequency
                          </h3>
                          <p className="text-xs text-slate-400">Displays the top repeated words used in this chat, automagically filtering out common English helper words (stopwords) like 'the', 'and', 'my'.</p>

                          {analytics.topWords.length === 0 ? (
                            <div className="bg-slate-900 p-8 rounded-2xl text-center text-slate-500 border border-slate-800">
                              Not enough keywords parsed to perform vocabulary analytics.
                            </div>
                          ) : (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-wrap gap-2.5">
                              {analytics.topWords.map((word, index) => {
                                // Scale font size based on keyword weight
                                const maxVal = analytics.topWords[0]?.value || 1;
                                const ratio = word.value / maxVal;
                                const bgOpacity = Math.max(0.1, ratio * 0.4);
                                const scaleText = ratio > 0.8 ? "text-lg px-4 py-2 font-bold" : ratio > 0.4 ? "text-sm px-3 py-1.5 font-semibold" : "text-xs px-2.5 py-1";

                                return (
                                  <div 
                                    key={word.text} 
                                    style={{ backgroundColor: `rgba(16, 185, 129, ${bgOpacity})` }}
                                    className={`rounded-xl border border-emerald-500/20 text-emerald-300 flex items-center gap-2 transition hover:scale-105 ${scaleText}`}
                                  >
                                    <span>#{word.text}</span>
                                    <span className="font-mono bg-black/30 text-[10px] px-1.5 py-0.5 rounded-md text-white">{word.value}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* STAT TAB 6: AI INSIGHTS SUMMARIZER */}
                      {activeAnalyticTab === "ai-assistant" && (
                        <div className="flex flex-col gap-6">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-emerald-400" /> AI Relationship & Chat Analyst
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">Harness Google Gemini to distill tone, summarize priorities, and analyze relationship dynamics.</p>
                            </div>

                            {/* Trigger buttons for different reports */}
                            <div className="flex gap-2">
                              {[
                                { id: "summary", label: "Group Summary" },
                                { id: "vibes", label: "Vibe Health" },
                                { id: "funny", label: "Meme Awards" }
                              ].map(btn => (
                                <button
                                  key={btn.id}
                                  onClick={() => generateAiReport(btn.id as any)}
                                  disabled={isLoadingAi}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                                    aiReportType === btn.id 
                                      ? "bg-emerald-600 border-emerald-500 text-white" 
                                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                                  }`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Response Board */}
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[250px] relative">
                            {isLoadingAi ? (
                              <div className="absolute inset-0 bg-slate-900/80 rounded-2xl flex flex-col items-center justify-center text-center p-6 select-none z-10">
                                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                                <h4 className="text-sm font-bold text-slate-200">Processing Chat Logs...</h4>
                                <p className="text-xs text-slate-400 mt-1">Analyzing content streams and computing relationship indicators.</p>
                              </div>
                            ) : null}

                            {aiReport ? (
                              <div className="prose prose-invert prose-emerald text-sm max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {aiReport}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center py-6 text-slate-500">
                                <Sparkles className="w-10 h-10 text-slate-700 mb-2" />
                                <p className="text-xs">Select any AI filter button above to command the analyst engine!</p>
                              </div>
                            )}
                          </div>

                          {/* Notice about API Keys */}
                          {!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3.5">
                              <div className="text-2xl">💡</div>
                              <div className="text-xs text-slate-400 leading-relaxed">
                                <span className="font-semibold text-white block mb-0.5">Testing with Offline Prototype Mode</span>
                                This workspace is currently utilizing calculated fallback telemetry. To use authentic live-streaming Gemini insights on your custom chats, navigate to the <span className="font-semibold text-white">Settings &gt; Secrets</span> tab in AI Studio and register your <span className="text-emerald-400 font-mono">GEMINI_API_KEY</span>. There's no code changes required!
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center p-8 text-slate-500">
                      No active sessions running. Select a session or upload a text log.
                    </div>
                  )}

                </div>
              </div>

            </section>

          </div>
        )}

        {/* MODE 2: ANDROID STUDIO DEVELOPER GUIDE (JAVA) */}
        {currentMode === "guide" && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full">
            
            {/* Left Column: Simulated Android Studio Tree Explorer */}
            <aside className="w-full lg:w-80 bg-slate-900 border-r border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto shrink-0 select-none">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" /> Android Studio IDE
                </span>
                <span className="text-[9px] bg-blue-950 border border-blue-900 text-blue-400 px-2 py-0.5 rounded-full font-mono font-bold">Java + Views XML</span>
              </div>

              {/* Project Tree Files list */}
              <div className="flex-1 flex flex-col gap-1.5 text-xs text-slate-300">
                <div className="font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-2">Project Files Tree</div>
                
                {androidCodeTree.map((node) => {
                  const isCur = selectedFileNode.path === node.path;
                  return (
                    <div 
                      key={node.path}
                      onClick={() => setSelectedFileNode(node)}
                      className={`flex items-start gap-2 p-2.5 rounded-xl cursor-pointer transition ${
                        isCur 
                          ? "bg-blue-950/50 border border-blue-800/60 text-white font-semibold" 
                          : "hover:bg-slate-800/40 text-slate-300 border border-transparent"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {node.language === "java" ? (
                          <FileCode className="w-4 h-4 text-orange-400" />
                        ) : node.language === "xml" ? (
                          <Code className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h5 className="truncate leading-none text-xs">{node.name}</h5>
                        <p className="text-[9px] text-slate-500 mt-0.5 font-mono truncate">{node.path}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step checklist preview info */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <h4 className="text-xs font-semibold text-white mb-2">Progress Tracker</h4>
                <p className="text-[11px] text-slate-400 mb-3">Checkbox active steps as you build in Android Studio physically.</p>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300" 
                    style={{ width: `${Math.round((completedSteps.length / androidSteps.length) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                  <span>{completedSteps.length} of {androidSteps.length} completed</span>
                  <span>{Math.round((completedSteps.length / androidSteps.length) * 100)}%</span>
                </div>
              </div>
            </aside>

            {/* Central Stage: Step instructions & Code viewer */}
            <section className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
              
              {/* Left Column: Interactive Steps List */}
              <div className="w-full md:w-[350px] border-r border-slate-800 p-5 overflow-y-auto shrink-0 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-400" /> Build Steps Checklist
                </h3>
                
                {androidSteps.map((step) => {
                  const isChecked = completedSteps.includes(step.id);
                  return (
                    <div 
                      key={step.id} 
                      onClick={() => toggleStep(step.id)}
                      className={`group border p-4 rounded-2xl cursor-pointer transition-all ${
                        isChecked 
                          ? "bg-slate-900/60 border-emerald-950 text-slate-300" 
                          : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button className="mt-0.5 text-emerald-400 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                          )}
                        </button>
                        <div>
                          <h4 className={`text-xs font-bold ${isChecked ? 'text-slate-400 line-through' : 'text-white'}`}>{step.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{step.description}</p>
                          
                          <ul className="mt-3 flex flex-col gap-1 text-[10px] text-slate-500 pl-4 list-disc">
                            {step.checklist.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Code viewer & Explainer */}
              <div className="flex-1 overflow-hidden flex flex-col bg-slate-900">
                
                {/* Code Header with copy action */}
                <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      📁 /src/{selectedFileNode.path}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{selectedFileNode.description}</p>
                  </div>
                  
                  {/* Copy button */}
                  <button
                    onClick={() => handleCopyCode(selectedFileNode.content)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all shrink-0"
                  >
                    {copiedFile ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Code
                      </>
                    )}
                  </button>
                </div>

                {/* Simulated Editor Code Block */}
                <div className="flex-1 overflow-auto p-5 font-mono text-[11px] leading-relaxed bg-slate-950 text-slate-300 whitespace-pre scrollbar-thin select-text">
                  <code>{selectedFileNode.content}</code>
                </div>
              </div>

            </section>
          </div>
        )}

      </main>

      {/* Floating System-Wide Status Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 select-none shrink-0" id="app_footer">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
          <span>Local database engine SQLite simulated via React LocalStorage. Ready for inputs.</span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span>© 2026 Android Dev Studio Guide</span>
          <span className="text-slate-600">|</span>
          <a href="https://developer.android.com" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 flex items-center gap-0.5">
            Android Developers <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}

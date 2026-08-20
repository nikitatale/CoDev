import './App.css'
import { Editor } from "@monaco-editor/react"
import { MonacoBinding } from "y-monaco"
import { useRef, useMemo, useState, useEffect } from 'react'
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { io } from "socket.io-client";
import { Braces, Users, Copy, LogOut, Circle, Menu, X, Check } from "lucide-react";


const COLORS = ["#fb923c", "#fbbf24", "#a3e635", "#34d399", "#22d3ee", "#818cf8", "#c084fc", "#f472b6"];
function colorFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

const LANGUAGES = ["javascript", "typescript", "python", "html", "css", "json", "cpp"];
const SERVER_URL = "http://localhost:5000";

function App() {
  const editorRef = useRef(null);
  const socketRef = useRef(null);

  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || "";
  });

  const [users, setUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [language, setLanguage] = useState("javascript");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  const handleMount = (editor) => {
    editorRef.current = editor;
    new MonacoBinding(yText, editorRef.current.getModel(), new Set([editorRef.current]));
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const name = e.target.username.value.trim();
    if (!name) return;
    setUsername(name);
    window.history.pushState({}, "", "?username=" + encodeURIComponent(name));
  };

  const handleLeave = () => {
    if (socketRef.current) {
      socketRef.current.emit("leave-room");
    }
    setUsername("");
    window.history.pushState({}, "", window.location.pathname);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    if (!username) return;

    // 1. Yjs provider - purely for editor content sync
    const provider = new SocketIOProvider(SERVER_URL, "monaco", ydoc, {
      autoConnect: true,
    });
    provider.on("status", ({ status }) => setConnected(status === "connected"));

    // 2. Dedicated socket - purely for presence (online users list)
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", { username });
    });

    socket.on("users-update", (userList) => {
      setUsers(userList.map((u) => ({ ...u, color: colorFromName(u.username) })));
    });

    function handleBeforeUnload() {
      socket.emit("leave-room");
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      socket.emit("leave-room");
      socket.disconnect();
      provider.disconnect();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [username]);

 
  if (!username) {
    return (
      <div className="h-screen w-full bg-gray-950 relative overflow-hidden flex items-center justify-center p-4">
        
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl" />

        <form
          onSubmit={handleJoin}
          className="relative z-10 w-full max-w-sm bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5"
        >
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Braces className="text-white" size={26} />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-400 to-fuchsia-400 bg-clip-text text-transparent">CoDev</h1>
            <p className="text-gray-400 text-sm mt-1">Real-time collaborative code editor</p>
          </div>

          <div className="w-full">
            <input
              type="text"
              placeholder="Enter your username"
              name="username"
              autoFocus
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/60 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full p-3 cursor-pointer rounded-lg bg-gradient-to-r from-rose-500 to-fuchsia-600 hover:opacity-90 text-white font-semibold transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
          >
            Join Editor <Braces size={18} />
          </button>

          <p className="text-xs text-gray-500 text-center">
            Enter a name to join the room and start coding together in real time.
          </p>
        </form>
      </div>
    );
  }

 
  return (
    <main className="h-screen w-full bg-gray-950 flex flex-col overflow-hidden">

      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden text-gray-300"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center shadow-md shadow-rose-500/20">
            <Braces className="text-white" size={16} />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-rose-400 to-fuchsia-400 bg-clip-text text-transparent hidden sm:block">CoDev</span>

          <span className="hidden sm:flex items-center gap-1.5 ml-2 text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700">
            <Circle size={8} className={connected ? "text-emerald-400 fill-emerald-400" : "text-red-400 fill-red-400"} />
            <span className="text-gray-300">{connected ? "Connected" : "Connecting..."}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-gray-800 border border-gray-700 cursor-pointer text-gray-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span className="hidden sm:inline cursor-pointer">{copied ? "Copied!" : "Invite"}</span>
          </button>

          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 text-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg px-3 py-1.5 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline cursor-pointer">Leave</span>
          </button>
        </div>
      </header>

   
      <div className="flex flex-1 gap-3 p-3 overflow-hidden relative">
        
        <aside
          className={`
            bg-gray-900 border border-gray-800 rounded-xl flex flex-col
            w-64 md:w-1/5 md:static md:flex
            fixed top-16 left-3 bottom-3 z-20 transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-[120%] md:translate-x-0"}
          `}
        >
          <div className="flex items-center gap-2 p-4 border-b border-gray-800">
            <Users size={18} className="text-rose-400" />
            <h2 className="text-white font-semibold">Online — {users.length}</h2>
          </div>
          <ul className="p-3 flex flex-col gap-2 overflow-y-auto">
            {users.length === 0 && (
              <p className="text-gray-500 text-sm px-2">No one else here yet.</p>
            )}
            {users.map((user) => (
              <li
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 transition-colors"
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-gray-950 shrink-0"
                  style={{ backgroundColor: user.color || "#fb7185" }}
                >
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-gray-200 text-sm truncate">
                  {user.username} {user.username === username && <span className="text-gray-500">(you)</span>}
                </span>
              </li>
            ))}
          </ul>
        </aside>

     
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

   
        <section className="flex-1 bg-neutral-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
            <span className="text-gray-400 text-xs ml-2">main.{language === "python" ? "py" : language === "cpp" ? "cpp" : "js"}</span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={language}
              defaultValue="// start typing... changes sync live with everyone in the room 🚀"
              theme="vs-dark"
              onMount={handleMount}
              options={{
                fontSize: 14,
                minimap: { enabled: true },
                padding: { top: 12 },
                smoothScrolling: true,
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
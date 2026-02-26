"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Globe,
  Zap,
  Clock,
  Database,
  Code,
  Image as ImageIcon,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import DotFabric from "./components/DotFabric";


interface Pair {
  key: string;
  value: string;
  enabled: boolean;
}

function KeyValueInput({
  pairs = [],
  setPairs,
  title,
}: {
  pairs: any[];
  setPairs: (p: any[]) => void;
  title: string;
}) {
  const addPair = () =>
    setPairs([...pairs, { key: "", value: "", enabled: true }]);
  const removePair = (index: number) =>
    setPairs(pairs.filter((_, i) => i !== index));
  const updatePair = (index: number, field: string, val: any) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: val };
    setPairs(newPairs);
  };

  return (
    <div className="space-y-2 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {title}
        </h3>
        <button
          onClick={addPair}
          className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition px-2 py-1 rounded hover:bg-blue-400/10"
        >
          <Plus size={14} /> Add Row
        </button>
      </div>

      {/* Safe mapping with optional chaining */}
      {pairs?.map((pair, index) => (
        <div
          key={index}
          className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <input
            type="checkbox"
            checked={pair.enabled}
            onChange={(e) => updatePair(index, "enabled", e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0"
          />
          <input
            placeholder="Key"
            value={pair.key}
            onChange={(e) => updatePair(index, "key", e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
          />
          <input
            placeholder="Value"
            value={pair.value}
            onChange={(e) => updatePair(index, "value", e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
          />
          <button
            onClick={() => removePair(index)}
            className="text-slate-500 hover:text-red-400 p-1.5 transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      {pairs.length === 0 && (
        <div className="text-center py-4 border border-dashed border-slate-800 rounded-lg">
          <p className="text-xs text-slate-600">
            No rows added. Click "Add Row" to start.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ProxyClient() {
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/todos");
  const [method, setMethod] = useState("GET");
  const [activeTab, setActiveTab] = useState("params");

  const [params, setParams] = useState([{ key: "", value: "", enabled: true }]);
  const [headers, setHeaders] = useState([
    { key: "", value: "", enabled: true },
  ]);
  const [body, setBody] = useState('{\n  "name": "John Doe"\n}');

  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);
    setImgUrl(null);

    const headerObj = headers
      .filter((p) => p.enabled && p.key)
      .reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

    const queryObj = params
      .filter((p) => p.enabled && p.key)
      .reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

    let parsedBody = undefined;
    if (method !== "GET" && method !== "HEAD") {
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        parsedBody = body;
      }
    }

    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          method,
          headers: headerObj,
          query: queryObj,
          body: parsedBody,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        setResponse(data);
      } else {
        const blob = await res.blob();
        setImgUrl(URL.createObjectURL(blob));
        setResponse({
          success: true,
          status: res.status,
          contentType: contentType,
        });
      }
    } catch (err: any) {
      setResponse({ success: false, error: err.message, status: 500 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen  text-slate-200 font-sans p-4 md:p-8 selection:bg-blue-500/30">

      <DotFabric />
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center gap-3 border-b border-slate-800 pb-6">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
            <Zap className="text-white" fill="currentColor" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ProxyLab</h1>
            <p className="text-xs text-slate-500 font-medium">
              API TESTER & PROXY
            </p>
          </div>
        </header>

        <section className="bg-[#151921] rounded-xl border border-slate-800 shadow-2xl overflow-hidden transition-* duration-300 hover:ring-blue-500/50 hover:ring-2 hover:shadow-[0_0_20px_#3b82f680]">
          <div className="p-3 flex flex-col md:flex-row gap-2 bg-[#1c212c]">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm font-bold text-green-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <Globe
                className="absolute left-3 top-2.5 text-slate-500"
                size={18}
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/data"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <Send size={18} />
              )}
              SEND
            </button>
          </div>

          <div className="p-6">
            <div className="flex gap-6 border-b border-slate-800 mb-4">
              {["params", "headers", "body"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === tab
                    ? "text-blue-400"
                    : "text-slate-500 hover:text-slate-300"
                    }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-[180px]">
              {activeTab === "params" && (
                <KeyValueInput
                  title="Query Parameters"
                  pairs={params}
                  setPairs={setParams}
                />
              )}
              {activeTab === "headers" && (
                <KeyValueInput
                  title="HTTP Headers"
                  pairs={headers}
                  setPairs={setHeaders}
                />
              )}
              {activeTab === "body" && (
                <div className="mt-4 animate-in fade-in duration-300">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="w-full h-44 bg-[#0b0e14] border border-slate-800 rounded-lg p-4 font-mono text-sm text-blue-300 focus:outline-none focus:border-blue-500 placeholder:opacity-20"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4 pb-12 ">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Database size={16} /> Response
            </h2>
            {response && (
              <div className="flex gap-3 text-[10px] font-bold uppercase">
                <div
                  className={`px-3 py-1 rounded-full border ${response.status < 400 ? "bg-green-500/10 border-green-500/50 text-green-400" : "bg-red-500/10 border-red-500/50 text-red-400"}`}
                >
                  STATUS: {response.status}
                </div>
                {response.time && (
                  <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/50 text-blue-400 rounded-full">
                    TIME: {response.time}ms
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#151921] rounded-xl border border-slate-800 min-h-[300px] overflow-hidden flex flex-col  transition-* duration-300 hover:ring-blue-500/50 hover:ring-2 hover:shadow-[0_0_20px_#3b82f680]">
            {!response && !isLoading && (
              <div className="flex flex-col items-center justify-center flex-1 text-slate-600 italic">
                <Code size={40} strokeWidth={1} className="mb-2 opacity-20" />
                <p className="text-sm">Ready for request...</p>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="h-10 w-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}

            {imgUrl && (
              <div className="p-8 flex flex-col items-center justify-center flex-1 bg-slate-900/30">
                <img
                  src={imgUrl}
                  alt="Preview"
                  className="max-h-[400px] rounded shadow-2xl border border-slate-700"
                />
                <p className="mt-4 text-[10px] text-slate-500 font-mono">
                  BINARY IMAGE DETECTED
                </p>
              </div>
            )}

            {response && !imgUrl && (
              <div className="p-4 flex-1 overflow-auto bg-[#0b0e14]">
                {response.error ? (
                  <div className="flex items-start gap-2 text-red-400 font-mono text-sm p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                    <AlertCircle size={18} />
                    <pre>{JSON.stringify(response, null, 2)}</pre>
                  </div>
                ) : (
                  <pre className="font-mono text-xs leading-relaxed text-blue-200">
                    {JSON.stringify(response.data || response, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}

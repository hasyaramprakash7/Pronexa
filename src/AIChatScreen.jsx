// src/AIChatScreen.jsx — Space theme AI tutor with 3D background + black/white toggle
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GROQ_MODELS_URL = `${GROQ_BASE}/models`;
const GROQ_CHAT_URL = `${GROQ_BASE}/chat/completions`;
const GROQ_KEYS_URL = 'https://console.groq.com/keys';
const STORAGE_KEY = 'groq_api_key';
const MAX_OUTPUT_TOKENS = 4096;

const SYSTEM_PROMPT = `You are an AI tutor for students learning AI. Explain concepts clearly and simply, give examples, and guide the student step by step through AI courses and projects. Be concise, friendly, and practical.

Format every answer in Markdown like a modern AI assistant:
- Start with a short plain-text explanation (1-3 sentences).
- Use numbered lists for step-by-step instructions and commands (1. 2. 3.). Put a short bold title at the start of each step.
- Put ALL code, terminal commands and config inside fenced code blocks with a language tag, for example \`\`\`python or \`\`\`bash. Never put code in normal text.
- Use \`inline code\` for names of functions, files, variables and libraries.
- Use ## headings only for long answers, and bullet lists for short facts.
- End with one short follow-up suggestion when useful.`;

const SUGGESTIONS = [
  'Explain how a neural network learns',
  'Show me a Python example of linear regression',
  'Give me steps to build my first chatbot',
  'What is the difference between ML and deep learning?',
];

const FALLBACK_MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'gpt-oss-120b', ctx: 131072, owner: 'OpenAI', chat: true },
  { id: 'openai/gpt-oss-20b', name: 'gpt-oss-20b', ctx: 131072, owner: 'OpenAI', chat: true },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'llama-4-scout-17b-16e-instruct', ctx: 131072, owner: 'Meta', chat: true },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'llama-4-maverick-17b-128e-instruct', ctx: 131072, owner: 'Meta', chat: true },
  { id: 'qwen/qwen3-32b', name: 'qwen3-32b', ctx: 131072, owner: 'Alibaba', chat: true },
  { id: 'deepseek-r1-distill-llama-70b', name: 'deepseek-r1-distill-llama-70b', ctx: 131072, owner: 'DeepSeek', chat: true },
  { id: 'gemma2-9b-it', name: 'gemma2-9b-it', ctx: 8192, owner: 'Google', chat: true },
  { id: 'mixtral-8x7b-32768', name: 'mixtral-8x7b-32768', ctx: 32768, owner: 'Mistral', chat: true },
];

const NON_CHAT_PATTERNS = ['whisper', 'tts', 'orpheus', 'guard', 'safeguard', 'prompt-guard'];

const isChatModel = (id) => {
  const lower = id.toLowerCase();
  return !NON_CHAT_PATTERNS.some((p) => lower.includes(p));
};

const modelKind = (id) => {
  const l = id.toLowerCase();
  if (l.includes('whisper')) return 'Speech to text';
  if (l.includes('tts') || l.includes('orpheus')) return 'Text to speech';
  if (l.includes('guard') || l.includes('safeguard')) return 'Safety';
  if (l.includes('compound')) return 'Agent / tools';
  return 'Chat';
};

const uid = () =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
};

const splitThink = (raw) => {
  const text = raw || '';
  const open = text.indexOf('<think>');
  if (open === -1) return { think: '', answer: text, thinking: false };
  const close = text.indexOf('</think>');
  const before = text.slice(0, open);
  if (close === -1) {
    return { think: text.slice(open + 7).trim(), answer: before.trim(), thinking: true };
  }
  return {
    think: text.slice(open + 7, close).trim(),
    answer: (before + text.slice(close + 8)).trim(),
    thinking: false,
  };
};

const isAuthError = (status, message) => {
  const m = (message || '').toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    m.includes('invalid_api_key') ||
    m.includes('invalid api key') ||
    m.includes('unauthorized')
  );
};

const isModelNotFound = (status, message) => {
  const m = (message || '').toLowerCase();
  return (
    status === 404 ||
    m.includes('model_not_found') ||
    m.includes('does not exist') ||
    m.includes('do not have access')
  );
};

// ─────────────────────────────────────────────────────────────
// Syntax highlighter
// ─────────────────────────────────────────────────────────────
const KEYWORDS =
  'def|class|return|import|from|as|if|elif|else|for|while|in|not|and|or|is|None|True|False|try|except|finally|with|lambda|yield|pass|break|continue|raise|async|await|' +
  'const|let|var|function|new|this|typeof|export|default|switch|case|throw|catch|null|undefined|true|false|extends|super|static|' +
  'public|private|void|int|float|double|string|bool|struct|fn|pub|use|impl|match|echo|sudo|pip|npm|git|cd|ls|mkdir|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|CREATE|TABLE';

const HASH_LANGS = ['python', 'py', 'bash', 'sh', 'shell', 'zsh', 'yaml', 'yml', 'ruby', 'rb', 'r', 'toml', 'dockerfile', 'makefile', 'text', ''];

function highlight(code, lang, theme) {
  const l = (lang || '').toLowerCase();
  const comment = HASH_LANGS.includes(l) ? '#.*' : '\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/';
  const re = new RegExp(
    `(${comment})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|\\b(\\d+(?:\\.\\d+)?)\\b|\\b(${KEYWORDS})\\b|\\b([A-Za-z_]\\w*)(?=\\()`,
    'g'
  );
  const isDark = theme === 'dark';
  const out = [];
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const cls = m[1]
      ? isDark ? 'text-white/45 italic' : 'text-black/40 italic'
      : m[2]
      ? isDark ? 'text-emerald-300' : 'text-emerald-700'
      : m[3]
      ? isDark ? 'text-amber-300' : 'text-amber-700'
      : m[4]
      ? isDark ? 'text-violet-300' : 'text-violet-700'
      : isDark ? 'text-sky-300' : 'text-sky-700';
    out.push(
      <span key={k++} className={cls}>
        {m[0]}
      </span>
    );
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

// ─────────────────────────────────────────────────────────────
// Markdown renderer
// ─────────────────────────────────────────────────────────────
function renderInline(text, keyPrefix = 'i', theme = 'dark') {
  const isDark = theme === 'dark';
  const re =
    /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\s][^*\n]*\*)|(\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\))/g;
  const out = [];
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${k++}`;
    if (m[1]) {
      out.push(
        <code
          key={key}
          className={`rounded-md border px-1.5 py-0.5 font-mono text-[0.85em] ${
            isDark
              ? 'border-white/15 bg-white/10 text-sky-200'
              : 'border-black/15 bg-black/5 text-sky-800'
          }`}
        >
          {m[1].slice(1, -1)}
        </code>
      );
    } else if (m[2]) {
      out.push(
        <strong key={key} className={`font-semibold ${isDark ? 'text-white' : 'text-black'}`}>
          {m[2].slice(2, -2)}
        </strong>
      );
    } else if (m[3]) {
      out.push(<em key={key}>{m[3].slice(1, -1)}</em>);
    } else if (m[4]) {
      out.push(
        <a
          key={key}
          href={m[6]}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-2 ${
            isDark ? 'text-sky-300 hover:text-sky-200' : 'text-sky-700 hover:text-sky-600'
          }`}
        >
          {m[5]}
        </a>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const RE_FENCE = /^\s*```\s*([\w+#.-]*)\s*$/;
const RE_FENCE_END = /^\s*```\s*$/;
const RE_HEADING = /^(#{1,4})\s+(.*)$/;
const RE_HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
const RE_OL = /^\s*(\d+)[.)]\s+(.*)$/;
const RE_UL = /^\s*[-*•]\s+(.*)$/;
const RE_QUOTE = /^\s*>\s?(.*)$/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const isBlockStart = (line, next) =>
  RE_FENCE.test(line) ||
  RE_HEADING.test(line) ||
  RE_HR.test(line) ||
  RE_OL.test(line) ||
  RE_UL.test(line) ||
  RE_QUOTE.test(line) ||
  (line.includes('|') && next !== undefined && RE_TABLE_SEP.test(next));

function parseBlocks(text) {
  const lines = (text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  const n = lines.length;
  let i = 0;

  const splitRow = (row) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  while (i < n) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = line.match(RE_FENCE);
    if (fence) {
      const codeLines = [];
      i++;
      let closed = false;
      while (i < n) {
        if (RE_FENCE_END.test(lines[i])) { closed = true; i++; break; }
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang: fence[1] || '', code: codeLines.join('\n'), open: !closed });
      continue;
    }

    const hd = line.match(RE_HEADING);
    if (hd) { blocks.push({ type: 'heading', level: hd[1].length, text: hd[2] }); i++; continue; }

    if (RE_HR.test(line)) { blocks.push({ type: 'hr' }); i++; continue; }

    if (line.includes('|') && i + 1 < n && RE_TABLE_SEP.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < n && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', head, rows });
      continue;
    }

    if (RE_QUOTE.test(line)) {
      const q = [];
      while (i < n && RE_QUOTE.test(lines[i])) {
        q.push(lines[i].match(RE_QUOTE)[1]);
        i++;
      }
      blocks.push({ type: 'quote', text: q.join(' ') });
      continue;
    }

    if (RE_OL.test(line)) {
      const items = [];
      while (i < n) {
        const cur = lines[i];
        const om = cur.match(RE_OL);
        if (om && (items.length === 0 || !/^\s{4,}/.test(cur))) {
          items.push({ num: Number(om[1]), text: om[2], subs: [] });
          i++; continue;
        }
        if (!cur.trim()) {
          let j = i + 1;
          while (j < n && !lines[j].trim()) j++;
          if (j < n && RE_OL.test(lines[j]) && !/^\s{4,}/.test(lines[j])) { i = j; continue; }
          break;
        }
        if (items.length) {
          const sub = cur.match(/^\s+[-*•]\s+(.*)$/);
          if (sub) { items[items.length - 1].subs.push(sub[1]); i++; continue; }
          if (/^\s{2,}\S/.test(cur) && !RE_FENCE.test(cur)) {
            items[items.length - 1].text += ` ${cur.trim()}`;
            i++; continue;
          }
        }
        break;
      }
      blocks.push({ type: 'steps', items });
      continue;
    }

    if (RE_UL.test(line)) {
      const items = [];
      while (i < n) {
        const cur = lines[i];
        const um = cur.match(RE_UL);
        if (um) { items.push(um[1]); i++; continue; }
        if (items.length && /^\s{2,}\S/.test(cur) && !RE_FENCE.test(cur) && !RE_OL.test(cur)) {
          items[items.length - 1] += ` ${cur.trim()}`;
          i++; continue;
        }
        break;
      }
      blocks.push({ type: 'bullets', items });
      continue;
    }

    const para = [line.trim()];
    i++;
    while (i < n && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'p', text: para.join(' ') });
  }
  return blocks;
}

const LANG_LABEL = {
  py: 'python', js: 'javascript', ts: 'typescript', sh: 'bash', shell: 'bash',
  zsh: 'bash', yml: 'yaml', jsx: 'jsx', tsx: 'tsx', cpp: 'c++', '': 'code',
};

function CodeBlock({ lang, code, open, theme }) {
  const [copied, setCopied] = useState(false);
  const label = LANG_LABEL[(lang || '').toLowerCase()] ?? lang;
  const isDark = theme === 'dark';
  const onCopy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  const isTerminal = ['bash', 'sh', 'shell', 'zsh', 'terminal', 'cmd', 'powershell'].includes(
    (lang || '').toLowerCase()
  );
  return (
    <div className={`my-3 overflow-hidden rounded-xl border shadow-lg ${
      isDark ? 'border-white/15 bg-[#05070d] shadow-black/40' : 'border-black/15 bg-[#f7f7f7] shadow-black/10'
    }`}>
      <div className={`flex items-center justify-between border-b px-3 py-1.5 ${
        isDark ? 'border-white/10 bg-white/[0.06]' : 'border-black/10 bg-black/[0.04]'
      }`}>
        <div className={`flex items-center gap-2 text-[12px] ${isDark ? 'text-white/70' : 'text-black/60'}`}>
          <span className="flex gap-1" aria-hidden="true">
            <span className={`h-2 w-2 rounded-full ${isDark ? 'bg-white/25' : 'bg-black/20'}`} />
            <span className={`h-2 w-2 rounded-full ${isDark ? 'bg-white/25' : 'bg-black/20'}`} />
            <span className={`h-2 w-2 rounded-full ${isDark ? 'bg-white/25' : 'bg-black/20'}`} />
          </span>
          <span className="font-mono">{isTerminal ? 'terminal' : label}</span>
        </div>
        <button
          onClick={onCopy}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[12px] transition ${
            isDark ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-black/70 hover:bg-black/10 hover:text-black'
          }`}
        >
          {copied ? '✓ Copied' : '⧉ Copy'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto px-4 py-3 text-[13px] leading-[1.65]">
        <code className={`font-mono ${isDark ? 'text-white/90' : 'text-black/90'}`}>
          {isTerminal
            ? code.split('\n').map((ln, idx) => (
                <div key={idx}>
                  {ln.trim() && !ln.trim().startsWith('#') && (
                    <span className={`select-none ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>$ </span>
                  )}
                  {highlight(ln, lang, theme)}
                </div>
              ))
            : highlight(code, lang, theme)}
          {open && <span className={`animate-pulse ${isDark ? 'text-white' : 'text-black'}`}>▍</span>}
        </code>
      </pre>
    </div>
  );
}

const Markdown = React.memo(function Markdown({ text, theme }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  const isDark = theme === 'dark';
  return (
    <div className={`min-w-0 text-sm leading-[24px] md:text-[15px] ${isDark ? 'text-white' : 'text-black'}`}>
      {blocks.map((b, idx) => {
        const key = `b${idx}`;
        switch (b.type) {
          case 'code':
            return <CodeBlock key={key} lang={b.lang} code={b.code} open={b.open} theme={theme} />;
          case 'heading': {
            const size =
              b.level === 1 ? 'text-xl md:text-2xl'
              : b.level === 2 ? 'text-lg md:text-xl'
              : 'text-base md:text-[17px]';
            return (
              <div key={key} className={`mb-2 mt-4 font-semibold first:mt-0 ${isDark ? 'text-white' : 'text-black'} ${size}`}>
                {renderInline(b.text, key, theme)}
              </div>
            );
          }
          case 'hr':
            return <hr key={key} className={`my-4 ${isDark ? 'border-white/15' : 'border-black/15'}`} />;
          case 'quote':
            return (
              <blockquote key={key} className={`my-3 border-l-2 py-1.5 pl-3 pr-2 ${
                isDark ? 'border-sky-300/70 bg-white/5 text-white/85' : 'border-sky-600/70 bg-black/5 text-black/80'
              }`}>
                {renderInline(b.text, key, theme)}
              </blockquote>
            );
          case 'bullets':
            return (
              <ul key={key} className="my-2 space-y-1.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className={`mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full ${isDark ? 'bg-sky-300' : 'bg-sky-700'}`} />
                    <span className="min-w-0 flex-1">{renderInline(it, `${key}-${j}`, theme)}</span>
                  </li>
                ))}
              </ul>
            );
          case 'steps':
            return (
              <ol key={key} className="my-3">
                {b.items.map((it, j) => {
                  const lastItem = j === b.items.length - 1;
                  return (
                    <li key={j} className="relative flex gap-3 pb-4 last:pb-1">
                      {!lastItem && (
                        <span aria-hidden="true" className={`absolute bottom-0 left-[13px] top-8 w-px ${isDark ? 'bg-white/20' : 'bg-black/15'}`} />
                      )}
                      <span className={`z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold ${
                        isDark ? 'border-sky-300/60 bg-sky-300/10 text-sky-200' : 'border-sky-600/60 bg-sky-600/10 text-sky-800'
                      }`}>
                        {it.num}
                      </span>
                      <div className="min-w-0 flex-1 pt-[2px]">
                        <div>{renderInline(it.text, `${key}-${j}`, theme)}</div>
                        {it.subs.length > 0 && (
                          <ul className="mt-1.5 space-y-1">
                            {it.subs.map((s, q) => (
                              <li key={q} className={`flex gap-2 ${isDark ? 'text-white/85' : 'text-black/80'}`}>
                                <span className={`mt-[9px] h-1 w-1 shrink-0 rounded-full ${isDark ? 'bg-white/60' : 'bg-black/40'}`} />
                                <span className="min-w-0 flex-1">{renderInline(s, `${key}-${j}-${q}`, theme)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            );
          case 'table':
            return (
              <div key={key} className={`my-3 overflow-x-auto rounded-xl border ${isDark ? 'border-white/15' : 'border-black/15'}`}>
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead className={isDark ? 'bg-white/10' : 'bg-black/5'}>
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={j} className={`px-3 py-2 font-semibold ${isDark ? 'text-white' : 'text-black'}`}>
                          {renderInline(h, `${key}-h${j}`, theme)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j} className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                        {r.map((c, q) => (
                          <td key={q} className={`px-3 py-2 ${isDark ? 'text-white/90' : 'text-black/80'}`}>
                            {renderInline(c, `${key}-${j}-${q}`, theme)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return (
              <p key={key} className="my-2 first:mt-0 last:mb-0">
                {renderInline(b.text, key, theme)}
              </p>
            );
        }
      })}
    </div>
  );
});

function ThinkingBlock({ text, active, theme }) {
  const [openState, setOpenState] = useState(false);
  const isDark = theme === 'dark';
  return (
    <div className={`mb-2 rounded-xl border ${isDark ? 'border-white/15 bg-white/5' : 'border-black/15 bg-black/5'}`}>
      <button
        onClick={() => setOpenState((o) => !o)}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] ${
          isDark ? 'text-white/75 hover:text-white' : 'text-black/60 hover:text-black'
        }`}
        aria-expanded={openState}
      >
        <span className={active ? 'animate-pulse' : ''}>✦</span>
        <span>{active ? 'Thinking…' : 'Thought process'}</span>
        <span className="ml-auto">{openState ? '▴' : '▾'}</span>
      </button>
      {openState && (
        <div className={`max-h-48 overflow-y-auto whitespace-pre-wrap border-t px-3 py-2 text-[12px] leading-5 ${
          isDark ? 'border-white/10 text-white/65' : 'border-black/10 text-black/60'
        }`}>
          {text}
        </div>
      )}
    </div>
  );
}

function TypingDots({ theme }) {
  const isDark = theme === 'dark';
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Tutor is typing">
      {[0, 1, 2].map((d) => (
        <span
          key={d}
          className={`h-1.5 w-1.5 animate-bounce rounded-full ${isDark ? 'bg-white/70' : 'bg-black/50'}`}
          style={{ animationDelay: `${d * 140}ms` }}
        />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// 3D Space Background (theme-aware)
// ─────────────────────────────────────────────────────────────
function SpaceBackground({ showGlobe, theme }) {
  const canvasRef = useRef(null);
  const globeRef = useRef(showGlobe);
  globeRef.current = showGlobe;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const STAR_COUNT = w < 640 ? 260 : 520;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random() * 0.95 + 0.05,
      s: Math.random() * 0.8 + 0.4,
    }));

    const GLOBE_COUNT = 360;
    const globe = Array.from({ length: GLOBE_COUNT }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / GLOBE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        x: Math.cos(theta) * Math.sin(phi),
        y: Math.cos(phi),
        z: Math.sin(theta) * Math.sin(phi),
      };
    });

    let globeAlpha = 0;
    let angle = 0;

    const onMove = (e) => {
      mouse.tx = (e.clientX / w - 0.5) * 2;
      mouse.ty = (e.clientY / h - 0.5) * 2;
    };

    const frame = () => {
      const isDark = themeRef.current === 'dark';
      ctx.clearRect(0, 0, w, h);
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      const cx = w / 2;
      const cy = h / 2;
      const focal = Math.max(w, h) * 0.9;

      const starColor = isDark ? '#ffffff' : '#000000';

      for (const st of stars) {
        if (!reduce) st.z -= 0.0007;
        if (st.z <= 0.05) {
          st.z = 1;
          st.x = (Math.random() - 0.5) * 2;
          st.y = (Math.random() - 0.5) * 2;
        }
        const px = cx + (st.x / st.z) * focal * 0.35 - mouse.x * 40 * (1 - st.z);
        const py = cy + (st.y / st.z) * focal * 0.35 - mouse.y * 40 * (1 - st.z);
        if (px < -5 || px > w + 5 || py < -5 || py > h + 5) continue;
        const depth = 1 - st.z;
        const r = st.s * (0.5 + depth * 1.4);
        ctx.globalAlpha = Math.min(1, 0.25 + depth * 0.9);
        ctx.fillStyle = starColor;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const target = globeRef.current ? 1 : 0;
      globeAlpha += (target - globeAlpha) * 0.06;
      if (globeAlpha > 0.01) {
        if (!reduce) angle += 0.004;
        const radius = Math.min(w, h) * (w < 640 ? 0.3 : 0.24);
        const gcx = cx + mouse.x * 14;
        const gcy = cy - h * 0.08 + mouse.y * 14;
        const tilt = 0.35 + mouse.y * 0.15;
        const rot = angle + mouse.x * 0.4;
        const cosY = Math.cos(rot);
        const sinY = Math.sin(rot);
        const cosX = Math.cos(tilt);
        const sinX = Math.sin(tilt);
        const globeColor = isDark ? '#ffffff' : '#000000';
        for (const p of globe) {
          const x1 = p.x * cosY + p.z * sinY;
          const z1 = -p.x * sinY + p.z * cosY;
          const y2 = p.y * cosX - z1 * sinX;
          const z2 = p.y * sinX + z1 * cosX;
          const persp = 1 / (1.8 - z2 * 0.5);
          const sx = gcx + x1 * radius * persp * 1.8;
          const sy = gcy + y2 * radius * persp * 1.8;
          const front = (z2 + 1) / 2;
          ctx.globalAlpha = globeAlpha * (0.12 + front * 0.8);
          ctx.fillStyle = globeColor;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.6 + front * 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 transition-colors duration-500 ${
        theme === 'dark' ? 'bg-black' : 'bg-white'
      }`}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Assistant content
// ─────────────────────────────────────────────────────────────
function AssistantContent({ message, theme }) {
  const [copied, setCopied] = useState(false);
  const isDark = theme === 'dark';
  const { think, answer, thinking } = useMemo(
    () => splitThink(message.content),
    [message.content]
  );

  const onCopy = async () => {
    if (await copyText(answer)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const waiting = message.isStreaming && !answer && !think;

  return (
    <div className="min-w-0">
      {think && <ThinkingBlock text={think} active={thinking} theme={theme} />}
      {waiting && <TypingDots theme={theme} />}
      {!!answer && <Markdown text={answer} theme={theme} />}
      {message.isStreaming && !!answer && (
        <span className={`ml-0.5 animate-pulse ${isDark ? 'text-white' : 'text-black'}`}>▍</span>
      )}
      {!message.isStreaming && !!answer && (
        <div className={`mt-2 flex items-center gap-1 border-t pt-2 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
          <button
            onClick={onCopy}
            className={`rounded-md px-2 py-1 text-[12px] transition ${
              isDark ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-black/60 hover:bg-black/10 hover:text-black'
            }`}
          >
            {copied ? '✓ Copied' : '⧉ Copy answer'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
const AIChatScreen = ({ open = true, onClose, initialPrompt, theme = 'dark', onToggleTheme }) => {
  const [apiKey, setApiKey] = useState(null);
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0].id);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [chatOnly, setChatOnly] = useState(false);
  const [keyModalVisible, setKeyModalVisible] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);
  const stickToBottom = useRef(true);
  const composerRef = useRef(null);

  const isDark = theme === 'dark';

  // Keyboard handling
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return undefined;
    const vv = window.visualViewport;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Lock body scroll
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Load + validate key
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let k = null;
      try { k = localStorage.getItem(STORAGE_KEY); } catch {}
      if (!k) { setKeyLoaded(true); return; }
      try {
        const res = await fetch(GROQ_MODELS_URL, { headers: { Authorization: `Bearer ${k}` } });
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          setApiKey(null);
          setKeyModalVisible(true);
        } else {
          setApiKey(k);
        }
      } catch {
        if (!cancelled) setApiKey(k);
      } finally {
        if (!cancelled) setKeyLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshModels = useCallback(async () => {
    if (!apiKey) return;
    setModelsLoading(true);
    setModelsError('');
    try {
      const res = await fetch(GROQ_MODELS_URL, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      const mapped = data
        .filter((m) => m?.id && m?.active !== false)
        .map((m) => ({
          id: m.id,
          name: m.id.split('/').pop() || m.id,
          ctx: m.context_window || m.context_length,
          owner: m.owned_by || '',
          chat: isChatModel(m.id),
        }))
        .sort((a, b) => Number(b.chat) - Number(a.chat) || a.name.localeCompare(b.name));
      if (mapped.length) {
        setModels(mapped);
        setLastUpdated(new Date());
        setSelectedModel((cur) => {
          const found = mapped.find((m) => m.id === cur && m.chat);
          return found ? cur : mapped.find((m) => m.chat)?.id || cur;
        });
      }
    } catch (e) {
      setModelsError(e?.message || 'Could not load models');
    } finally {
      setModelsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => { if (apiKey) refreshModels(); }, [apiKey, refreshModels]);

  const saveKey = useCallback(async () => {
    const k = keyInput.trim();
    if (!k) { alert('Paste your Groq API key (gsk_…).'); return; }
    if (!k.startsWith('gsk_')) {
      if (window.confirm('Groq keys start with "gsk_". Open console.groq.com/keys to get a free key?')) {
        window.open(GROQ_KEYS_URL, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    try {
      const res = await fetch(GROQ_MODELS_URL, { headers: { Authorization: `Bearer ${k}` } });
      if (res.status === 401 || res.status === 403) {
        alert('Groq rejected this key (401 Invalid API Key).\n\nCreate a new key at console.groq.com/keys and paste it again.');
        window.open(GROQ_KEYS_URL, '_blank', 'noopener,noreferrer');
        return;
      }
      if (!res.ok) alert(`Could not verify key: HTTP ${res.status}. Saving anyway.`);
    } catch {
      alert('Network error while verifying key. Saving anyway.');
    }
    try {
      localStorage.setItem(STORAGE_KEY, k);
      setApiKey(k);
      setKeyInput('');
      setKeyModalVisible(false);
    } catch (e) {
      alert('Could not save key: ' + (e?.message || 'unknown'));
    }
  }, [keyInput]);

  const removeKey = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setApiKey(null);
    setModels(FALLBACK_MODELS);
    setLastUpdated(null);
  }, []);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, sending, keyboardOffset]);

  const handleFilePick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachments((prev) => [
        ...prev,
        {
          id: uid(),
          uri: String(reader.result || ''),
          type: 'image',
          mimeType: file.type || 'image/jpeg',
          name: file.name,
        },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const updateAssistant = (id, patch) =>
    setMessages((prev) => {
      const updated = [...prev];
      const i = updated.findIndex((m) => m.id === id);
      if (i !== -1) updated[i] = { ...updated[i], ...patch };
      return updated;
    });

  const stop = useCallback(() => { abortRef.current?.abort(); }, []);

  const send = useCallback(
    async (overrideText, modelOverride) => {
      const text = (typeof overrideText === 'string' ? overrideText : input).trim();
      if (!text && pendingAttachments.length === 0) return;
      if (sending) return;
      if (!apiKey) { setKeyModalVisible(true); return; }

      const modelToUse = modelOverride || selectedModel;
      const attachments = [...pendingAttachments];
      setPendingAttachments([]);
      setInput('');
      setSending(true);
      stickToBottom.current = true;

      const userMsg = { id: uid(), role: 'user', content: text, createdAt: new Date().toISOString(), attachments };
      const assistantMsg = { id: uid(), role: 'assistant', content: '', createdAt: new Date().toISOString(), isStreaming: true };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      const history = [];
      for (const m of [...messages, userMsg]) {
        if (m.error) continue;
        if (!m.content && !m.attachments?.length) continue;
        const body = m.role === 'assistant' ? splitThink(m.content).answer : m.content;
        if (m.attachments?.some((a) => a.type === 'image')) {
          const parts = [{ type: 'text', text: body || '' }];
          for (const a of m.attachments.filter((x) => x.type === 'image')) {
            parts.push({ type: 'image_url', image_url: { url: a.uri } });
          }
          history.push({ role: m.role, content: parts });
        } else if (body) {
          history.push({ role: m.role, content: body });
        }
      }

      const controller = new AbortController();
      abortRef.current = controller;
      let full = '';

      try {
        const res = await fetch(GROQ_CHAT_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelToUse,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
            temperature: 0.6,
            max_tokens: MAX_OUTPUT_TOKENS,
            stream: true,
          }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          const err = new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
          err.status = res.status;
          err.body = txt;
          throw err;
        }

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream') && res.body?.getReader) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (data === '[DONE]') continue;
              try {
                const evt = JSON.parse(data);
                const delta = evt?.choices?.[0]?.delta?.content;
                if (delta) {
                  full += delta;
                  updateAssistant(assistantMsg.id, { content: full });
                }
              } catch {}
            }
          }
          updateAssistant(assistantMsg.id, { content: full || '(empty response)', isStreaming: false });
        } else {
          const json = await res.json();
          updateAssistant(assistantMsg.id, {
            content: json?.choices?.[0]?.message?.content ?? '(empty response)',
            isStreaming: false,
          });
        }
      } catch (e) {
        if (e?.name === 'AbortError') {
          updateAssistant(assistantMsg.id, { content: full || '(stopped)', isStreaming: false });
        } else {
          const authFail = isAuthError(e?.status, e?.message);
          const modelFail = isModelNotFound(e?.status, e?.message);
          if (authFail) {
            try { localStorage.removeItem(STORAGE_KEY); } catch {}
            setApiKey(null);
            setModels(FALLBACK_MODELS);
            setLastUpdated(null);
            setKeyModalVisible(true);
            updateAssistant(assistantMsg.id, {
              content: '',
              isStreaming: false,
              error: 'Your Groq API key is invalid or revoked. Open the 🔑 button and paste a fresh key from console.groq.com/keys.',
            });
          } else if (modelFail) {
            const fallback = FALLBACK_MODELS[0].id;
            if (modelToUse !== fallback) {
              setSelectedModel(fallback);
              updateAssistant(assistantMsg.id, {
                content: '',
                isStreaming: false,
                error: `Model "${modelToUse}" is not available on your key. Auto-switching to "${fallback}" and retrying…`,
              });
              setTimeout(() => send(text, fallback), 300);
            } else {
              updateAssistant(assistantMsg.id, {
                content: '',
                isStreaming: false,
                error: 'Model not found on your Groq key. Open the model picker (tap the model name at the top) and choose another model.',
              });
            }
          } else {
            updateAssistant(assistantMsg.id, { content: '', isStreaming: false, error: e?.message || 'Request failed' });
          }
        }
      } finally {
        abortRef.current = null;
        setSending(false);
      }
    },
    [input, apiKey, pendingAttachments, messages, selectedModel, sending]
  );

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setPendingAttachments([]);
  }, []);

  // Auto-send initial prompt
  const initialPromptSent = useRef(false);
  useEffect(() => {
    if (!open) return undefined;
    if (!initialPrompt) { initialPromptSent.current = false; return undefined; }
    if (initialPromptSent.current) return undefined;
    if (!apiKey) return undefined;
    initialPromptSent.current = true;
    setInput(initialPrompt);
    const t = setTimeout(() => { send(initialPrompt); }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, apiKey, open]);

  useEffect(() => { initialPromptSent.current = false; }, [initialPrompt]);

  const visibleModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return models.filter((m) => {
      if (chatOnly && !m.chat) return false;
      if (!q) return true;
      return (
        m.id.toLowerCase().includes(q) ||
        (m.owner || '').toLowerCase().includes(q) ||
        modelKind(m.id).toLowerCase().includes(q)
      );
    });
  }, [models, modelSearch, chatOnly]);

  const currentModel = models.find((m) => m.id === selectedModel);

  if (!open) return null;

  if (!keyLoaded) {
    return (
      <div className={`fixed inset-0 z-[100] flex h-screen items-center justify-center ${isDark ? 'bg-black' : 'bg-white'}`}>
        <div className={`h-7 w-7 animate-spin rounded-full border-[3px] ${isDark ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'}`} />
      </div>
    );
  }

  const canSend = !(sending || (!input.trim() && pendingAttachments.length === 0));

  const glass = isDark
    ? 'border border-white/15 bg-black/55 backdrop-blur-xl'
    : 'border border-black/15 bg-white/60 backdrop-blur-xl';

  const iconBtn = `flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[15px] transition focus-visible:outline focus-visible:outline-2 ${
    isDark
      ? 'border-white/25 text-white hover:bg-white/10 focus-visible:outline-white'
      : 'border-black/25 text-black hover:bg-black/10 focus-visible:outline-black'
  }`;

  const containerStyle = { height: `calc(100dvh - ${keyboardOffset}px)` };

  return (
    <div className={`fixed inset-0 z-[100] ${isDark ? 'bg-black' : 'bg-white'}`}>
      <button
        onClick={() => onClose?.()}
        className={`absolute left-3 top-3 z-[1001] flex h-9 w-9 items-center justify-center rounded-full border text-lg backdrop-blur-md ${
          isDark
            ? 'border-white/25 bg-black/70 text-white hover:bg-white/10'
            : 'border-black/25 bg-white/80 text-black hover:bg-black/10'
        }`}
        title="Close chat"
        aria-label="Close chat"
      >
        ×
      </button>

      <div
        className={`relative mx-auto flex w-full max-w-[900px] flex-col overflow-hidden font-sans ${
          isDark ? 'bg-black text-white' : 'bg-white text-black'
        }`}
        style={containerStyle}
      >
        <SpaceBackground showGlobe={messages.length === 0} theme={theme} />

        {/* Header */}
        <header className={`relative z-10 flex shrink-0 items-center gap-2 border-x-0 border-t-0 px-3 py-3 pl-14 md:px-5 md:py-4 md:pl-16 ${glass}`}>
          <div className="min-w-0 flex-1">
            <div className={`text-xs font-medium ${isDark ? 'text-white' : 'text-black'}`}>AILearnLab Tutor</div>
            <button
              className={`mt-0.5 block max-w-full truncate text-left text-[15px] font-semibold hover:underline ${isDark ? 'text-white' : 'text-black'}`}
              onClick={() => setPickerVisible(true)}
              title="Change model"
            >
              {currentModel?.name || selectedModel} ▾
            </button>
          </div>

          {onToggleTheme && (
            <button className={iconBtn} onClick={onToggleTheme} title="Toggle theme">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <button className={iconBtn} onClick={() => setKeyModalVisible(true)} title="API key settings">
            {apiKey ? '🔑' : '⚠'}
          </button>
          <button className={iconBtn} onClick={newChat} title="New chat">＋</button>
        </header>

        {/* Messages */}
        <div
          ref={listRef}
          onScroll={onListScroll}
          className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-3"
        >
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-end px-5 pb-10 text-center md:px-8">
              <div className={`mb-2 text-2xl font-semibold md:text-3xl ${isDark ? 'text-white' : 'text-black'}`}>
                Ask your AI tutor
              </div>
              <div className={`mb-5 max-w-sm text-[14px] leading-relaxed ${isDark ? 'text-white' : 'text-black'}`}>
                Learn how AI works, get help with your courses, and build real AI projects. Free for every student.
              </div>

              {apiKey ? (
                <div className="mb-5 flex max-w-xl flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className={`rounded-full px-3.5 py-2 text-[13px] transition hover:opacity-90 ${glass} ${isDark ? 'text-white' : 'text-black'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  className={`mb-5 rounded-full px-6 py-2.5 text-sm font-bold ${
                    isDark ? 'bg-white text-black hover:bg-white/85' : 'bg-black text-white hover:bg-black/85'
                  }`}
                  onClick={() => setKeyModalVisible(true)}
                >
                  Add Groq API key to start
                </button>
              )}

              <div className={`text-[13px] ${isDark ? 'text-white/80' : 'text-black/70'}`}>
                {models.length} models available
                {lastUpdated ? ` · updated ${lastUpdated.toLocaleTimeString()}` : ''}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.role === 'user';
            if (m.error) {
              return (
                <div key={m.id} className="my-1 flex w-full justify-start px-3 md:px-5">
                  <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 md:max-w-[80%] ${glass}`}>
                    <div className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>⚠ {m.error}</div>
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className={`my-1.5 flex w-full px-3 md:px-5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`box-border min-w-0 rounded-2xl px-3.5 py-2.5 ${
                    isUser
                      ? `max-w-[90%] rounded-br-sm md:max-w-[75%] ${isDark ? 'bg-white' : 'bg-black'}`
                      : `w-full max-w-[96%] rounded-bl-sm md:max-w-[85%] ${glass}`
                  }`}
                >
                  {isUser ? (
                    !!m.content && (
                      <div className={`whitespace-pre-wrap break-words text-sm leading-[22px] md:text-[15px] ${isDark ? 'text-black' : 'text-white'}`}>
                        {m.content}
                      </div>
                    )
                  ) : (
                    <AssistantContent message={m} theme={theme} />
                  )}
                  {m.attachments?.map((a) => (
                    <div key={a.id} className="mt-2 overflow-hidden rounded-lg">
                      {a.type === 'image' ? (
                        <img
                          src={a.uri}
                          alt={a.name}
                          className="block max-h-[130px] max-w-[180px] rounded-lg object-cover md:max-h-[160px] md:max-w-[220px]"
                        />
                      ) : (
                        <div className={`text-[11px] ${isDark ? 'text-white' : 'text-black'}`}>📎 {a.name}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Attachment tray */}
        {pendingAttachments.length > 0 && (
          <div className={`relative z-10 flex shrink-0 gap-2 overflow-x-auto border-x-0 border-b-0 px-4 py-2 ${glass}`}>
            {pendingAttachments.map((a) => (
              <div
                key={a.id}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                  isDark ? 'border-white/25 bg-black/60' : 'border-black/25 bg-white/80'
                }`}
              >
                {a.type === 'image' ? (
                  <img src={a.uri} alt={a.name} className="h-5 w-5 rounded object-cover" />
                ) : (
                  <span>📎</span>
                )}
                <span className={`max-w-[120px] truncate text-[11px] ${isDark ? 'text-white' : 'text-black'}`}>{a.name}</span>
                <button
                  className={`text-sm font-extrabold hover:opacity-70 ${isDark ? 'text-white' : 'text-black'}`}
                  aria-label={`Remove ${a.name}`}
                  onClick={() => setPendingAttachments((p) => p.filter((x) => x.id !== a.id))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Composer */}
        <div
          ref={composerRef}
          className={`relative z-20 shrink-0 border-t backdrop-blur-xl ${
            isDark ? 'border-white/15 bg-black/85' : 'border-black/15 bg-white/85'
          }`}
          style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-end gap-2 px-2.5 py-2.5 md:px-4">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
            {/* <button
              className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[17px] ${
                isDark ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/10'
              }`}
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
            >
              
            </button> */}
            <textarea
              className={`box-border max-h-[120px] min-h-[38px] flex-1 resize-none rounded-2xl border px-3 py-2.5 text-sm outline-none md:text-[15px] ${
                isDark
                  ? 'border-white/25 bg-black/60 text-white focus:border-white'
                  : 'border-black/25 bg-white text-black focus:border-black'
              }`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => {
                requestAnimationFrame(() => {
                  const el = listRef.current;
                  if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
                });
              }}
              rows={1}
              maxLength={8000}
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {sending ? (
              <button
                className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border ${
                  isDark ? 'border-white text-white hover:bg-white/10' : 'border-black text-black hover:bg-black/10'
                }`}
                onClick={stop}
                title="Stop generating"
                aria-label="Stop generating"
              >
                <span className={`h-3 w-3 rounded-sm ${isDark ? 'bg-white' : 'bg-black'}`} />
              </button>
            ) : (
              <button
                data-ai-send
                className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[19px] font-extrabold ${
                  canSend
                    ? isDark
                      ? 'bg-white text-black hover:bg-white/85'
                      : 'bg-black text-white hover:bg-black/85'
                    : `cursor-not-allowed border bg-transparent ${isDark ? 'border-white/25 text-white/50' : 'border-black/25 text-black/40'}`
                }`}
                onClick={() => send()}
                disabled={!canSend}
                title="Send (Enter)"
              >
                ↑
              </button>
            )}
          </div>
        </div>

        {/* Model picker */}
        {pickerVisible && (
          <div
            className={`fixed inset-0 z-[1000] flex items-end justify-center ${isDark ? 'bg-black/80' : 'bg-black/40'}`}
            onClick={() => setPickerVisible(false)}
          >
            <div
              className={`box-border flex max-h-[85vh] w-full max-w-[640px] flex-col rounded-t-3xl border-t px-3 pb-6 pt-2 md:px-5 md:pb-8 ${
                isDark ? 'border-white/20 bg-black' : 'border-black/20 bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`mx-auto mb-3 mt-2 h-1 w-10 shrink-0 rounded ${isDark ? 'bg-white/40' : 'bg-black/30'}`} />
              <div className={`text-lg font-semibold md:text-xl ${isDark ? 'text-white' : 'text-black'}`}>Choose a model</div>
              <div className={`mb-3 mt-0.5 text-[13px] ${isDark ? 'text-white' : 'text-black/70'}`}>
                All {models.length} models from Groq
                {lastUpdated ? ` · updated ${lastUpdated.toLocaleTimeString()}` : ' · sample list, add a key for live data'}
              </div>

              <input
                className={`mb-2 box-border w-full shrink-0 rounded-xl border px-3.5 py-2.5 text-sm outline-none ${
                  isDark
                    ? 'border-white/25 bg-black text-white focus:border-white'
                    : 'border-black/25 bg-white text-black focus:border-black'
                }`}
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
              />

              <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                <button
                  className={`rounded-full border px-3 py-1 text-[12px] disabled:opacity-50 ${
                    isDark ? 'border-white/30 text-white hover:bg-white/10' : 'border-black/30 text-black hover:bg-black/10'
                  }`}
                  onClick={refreshModels}
                  disabled={modelsLoading || !apiKey}
                >
                  {modelsLoading ? 'Refreshing…' : '↻ Refresh'}
                </button>
                <label className={`flex cursor-pointer items-center gap-1.5 text-[12px] ${isDark ? 'text-white' : 'text-black'}`}>
                  <input
                    type="checkbox"
                    checked={chatOnly}
                    onChange={(e) => setChatOnly(e.target.checked)}
                    className={`h-3.5 w-3.5 ${isDark ? 'accent-white' : 'accent-black'}`}
                  />
                  Chat models only
                </label>
                <span className={`text-[12px] ${isDark ? 'text-white' : 'text-black/70'}`}>{visibleModels.length} shown</span>
              </div>

              {modelsError && (
                <div className={`mb-2 text-[12px] ${isDark ? 'text-white' : 'text-black'}`}>
                  ⚠ Could not refresh ({modelsError}). Showing the last list.
                </div>
              )}

              <div className="flex flex-col overflow-y-auto">
                {visibleModels.map((item) => {
                  const active = item.id === selectedModel;
                  return (
                    <button
                      key={item.id}
                      disabled={!item.chat}
                      className={`flex w-full items-center border-b bg-transparent py-3 text-left ${
                        isDark ? 'border-white/10' : 'border-black/10'
                      } ${item.chat ? (isDark ? 'hover:bg-white/5' : 'hover:bg-black/5') : 'cursor-not-allowed opacity-50'}`}
                      onClick={() => { setSelectedModel(item.id); setPickerVisible(false); }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`truncate text-sm font-medium md:text-[15px] ${isDark ? 'text-white' : 'text-black'}`}>
                            {item.name}
                          </span>
                          <span className={`shrink-0 rounded-full border px-2 py-px text-[10px] ${
                            isDark ? 'border-white/30 text-white' : 'border-black/30 text-black'
                          }`}>
                            {modelKind(item.id)}
                          </span>
                        </div>
                        <div className={`mt-0.5 truncate text-[11px] ${isDark ? 'text-white/80' : 'text-black/60'}`}>
                          {item.id}{item.owner ? ` · ${item.owner}` : ''}{item.ctx ? ` · ${Math.round(item.ctx / 1024)}K context` : ''}
                        </div>
                        {!item.chat && (
                          <div className={`mt-0.5 text-[11px] ${isDark ? 'text-white' : 'text-black'}`}>
                            Not a chat model, can’t be used here
                          </div>
                        )}
                      </div>
                      {active && <span className={`ml-3 text-lg ${isDark ? 'text-white' : 'text-black'}`}>✓</span>}
                    </button>
                  );
                })}
                {visibleModels.length === 0 && (
                  <div className={`py-6 text-center text-sm ${isDark ? 'text-white' : 'text-black'}`}>
                    No models match “{modelSearch}”.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* API key modal */}
        {keyModalVisible && (
          <div
            className={`fixed inset-0 z-[1000] flex items-end justify-center ${isDark ? 'bg-black/80' : 'bg-black/40'}`}
            onClick={() => setKeyModalVisible(false)}
          >
            <div
              className={`box-border max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-t-3xl border-t px-3 pb-6 pt-2 md:px-5 md:pb-8 ${
                isDark ? 'border-white/20 bg-black' : 'border-black/20 bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`mx-auto mb-3 mt-2 h-1 w-10 rounded ${isDark ? 'bg-white/40' : 'bg-black/30'}`} />
              <div className={`text-lg font-semibold md:text-xl ${isDark ? 'text-white' : 'text-black'}`}>Groq API key</div>
              <div className={`mb-4 mt-0.5 text-[13px] ${isDark ? 'text-white' : 'text-black/70'}`}>
                Free, no credit card. Stored only in this browser. Used only to power your AI tutor.
              </div>

              <button
                className={`mb-2 text-[13px] font-semibold underline ${isDark ? 'text-white' : 'text-black'}`}
                onClick={() => window.open(GROQ_KEYS_URL, '_blank', 'noopener,noreferrer')}
              >
                Open Groq keys ↗
              </button>

              <div className={`mb-3 text-[12px] leading-4 ${isDark ? 'text-white' : 'text-black/70'}`}>
                Go to console.groq.com/keys, sign in, create an API key, copy the gsk_… string, paste it below and save.
              </div>

              {apiKey && (
                <div className={`mb-3 flex items-center justify-between gap-2 rounded-full border px-3 py-1.5 ${
                  isDark ? 'border-white/25' : 'border-black/25'
                }`}>
                  <span className={`truncate text-[12px] ${isDark ? 'text-white' : 'text-black'}`}>
                    Key saved · {apiKey.slice(0, 6)}••••{apiKey.slice(-4)}
                  </span>
                  <button
                    className={`shrink-0 text-[12px] font-semibold underline ${isDark ? 'text-white' : 'text-black'}`}
                    onClick={removeKey}
                  >
                    Remove
                  </button>
                </div>
              )}

              <input
                type="password"
                className={`mb-3 box-border w-full rounded-xl border px-3.5 py-3 text-sm outline-none ${
                  isDark
                    ? 'border-white/25 bg-black text-white focus:border-white'
                    : 'border-black/25 bg-white text-black focus:border-black'
                }`}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                autoComplete="off"
              />

              <button
                className={`w-full rounded-xl py-3.5 text-sm font-bold ${
                  isDark ? 'bg-white text-black hover:bg-white/85' : 'bg-black text-white hover:bg-black/85'
                }`}
                onClick={saveKey}
              >
                Save key
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatScreen;
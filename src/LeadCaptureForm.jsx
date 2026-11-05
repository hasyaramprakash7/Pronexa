// src/LeadCaptureForm.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    X, CheckCircle2, MessageCircle, Phone, Send, Loader2, Sparkles,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// CONFIG — CHANGE THESE TWO VALUES ONLY
// ─────────────────────────────────────────────────────────────
const OWNER_WHATSAPP = '917001545024';   // your company WhatsApp (digits only)
const OWNER_PHONE    = '+917001545024';  // your company phone for SMS fallback

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const STORAGE_KEY = 'groq_api_key';
const AI_MODEL = 'openai/gpt-oss-20b';

const COURSES = [
    'Full Stack Python with AI',
    'Data Science with AI',
    'Data Analyst with AI',
    'Java with AI',
    'Generative AI',
];

// ─────────────────────────────────────────────────────────────
// Scrollbar-hiding utility classes
// ─────────────────────────────────────────────────────────────
const HIDE_SCROLLBAR_CLASS =
    'overflow-y-auto overscroll-contain ' +
    '[scrollbar-width:none] [-ms-overflow-style:none] ' +
    '[&::-webkit-scrollbar]:hidden';

const SCROLLBAR_STYLE_ID = '__pronzxa_hide_scrollbar__';
const ensureScrollbarStyle = () => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(SCROLLBAR_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = SCROLLBAR_STYLE_ID;
    style.textContent = `
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scrollbar::-webkit-scrollbar { width: 0; height: 0; display: none; }
    `;
    document.head.appendChild(style);
};

// ─────────────────────────────────────────────────────────────
// AI prompt for the welcome message
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a warm, human coach from ProNexa writing a personal WhatsApp welcome message to a new student.

You are given only these details about the student:
- their name
- the course they enrolled in
- their experience level
- (optionally) a short note they wrote

Write ONE WhatsApp message FROM ProNexa TO the student.

Strict rules:
- Speak directly to the student using their first name.
- Reference their exact course and tailor encouragement to their experience level.
- Include a short "what you'll learn" section (2-3 bullet points starting with "•").
- Add one warm sentence of training guidance (e.g. start with Lesson 1, use the AI tutor anytime).
- Sign off with "— Team ProNexa".
- Use WhatsApp formatting: *bold* for key words. Emojis sparingly, warm and natural.
- Sound like a real person, not a robot. Friendly, motivating, personal.
- Keep it under 150 words.
- NEVER say the message is AI-generated. NEVER mention AI writing it. NEVER include meta text, headings, code fences, or HTML.
- NEVER invent links, prices, or dates.
- Return ONLY the message text, ready to paste into WhatsApp.`;

const getApiKey = () => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};

const firstName = (lead) => (lead.name || '').trim().split(' ')[0] || 'there';

const buildFallbackMessage = (lead) => {
    const fn = firstName(lead);
    return [
        `🎉 *Welcome to ProNexa, ${fn}!*`,
        '',
        `We're so happy to have you join the *${lead.course}* course. 🚀`,
        '',
        '📚 *Here\'s what you\'ll learn:*',
        '• Step-by-step lessons built for real beginners',
        '• Real projects you can show to employers',
        '• Your own AI tutor available 24/7 for any doubt',
        '',
        `Since you're at the *${lead.experience}* level, start with *Lesson 1* and go at your own pace — we'll be right here whenever you need help.`,
        '',
        'Prepare. Perform. Get Placed. 💪',
        '— Team ProNexa',
    ].join('\n');
};

const generateAIMessage = async (lead, signal) => {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.log('[FORM] no API key — using fallback welcome');
        return { message: buildFallbackMessage(lead), source: 'fallback' };
    }

    const userPrompt = [
        `Student details:`,
        `- Name: ${lead.name}`,
        `- Course: ${lead.course}`,
        `- Experience: ${lead.experience}`,
        lead.message ? `- Their note: "${lead.message}"` : '',
        '',
        'Write the WhatsApp welcome message now, following all rules.',
    ].filter(Boolean).join('\n');

    try {
        console.log('[FORM] requesting welcome message from AI…');
        const res = await fetch(GROQ_CHAT_URL, {
            method: 'POST',
            signal,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.8,
                max_tokens: 400,
                stream: false,
            }),
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${txt.slice(0, 120)}`);
        }
        const json = await res.json();
        let text = json?.choices?.[0]?.message?.content?.trim() || '';
        if (!text) throw new Error('AI returned empty message');

        text = text
            .replace(/^```[\s\S]*?\n/, '')
            .replace(/\n```\s*$/, '')
            .replace(/^(here('s| is)[^\n]*\n+)/i, '')
            .trim();

        return { message: text, source: 'ai' };
    } catch (err) {
        if (err?.name === 'AbortError') throw err;
        console.warn('[FORM] AI failed, using fallback:', err.message);
        return { message: buildFallbackMessage(lead), source: 'fallback' };
    }
};

// ─────────────────────────────────────────────────────────────
// WhatsApp / SMS URLs
// ─────────────────────────────────────────────────────────────
const buildWhatsAppUrl = (welcomeMessage, lead) => {
    const dateStr = new Date(lead.createdAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const finalMessage = [
        '🚨 *NEW STUDENT REGISTRATION* 🚨',
        '',
        '👤 *Student Details:*',
        `• Name: ${lead.name}`,
        `• Email: ${lead.email}`,
        `• Phone: ${lead.phone}`,
        `• Course: ${lead.course}`,
        `• Experience: ${lead.experience}`,
        lead.message ? `• Note: "${lead.message}"` : '',
        `• Date: ${dateStr}`,
    ].filter(Boolean).join('\n');

    return `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(finalMessage)}`;
};

const buildSmsUrl = (lead) => {
    const text = encodeURIComponent(
        `New ProNexa joinee: ${lead.name} | ${lead.email} | ${lead.phone} | ${lead.course} | ${lead.experience}`
    );
    return `sms:${OWNER_PHONE}?&body=${text}`;
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
const LeadCaptureForm = ({ open, onClose, presetCourse = '', theme = 'dark', inline = false }) => {
    const isDark = theme === 'dark';

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        course: presetCourse || COURSES[0],
        experience: 'Beginner',
        message: '',
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submittedLead, setSubmittedLead] = useState(null);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [sentToWhatsApp, setSentToWhatsApp] = useState(false);
    const firstFieldRef = useRef(null);
    const abortRef = useRef(null);
    const scrollRef = useRef(null);

    useEffect(() => { ensureScrollbarStyle(); }, []);

    useEffect(() => {
        if (!open) return;
        setForm((f) => ({ ...f, course: presetCourse || f.course }));
        setErrors({});
        setSubmittedLead(null);
        setWelcomeMessage('');
        setSentToWhatsApp(false);
        const t = setTimeout(() => firstFieldRef.current?.focus({ preventScroll: true }), 120);
        return () => clearTimeout(t);
    }, [open, presetCourse]);

    // Lock body scroll ONLY if it's a popup (not inline)
    useEffect(() => {
        if (!open || inline) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open, inline]);

    useEffect(() => {
        if (!open || inline) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') {
                abortRef.current?.abort();
                onClose?.();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose, inline]);

    const onChange = useCallback((e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        setErrors((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }, []);

    const validate = () => {
        const errs = {};
        if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Enter your full name';
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter a valid email';
        if (!/^[+\d][\d\s\-()]{7,}$/.test(form.phone.trim())) errs.phone = 'Enter a valid phone number';
        if (!form.course) errs.course = 'Pick a course';
        setErrors(errs);
        if (Object.keys(errs).length && scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return Object.keys(errs).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        if (!validate()) return;

        setSubmitting(true);
        const lead = { ...form, createdAt: new Date().toISOString() };
        setSubmittedLead(lead);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const { message } = await generateAIMessage(lead, controller.signal);
            setWelcomeMessage(message);
            const url = buildWhatsAppUrl(message, lead);
            const win = window.open(url, '_blank', 'noopener,noreferrer');
            setSentToWhatsApp(!!win);
        } catch (err) {
            if (err?.name !== 'AbortError') {
                const fb = buildFallbackMessage(lead);
                setWelcomeMessage(fb);
                const url = buildWhatsAppUrl(fb, lead);
                const win = window.open(url, '_blank', 'noopener,noreferrer');
                setSentToWhatsApp(!!win);
            }
        } finally {
            setSubmitting(false);
            abortRef.current = null;
        }
    };

    const onWhatsApp = () => {
        if (!submittedLead || !welcomeMessage) return;
        window.open(buildWhatsAppUrl(welcomeMessage, submittedLead), '_blank', 'noopener,noreferrer');
    };

    const onSMS = () => {
        if (!submittedLead) return;
        window.location.href = buildSmsUrl(submittedLead);
    };

    // Reset function to clear the form after inline submission so the user can submit again
    const resetForm = () => {
        setSubmittedLead(null);
        setWelcomeMessage('');
        setSentToWhatsApp(false);
        setForm({
            name: '', email: '', phone: '', course: presetCourse || COURSES[0], experience: 'Beginner', message: ''
        });
        if (inline && scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const t = {
        surface: isDark ? 'bg-black text-white' : 'bg-white text-black',
        border: isDark ? 'border-white/15' : 'border-black/15',
        input: isDark
            ? 'border-white/25 bg-black/60 text-white placeholder-white/40 focus:border-white'
            : 'border-black/25 bg-white text-black placeholder-black/40 focus:border-black',
        label: isDark ? 'text-white/80' : 'text-black/70',
        subtle: isDark ? 'text-white/60' : 'text-black/55',
        primary: isDark
            ? 'bg-white text-black hover:bg-white/85 disabled:bg-white/40'
            : 'bg-black text-white hover:bg-black/85 disabled:bg-black/40',
        secondary: isDark
            ? 'border border-white/30 text-white hover:bg-white/10'
            : 'border border-black/30 text-black hover:bg-black/10',
        error: isDark ? 'text-red-400' : 'text-red-600',
        aiBox: isDark
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-emerald-50 border-emerald-200',
    };

    if (!open) return null;

    // ---- Conditional Rendering for Inline vs Popup ----
    
    const containerClass = inline
        ? `relative w-full overflow-hidden rounded-3xl border shadow-2xl ${t.border} ${t.surface}`
        : `fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 ${isDark ? 'bg-black/85' : 'bg-black/40'}`;

    const innerClass = inline
        ? `relative flex flex-col w-full`
        : `relative flex max-h-[92dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-3xl border shadow-2xl ${t.border} ${t.surface}`;

    return (
        <div
            className={containerClass}
            onClick={inline ? undefined : () => { abortRef.current?.abort(); onClose?.(); }}
            style={inline ? {} : { isolation: 'isolate' }}
        >
            <div
                className={innerClass}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button (Hidden if inline) */}
                {!inline && (
                    <button
                        onClick={() => { abortRef.current?.abort(); onClose?.(); }}
                        className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md ${t.border} ${isDark ? 'bg-black/60 hover:bg-white/10' : 'bg-white/80 hover:bg-black/10'}`}
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                )}

                <div
                    ref={scrollRef}
                    className={`hide-scrollbar ${inline ? '' : HIDE_SCROLLBAR_CLASS} ${inline ? 'p-6 md:p-8' : 'px-6 md:px-8'}`}
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        scrollBehavior: 'smooth',
                    }}
                >
                    {!submittedLead || (!welcomeMessage && submitting) ? (
                        <form onSubmit={submit} className={inline ? "pb-2 pt-2" : "pb-8 pt-8"}>
                            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-500">
                                <Sparkles size={14} /> Free enrollment
                            </div>
                            <h2 className="mb-1 font-serif text-2xl md:text-3xl">Join ProNexa</h2>
                            <p className={`mb-6 text-sm ${t.subtle}`}>
                                Fill in your details. We'll open WhatsApp so you can send your info to the ProNexa team.
                            </p>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className={`mb-1 block text-xs font-bold uppercase tracking-wider ${t.label}`}>Full name</label>
                                    <input
                                        ref={firstFieldRef}
                                        name="name"
                                        value={form.name}
                                        onChange={onChange}
                                        className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none ${t.input}`}
                                        placeholder="e.g. Aarav Sharma"
                                        autoComplete="name"
                                        disabled={submitting}
                                    />
                                    {errors.name && <div className={`mt-1 text-xs ${t.error}`}>{errors.name}</div>}
                                </div>

                                <div>
                                    <label className={`mb-1 block text-xs font-bold uppercase tracking-wider ${t.label}`}>Email</label>
                                    <input name="email" type="email" value={form.email} onChange={onChange}
                                        className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none ${t.input}`}
                                        placeholder="you@example.com" autoComplete="email" disabled={submitting} />
                                    {errors.email && <div className={`mt-1 text-xs ${t.error}`}>{errors.email}</div>}
                                </div>

                                <div>
                                    <label className={`mb-1 block text-xs font-bold uppercase tracking-wider ${t.label}`}>Phone / WhatsApp</label>
                                    <input name="phone" type="tel" value={form.phone} onChange={onChange}
                                        className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none ${t.input}`}
                                        placeholder="+91 98765 43210" autoComplete="tel" disabled={submitting} />
                                    {errors.phone && <div className={`mt-1 text-xs ${t.error}`}>{errors.phone}</div>}
                                </div>

                                <div>
                                    <label className={`mb-1 block text-xs font-bold uppercase tracking-wider ${t.label}`}>Course</label>
                                    <select name="course" value={form.course} onChange={onChange}
                                        className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none ${t.input}`} disabled={submitting}>
                                        {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    {errors.course && <div className={`mt-1 text-xs ${t.error}`}>{errors.course}</div>}
                                </div>

                                <div>
                                    <label className={`mb-1 block text-xs font-bold uppercase tracking-wider ${t.label}`}>Experience</label>
                                    <select name="experience" value={form.experience} onChange={onChange}
                                        className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none ${t.input}`} disabled={submitting}>
                                        <option>Beginner</option>
                                        <option>Intermediate</option>
                                        <option>Advanced</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className={`mb-1 block text-xs font-bold uppercase tracking-wider ${t.label}`}>Message (optional)</label>
                                    <textarea name="message" value={form.message} onChange={onChange} rows={3}
                                        className={`w-full resize-none rounded-xl border px-3.5 py-3 text-sm outline-none ${t.input}`}
                                        placeholder="What do you want to build or learn?" disabled={submitting} />
                                </div>
                            </div>

                            <button type="submit" disabled={submitting}
                                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition ${t.primary}`}>
                                {submitting
                                    ? <><Loader2 size={16} className="animate-spin" /> Preparing your welcome…</>
                                    : <><Send size={16} /> Submit & continue on WhatsApp</>}
                            </button>

                            <p className={`mt-3 text-center text-[11px] ${t.subtle}`}>
                                One tap opens WhatsApp with your details ready to send to ProNexa.
                            </p>
                        </form>
                    ) : (
                        <div className={inline ? "pb-2 pt-2" : "pb-8 pt-8"}>
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white">
                                    <CheckCircle2 size={22} />
                                </div>
                                <div>
                                    <h2 className="font-serif text-2xl">Registration ready! 🎉</h2>
                                    <p className={`text-sm ${t.subtle}`}>
                                        {sentToWhatsApp
                                            ? 'WhatsApp opened in a new tab — just press Send there.'
                                            : 'Press the green button below to send on WhatsApp.'}
                                    </p>
                                </div>
                            </div>

                            <div className={`mb-4 rounded-xl border p-3 text-xs ${t.border} ${t.subtle}`}>
                                📤 This will send your details to the ProNexa team.
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <button onClick={onWhatsApp}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition hover:bg-[#1ebe5b]">
                                    <MessageCircle size={16} /> Open WhatsApp again
                                </button>
                                <button onClick={onSMS}
                                    className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${t.secondary}`}>
                                    <Phone size={16} /> Send as SMS
                                </button>
                            </div>

                            <button onClick={inline ? resetForm : onClose}
                                className={`mt-4 w-full rounded-xl py-3 text-sm font-bold transition ${t.secondary}`}>
                                {inline ? 'Submit another response' : 'Done'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeadCaptureForm;
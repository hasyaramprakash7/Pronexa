import React, { useState, useEffect, useRef } from 'react';
import {
    motion, useScroll, useTransform, useSpring, useMotionValue, useMotionValueEvent,
} from 'framer-motion';
import {
    ArrowRight, Zap, ChevronRight, Code, Database, BarChart3, Coffee, Sparkles,
    GraduationCap, Users, BookOpen, Sun, Moon, Bot,
} from 'lucide-react';

import HeroParallax from './HeroParallax';
import AIChatScreen from './AIChatScreen';
import LeadCaptureForm from './LeadCaptureForm';

// ─────────────────────────────────────────────────────────────
// LOGO IMPORT
// ─────────────────────────────────────────────────────────────
import logo from './image.png';

/* --- 0. LOGO COMPONENT --- */
const Logo = ({ theme, size = 'md', showText = false }) => {
    const isDark = theme === 'dark';
    const sizes = {
        sm: 'h-8',
        md: 'h-10 md:h-12',
        lg: 'h-16',
    };
    
    return (
        <div className="flex items-center gap-2">
            <img
                src={logo}
                alt="ProNexa Logo"
                className={`${sizes[size] || sizes.md} w-auto object-contain rounded-md`}
                draggable={false}
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                }}
            />
            {showText && (
                <span className={`font-serif font-bold tracking-tighter ${isDark ? 'text-white' : 'text-[#2A231D]'}`}>
                    ProNexa
                </span>
            )}
        </div>
    );
};

/* --- 1. SHARED 3D TILT CARD --- */
const TiltCard = ({ children, className, intensity = 20 }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 400, damping: 40 });
    const mouseY = useSpring(y, { stiffness: 400, damping: 40 });

    function onMouseMove({ currentTarget, clientX, clientY }) {
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        x.set(clientX - left - width / 2);
        y.set(clientY - top - height / 2);
    }

    const rotateX = useTransform(mouseY, [-300, 300], [intensity / 2, -intensity / 2]);
    const rotateY = useTransform(mouseX, [-300, 300], [-intensity / 2, intensity / 2]);
    const shineX = useTransform(mouseX, [-300, 300], ['0%', '100%']);
    const shineY = useTransform(mouseY, [-300, 300], ['0%', '100%']);

    return (
        <motion.div
            className={className}
            onMouseMove={onMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ perspective: 1000 }}
        >
            <motion.div
                style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                className="h-full w-full relative transition-shadow duration-500"
            >
                {children}
                <motion.div
                    style={{
                        background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.18), transparent 60%)`,
                    }}
                    className="absolute inset-0 rounded-[inherit] pointer-events-none z-20 mix-blend-overlay"
                />
            </motion.div>
        </motion.div>
    );
};

/* --- 2. NAVBAR --- */
const Navbar = ({ onOpenChat, theme, onToggleTheme }) => {
    const { scrollY } = useScroll();
    const [hidden, setHidden] = useState(false);

    useMotionValueEvent(scrollY, 'change', (latest) => {
        const previous = scrollY.getPrevious();
        if (latest > previous && latest > 150) setHidden(true);
        else setHidden(false);
    });

    const isDark = theme === 'dark';

    return (
        <motion.nav
            variants={{ visible: { y: 0 }, hidden: { y: '-100%' } }}
            animate={hidden ? 'hidden' : 'visible'}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 backdrop-blur-md border-b transition-colors duration-500 ${
                isDark ? 'bg-black/80 border-white/10 text-white' : 'bg-[#F4F1EA]/90 border-stone-200/50 text-[#2A231D]'
            }`}
        >
            <a href="#hero" aria-label="ProNexa home">
                <Logo theme={theme} size="md" showText={false} />
            </a>

            <div className={`hidden md:flex space-x-8 text-sm font-medium ${isDark ? 'text-white/70' : 'text-[#5C5346]'}`}>
                <a href="#hero" className="hover:opacity-100 transition-opacity">Home</a>
                <a href="#courses" className="hover:opacity-100 transition-opacity">Courses</a>
                <button onClick={() => onOpenChat(null)} className="hover:opacity-100 transition-opacity">
                    AI Tutor
                </button>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
                <button
                    onClick={onToggleTheme}
                    title="Toggle theme"
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                        isDark
                            ? 'border-white/25 bg-white/5 text-white hover:bg-white/15'
                            : 'border-stone-300 bg-white text-[#2A231D] hover:bg-stone-100'
                    }`}
                >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                    onClick={() => onOpenChat(null)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                        isDark ? 'bg-white text-black hover:bg-white/85' : 'bg-[#2A231D] text-white hover:bg-black'
                    }`}
                >
                    Open AI Tutor
                </button>
            </div>
        </motion.nav>
    );
};

/* --- 3. FOOTER --- */
const Footer = ({ theme }) => (
    <footer className={`py-12 px-6 mt-0 transition-colors duration-500 ${
        theme === 'dark' ? 'bg-black text-white/50' : 'bg-[#1A1510] text-stone-500'
    }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-6 justify-between items-center">
            <Logo theme="dark" size="md" showText={false} />
            <p className="text-xs text-center sm:text-right">
                © 2026 ProNexa, Inc. Prepare. Perform. Get Placed.
            </p>
        </div>
    </footer>
);

/* --- 4. COURSES DATA (Re-ordered: Agentic AI & Generative AI first) --- */
const AI_COURSES = [
    {
        title: 'Agentic AI',
        description: 'Design autonomous agents that plan, reason, and execute multi-step workflows using LangChain.',
        icon: Bot, lessons: 32, level: 'Advanced', tag: 'Agentic',
        prompt: 'I want to start the Agentic AI course. Explain how autonomous agents work, how they use tools, and walk me through building a simple agent with LangChain.',
    },
    {
        title: 'Generative AI',
        description: 'Create text, images, and multimodal AI apps using LLMs and diffusion models.',
        icon: Sparkles, lessons: 26, level: 'Advanced', tag: 'Generative',
        prompt: 'I want to start the Generative AI course. Explain how LLMs and diffusion models work, then show me how to build a simple text-to-image app.',
    },
    {
        title: 'Full Stack Python with AI',
        description: 'Build complete web apps with FastAPI, React, and AI features end to end.',
        icon: Code, lessons: 36, level: 'Intermediate', tag: 'Full Stack',
        prompt: 'I want to start the Full Stack Python with AI course. Give me lesson 1 overview: how Python, FastAPI, and React fit together to build an AI-powered full-stack app.',
    },
    {
        title: 'Data Science with AI',
        description: 'Master pandas, NumPy, statistics, and ML pipelines to turn raw data into insights.',
        icon: Database, lessons: 30, level: 'Beginner', tag: 'Data',
        prompt: 'I want to start the Data Science with AI course. Teach me the core data science workflow: loading data, cleaning, exploring, and modeling with scikit-learn.',
    },
    {
        title: 'Data Analyst with AI',
        description: 'Learn SQL, visualization, and AI-assisted analytics to drive real decisions.',
        icon: BarChart3, lessons: 24, level: 'Beginner', tag: 'Analytics',
        prompt: 'I want to start the Data Analyst with AI course. Show me how to analyze a dataset with SQL and Python, then visualize the insights with AI assistance.',
    },
    {
        title: 'Java with AI',
        description: 'Use Java with Spring Boot and AI APIs to build production-grade backend systems.',
        icon: Coffee, lessons: 28, level: 'Intermediate', tag: 'Backend',
        prompt: 'I want to start the Java with AI course. Explain how to build a Spring Boot backend that calls an LLM API, with code examples.',
    },
];

/* --- 5. SPACE COURSE CARD --- */
const SpaceCourseCard = ({ course, onClick, theme }) => {
    const Icon = course.icon;
    const isDark = theme === 'dark';
    return (
        <TiltCard className="h-full w-full cursor-pointer group" intensity={10}>
            <div
                onClick={onClick}
                className={`relative h-full w-full overflow-hidden rounded-[2rem] border p-6 backdrop-blur-xl transition-all duration-500 md:p-8 ${
                    isDark
                        ? 'border-white/15 bg-black/75 hover:border-white/40 hover:bg-black/90'
                        : 'border-stone-900/15 bg-white/80 hover:border-stone-900/40 hover:bg-white/95'
                }`}
            >
                <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 opacity-25 transition-opacity duration-700 group-hover:opacity-60 ${isDark ? '' : 'invert'}`}>
                    <DotGlobeMini dark={isDark} />
                </div>

                <div className={`pointer-events-none absolute inset-0 rounded-[inherit] ${
                    isDark
                        ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]'
                        : 'bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.05),transparent_60%)]'
                }`} />

                <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider md:text-xs ${
                            isDark
                                ? 'border-white/30 bg-white/5 text-white'
                                : 'border-stone-900/30 bg-stone-900/5 text-[#2A231D]'
                        }`}>
                            {course.tag}
                        </span>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition-colors md:h-12 md:w-12 ${
                            isDark
                                ? 'border-white/25 bg-white/5 group-hover:bg-white/15'
                                : 'border-stone-900/25 bg-stone-900/5 group-hover:bg-stone-900/15'
                        }`}>
                            <Icon size={20} className={isDark ? 'text-white' : 'text-[#2A231D]'} />
                        </div>
                    </div>

                    <div className="mt-auto">
                        <h3 className={`mb-2 font-serif text-xl leading-tight md:text-2xl ${isDark ? 'text-white' : 'text-[#2A231D]'}`}>
                            {course.title}
                        </h3>
                        <p className={`mb-4 line-clamp-2 text-xs leading-relaxed md:text-sm ${isDark ? 'text-white/70' : 'text-[#5C5346]'}`}>
                            {course.description}
                        </p>

                        <div className={`flex items-center justify-between border-t pt-4 ${isDark ? 'border-white/10' : 'border-stone-900/10'}`}>
                            <div className="flex flex-col gap-1">
                                <span className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-[#5C5346]/70'}`}>
                                    {course.lessons} lessons
                                </span>
                                <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#2A231D]'}`}>
                                    {course.level}
                                </span>
                            </div>
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm transition-colors md:h-10 md:w-10 ${
                                isDark
                                    ? 'border-white/25 bg-white/5 group-hover:bg-white'
                                    : 'border-stone-900/25 bg-stone-900/5 group-hover:bg-[#2A231D]'
                            }`}>
                                <ChevronRight
                                    size={18}
                                    className={`transition-colors ${
                                        isDark ? 'text-white group-hover:text-black' : 'text-[#2A231D] group-hover:text-white'
                                    }`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TiltCard>
    );
};

const DotGlobeMini = ({ dark = true }) => (
    <svg viewBox="0 0 100 100" className="h-full w-full animate-[spin_18s_linear_infinite]">
        {Array.from({ length: 90 }).map((_, i) => {
            const phi = Math.acos(1 - (2 * (i + 0.5)) / 90);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            const x = 50 + Math.cos(theta) * Math.sin(phi) * 40;
            const y = 50 + Math.cos(phi) * 40;
            const r = 0.6 + Math.sin(phi) * 1.4;
            return <circle key={i} cx={x} cy={y} r={r} fill={dark ? 'white' : '#2A231D'} />;
        })}
    </svg>
);

/* --- 6. COURSES SECTION --- */
const CoursesSection = ({ onSelectCourse, onOpenChat, theme }) => {
    const isDark = theme === 'dark';
    return (
        <section
            className={`relative z-10 overflow-hidden py-24 px-4 md:px-8 transition-colors duration-500 ${
                isDark ? 'bg-black' : 'bg-[#FCF9F6]'
            }`}
            id="courses"
            style={{ scrollMarginTop: '80px' }}
        >
            <div className="pointer-events-none absolute inset-0 opacity-30">
                <StarfieldDots dark={isDark} />
            </div>

            <div className="relative z-10 mx-auto max-w-[1400px]">
                <div className="mb-16 text-center">
                    <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold backdrop-blur-md ${
                        isDark
                            ? 'border-white/20 bg-white/5 text-white'
                            : 'border-stone-900/20 bg-stone-900/5 text-[#2A231D]'
                    }`}>
                        <Sparkles size={16} /> All AI Courses
                    </div>
                    <h2 className={`mb-6 font-serif text-5xl leading-[1.05] md:text-6xl lg:text-7xl ${
                        isDark ? 'text-white' : 'text-[#2A231D]'
                    }`}>
                        Learn AI. Build AI.<br />
                        <span className={isDark ? 'text-white/60' : 'text-[#2A231D]/50'}>Ship real projects.</span>
                    </h2>
                    <p className={`mx-auto max-w-2xl text-lg ${isDark ? 'text-white/70' : 'text-[#5C5346]'}`}>
                        Pick any course below and your AI tutor will open with that topic —
                        ready to teach you step by step. Free for every student.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                    {AI_COURSES.map((course, idx) => (
                        <div key={idx} className="h-[320px] md:h-[340px]">
                            <SpaceCourseCard
                                course={course}
                                onClick={() => onSelectCourse(course)}
                                theme={theme}
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <div className="inline-flex flex-col items-center gap-4 sm:flex-row">
                        <button
                            onClick={() => onOpenChat(null)}
                            className={`flex items-center gap-2 rounded-full px-8 py-4 font-bold shadow-xl transition-all hover:scale-105 ${
                                isDark
                                    ? 'bg-white text-black hover:bg-white/85'
                                    : 'bg-[#2A231D] text-white hover:bg-black'
                            }`}
                        >
                            Ask the AI Tutor
                            <ArrowRight size={18} />
                        </button>
                        <span className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-white/70' : 'text-[#5C5346]'}`}>
                            <Zap size={14} className={isDark ? 'text-white' : 'text-[#2A231D]'} />
                            Free for every student
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
};

const StarfieldDots = ({ dark = true }) => (
    <svg className="h-full w-full" preserveAspectRatio="none">
        {Array.from({ length: 180 }).map((_, i) => {
            const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
            const y = (Math.sin(i * 78.233) * 12345.6789) % 1;
            const r = Math.abs(Math.sin(i * 3.7)) * 1.2 + 0.3;
            const o = Math.abs(Math.sin(i * 5.1)) * 0.6 + 0.15;
            return (
                <circle
                    key={i}
                    cx={`${Math.abs(x) * 100}%`}
                    cy={`${Math.abs(y) * 100}%`}
                    r={r}
                    fill={dark ? 'white' : '#2A231D'}
                    opacity={o}
                />
            );
        })}
    </svg>
);

/* --- 7. FOR STUDENTS --- */
const ForStudentsSection = ({ theme }) => {
    const isDark = theme === 'dark';
    const features = [
        { icon: GraduationCap, title: 'Learn at your pace', text: 'Beginner to advanced AI courses built for students — no prior experience needed.' },
        { icon: BookOpen, title: 'Hands-on lessons', text: 'Every course ends with a real project you can put in your portfolio.' },
        { icon: Users, title: 'AI tutor on demand', text: 'Stuck? Ask the AI tutor any question about your course and get a clear explanation.' },
    ];

    return (
        <section className={`relative z-10 py-24 px-4 md:px-8 transition-colors duration-500 ${
            isDark ? 'bg-black' : 'bg-[#FCF9F6]'
        }`}>
            <div className="mx-auto max-w-[1200px]">
                <div className="mb-14 text-center">
                    <h2 className={`mb-4 font-serif text-4xl md:text-5xl ${isDark ? 'text-white' : 'text-[#2A231D]'}`}>
                        Built for students
                    </h2>
                    <p className={`mx-auto max-w-xl ${isDark ? 'text-white/70' : 'text-[#5C5346]'}`}>
                        A pure learning platform — pick a course, follow the lessons,
                        and ask the AI tutor whenever you need help.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {features.map(({ icon: Icon, title, text }, i) => (
                        <div key={i} className={`rounded-[2rem] border p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${
                            isDark ? 'border-white/15 bg-white/5 hover:bg-white/10' : 'border-stone-200 bg-white'
                        }`}>
                            <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full ${
                                isDark ? 'bg-white text-black' : 'bg-[#2A231D] text-white'
                            }`}>
                                <Icon size={22} />
                            </div>
                            <h3 className={`mb-2 font-serif text-xl ${isDark ? 'text-white' : 'text-[#2A231D]'}`}>{title}</h3>
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-white/70' : 'text-[#5C5346]'}`}>{text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

/* --- 8. 3D SPACE BACKGROUND --- */
function SpaceBackground({ theme }) {
    const canvasRef = useRef(null);
    const themeRef = useRef(theme);
    themeRef.current = theme;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let w = 0, h = 0, raf = 0;
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

            globeAlpha += (1 - globeAlpha) * 0.06;
            if (globeAlpha > 0.01) {
                if (!reduce) angle += 0.004;
                const radius = Math.min(w, h) * (w < 640 ? 0.3 : 0.24);
                const gcx = cx + mouse.x * 14;
                const gcy = cy - h * 0.08 + mouse.y * 14;
                const tilt = 0.35 + mouse.y * 0.15;
                const rot = angle + mouse.x * 0.4;
                const cosY = Math.cos(rot), sinY = Math.sin(rot);
                const cosX = Math.cos(tilt), sinX = Math.sin(tilt);
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
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
                pointerEvents: 'none',
                backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                transition: 'background-color 0.5s ease',
            }}
        />
    );
}

/* --- 9. INLINE FORM SECTION WITH 3D BACKGROUND --- */
const EnrollmentSection = ({ theme }) => {
    const isDark = theme === 'dark';
    return (
        <section id="enroll" className="relative z-10 py-24 px-4 md:px-8 transition-colors duration-500 overflow-hidden">
            {/* 3D Canvas Background placed exactly behind this section */}
            <SpaceBackground theme={theme} />

            <div className="relative z-10 mx-auto max-w-xl">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full"
                >
                    <div className="mb-8 text-center">
                        <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold backdrop-blur-md ${
                            isDark ? 'border-white/20 bg-white/5 text-white' : 'border-stone-900/20 bg-stone-900/5 text-[#2A231D]'
                        }`}>
                            <Users size={16} /> Free enrollment
                        </div>
                        <h2 className={`mb-2 font-serif text-4xl md:text-5xl ${isDark ? 'text-white' : 'text-[#2A231D]'}`}>
                            Join ProNexa
                        </h2>
                        <p className={`text-lg ${isDark ? 'text-white/60' : 'text-[#5C5346]'}`}>
                            Fill in your details. We'll open WhatsApp so you can send your info to the team.
                        </p>
                    </div>

                    <LeadCaptureForm
                        open={true}
                        onClose={() => {}}
                        theme={theme}
                        presetCourse=""
                        inline={true}
                    />
                </motion.div>
            </div>
        </section>
    );
};

/* --- 10. MAIN LAYOUT --- */
const LandingPage = () => {
    const [theme, setTheme] = useState('dark');
    const [chatOpen, setChatOpen] = useState(false);
    const [initialPrompt, setInitialPrompt] = useState(null);
    const [chatKey, setChatKey] = useState(0);

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    const openChat = () => {
        setInitialPrompt(null);
        setChatKey((k) => k + 1);
        setChatOpen(true);
    };

    const openChatWithCourse = (course) => {
        setInitialPrompt(course?.prompt || null);
        setChatKey((k) => k + 1);
        setChatOpen(true);
    };

    return (
        <div className={`min-h-screen font-sans selection:bg-orange-200 transition-colors duration-500 ${
            theme === 'dark' ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#2A231D]'
        }`}>
            <Navbar onOpenChat={openChatWithCourse} theme={theme} onToggleTheme={toggleTheme} />

            <section id="hero" className="relative">
                <HeroParallax theme={theme} />
            </section>

            <CoursesSection
                onSelectCourse={openChatWithCourse}
                onOpenChat={openChatWithCourse}
                theme={theme}
            />

            {/* Form section is now placed directly below Courses */}
            <EnrollmentSection theme={theme} />

            <ForStudentsSection theme={theme} />

            <Footer theme={theme} />

            <AIChatScreen
                key={chatKey}
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                initialPrompt={initialPrompt}
                theme={theme}
                onToggleTheme={toggleTheme}
            />
        </div>
    );
};

export default LandingPage;
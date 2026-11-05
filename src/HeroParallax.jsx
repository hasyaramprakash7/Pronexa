import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ChevronRight, ShoppingBag } from 'lucide-react';

// The 3 videos in order
import videoAgentic from './assets/3.mp4';
import videoGenerative from './assets/6.mp4';
import videoFullStack from './assets/2.mp4';

import LeadCaptureForm from './LeadCaptureForm';

const PROJECTS_URL = 'https://laddu-6i69.onrender.com';

const StickySection = ({ videoSrc, heading, text, buttonText, index, theme, onOpenForm }) => {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const isInView = useInView(containerRef, { margin: '-10% 0px -10% 0px' });

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start end', 'end start'],
    });

    const yText = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const opacityText = index === 0
        ? 1
        : useTransform(scrollYProgress, [0, 0.25, 0.85, 1], [0, 1, 1, 0]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (isInView) {
            if (video.paused) {
                video.currentTime = 0;
                const p = video.play();
                if (p !== undefined) p.catch(() => { });
            }
        } else {
            video.pause();
        }
    }, [isInView]);

    const isDark = theme === 'dark';

    return (
        <div
            ref={containerRef}
            className={`sticky top-0 h-[100dvh] w-full overflow-hidden border-t ${isDark ? 'border-white/10' : 'border-stone-300'}`}
            style={{ zIndex: index + 1, transform: 'translate3d(0,0,0)' }}
        >
            <div className="absolute inset-0 w-full h-full">
                <video
                    ref={videoRef}
                    src={videoSrc}
                    muted loop playsInline preload="auto"
                    className="w-full h-full object-cover"
                    style={{
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden',
                    }}
                />

                {/* UNIFIED DARK OVERLAY - Ensures perfect text readability on all 3 videos */}
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/60" />
            </div>

            <motion.div
                style={{ y: index === 0 ? 0 : yText, opacity: opacityText }}
                className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 max-w-4xl mx-auto pt-16"
            >
                <h2
                    className="text-5xl md:text-8xl font-serif font-bold tracking-tighter mb-6 pt-10 text-white"
                    style={{
                        textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 8px 32px rgba(0,0,0,0.8)'
                    }}
                >
                    {heading}
                </h2>
                <p
                    className="text-lg md:text-2xl font-light tracking-wide mb-10 max-w-2xl leading-relaxed text-white/95"
                    style={{
                        textShadow: '0 1px 6px rgba(0,0,0,0.95), 0 4px 16px rgba(0,0,0,0.8)'
                    }}
                >
                    {text}
                </p>

                {/* TWO BUTTONS ROW */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                    <button
                        onClick={() => onOpenForm(heading)}
                        className="group flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-transform hover:scale-105 active:scale-95 shadow-xl bg-white text-black hover:bg-stone-200"
                    >
                        <span className="tracking-wide uppercase text-sm">{buttonText}</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* DIRECT LINK TO PROJECTS SHOP */}
                    {/* <a
                        href={PROJECTS_URL}
                        className="group flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-transform hover:scale-105 active:scale-95 shadow-xl bg-black/60 text-white backdrop-blur-md border border-white/30 hover:bg-black/80"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        <span className="tracking-wide uppercase text-sm">Buy Projects</span>
                    </a> */}
                </div>
            </motion.div>
        </div>
    );
};

const HeroParallax = ({ theme }) => {
    const [formOpen, setFormOpen] = useState(false);
    const [presetCourse, setPresetCourse] = useState('');

    const sections = [
        {
            heading: 'Agentic AI',
            text: 'Design autonomous AI agents that plan, reason, and execute multi-step workflows. The future of AI is here.',
            buttonText: 'Enroll Now',
            videoSrc: videoAgentic, // 6.mp4
        },
        {
            heading: 'Generative AI',
            text: 'Create text, images, and multimodal AI apps using LLMs and diffusion models. Build the next-gen creative tools.',
            buttonText: 'Get Started',
            videoSrc: videoGenerative, // 2.mp4
        },
        {
            heading: 'Full Stack Python',
            text: 'Build real AI-powered web apps end to end — Python, FastAPI, React, and LLM APIs. Prepare. Perform. Get Placed.',
            buttonText: 'Book a Demo',
            videoSrc: videoFullStack, // 3.mp4
        },
    ];

    const openForm = (courseName) => {
        setPresetCourse(courseName || '');
        setFormOpen(true);
    };

    return (
        <>
            <section
                className="relative w-full bg-black block min-h-screen"
                id="projects"
                style={{ isolation: 'isolate' }}
            >
                {sections.map((section, index) => (
                    <StickySection
                        key={index}
                        {...section}
                        index={index}
                        theme={theme}
                        onOpenForm={openForm}
                    />
                ))}
            </section>

            <LeadCaptureForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                presetCourse={presetCourse}
                theme={theme}
            />
        </>
    );
};

export default HeroParallax;
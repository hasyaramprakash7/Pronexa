import React, { useState, useEffect } from 'react';
import { motion, useSpring, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

// --- ASSETS (AI-themed images) ---
import img from '../public/download (5)-Photoroom.png';
import img1 from '../public/3D Pill Animation 💊___-Photoroom.png';
import img2 from '../public/Too many people are being told they have a vitamin D deficiency-Photoroom.png';
import img3 from '../public/download (6)-Photoroom.png';
import Mainimg from '../public/David Lineton _ Cosmetic Still Life Photography-Photoroom.png';

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
    const shineX = useTransform(mouseX, [-300, 300], ["0%", "100%"]);
    const shineY = useTransform(mouseY, [-300, 300], ["0%", "100%"]);

    return (
        <motion.div
            className={className}
            onMouseMove={onMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ perspective: 1000 }}
        >
            <motion.div
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                className="h-full w-full relative transition-all duration-500 ease-out"
            >
                {children}
                <motion.div
                    style={{ background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.15), transparent 60%)` }}
                    className="absolute inset-0 rounded-[inherit] pointer-events-none z-20 mix-blend-overlay"
                />
            </motion.div>
        </motion.div>
    );
};

const HeroCategories = ({ onOpenChat, tokens }) => {
    const [index, setIndex] = useState(0);

    const titles = [
        "AI Foundations",
        "AI for Business",
        "AI Project Building"
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % titles.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="pt-24 pb-12 md:pt-32 px-4 md:px-8 bg-[#FCF9F6] min-h-screen" id="courses">
            <div className="max-w-[1400px] mx-auto">

                <div className="mb-12 min-h-[140px] md:min-h-[200px] flex flex-col justify-center">
                    <h1 className="text-5xl sm:text-7xl lg:text-8xl font-serif text-[#2A231D] tracking-tight leading-[1.1]">
                        <AnimatePresence mode='wait'>
                            <motion.span
                                key={index}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="block"
                            >
                                {titles[index]}
                            </motion.span>
                        </AnimatePresence>
                        <span className="font-normal text-[#966F4F] text-2xl sm:text-4xl lg:text-5xl block mt-2">
                            built for real AI builders
                        </span>
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">

                    {/* 1. BIG CARD: MASTER AI */}
                    <div className="col-span-1 md:col-span-2 lg:row-span-2 relative z-10 min-h-[400px] lg:min-h-full">
                        <TiltCard className="h-full w-full cursor-pointer group" intensity={10}>
                            <div
                                onClick={onOpenChat}
                                className="h-full bg-gradient-to-br from-[#8B5E3C] to-[#5C3D26] group-hover:from-[#5C3D26] group-hover:to-[#3E2919] rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden flex flex-col justify-between shadow-2xl transition-colors duration-700"
                            >
                                <div className="relative z-10 pointer-events-none">
                                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white mb-2 leading-tight">
                                        Learn AI <br /> from scratch
                                    </h3>
                                    <p className="text-white/60 font-medium group-hover:text-white/90 transition-colors">
                                        powered by {tokens} gold AI tokens
                                    </p>
                                </div>

                                <motion.img
                                    src={Mainimg}
                                    alt="AI course"
                                    className="absolute bottom-[-10px] right-[-10px] w-48 sm:bottom-[-20px] sm:right-[-20px] sm:w-64 lg:w-80 h-auto object-contain drop-shadow-2xl z-0 transition-transform duration-700 ease-out group-hover:translate-y-[-20px] group-hover:scale-105"
                                />

                                <div className="relative z-10 bg-white/20 backdrop-blur-md w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-stone-900 transition-colors duration-300 self-start mt-auto">
                                    <ChevronRight size={24} className="text-white group-hover:text-stone-900" />
                                </div>
                            </div>
                        </TiltCard>
                    </div>

                    {/* 2. WIDE CARD: BONUS TOKENS */}
                    <div className="col-span-1 md:col-span-2 relative z-10 min-h-[200px]">
                        <TiltCard className="h-full w-full cursor-pointer group" intensity={8}>
                            <div className="h-full bg-[#1A1510] group-hover:bg-[#000000] rounded-[2rem] md:rounded-[2.5rem] p-8 relative overflow-hidden flex flex-row items-center justify-between shadow-2xl transition-colors duration-500">
                                <div className="relative z-10 max-w-[60%]">
                                    <h3 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white italic tracking-tighter group-hover:text-[#FFE5B4] transition-colors duration-500">
                                        +50 tokens
                                    </h3>
                                    <p className="text-white/50 text-xs sm:text-sm mt-2">
                                        bonus for every AI project you ship
                                    </p>
                                </div>
                                <button
                                    onClick={onOpenChat}
                                    className="relative z-10 bg-[#C27C4E] text-white px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full font-bold hover:bg-[#A6663E] hover:scale-105 transition-all shadow-lg whitespace-nowrap"
                                >
                                    Claim now
                                </button>
                            </div>
                        </TiltCard>
                    </div>

                    {/* 3. SMALL CARDS: CATEGORIES */}
                    {[
                        { title: "Prompt engineering", image: img, color: "bg-[#EBEBEB]", hoverColor: "group-hover:bg-[#D4E6F1]" },
                        { title: "Build AI agents", image: img1, color: "bg-[#F4F1EA]", hoverColor: "group-hover:bg-[#E8F6F3]" },
                        { title: "AI for business", image: img2, color: "bg-[#F0F4F8]", hoverColor: "group-hover:bg-[#D6EAF8]" },
                        { title: "Ship AI products", image: img3, color: "bg-[#FDF6F0]", hoverColor: "group-hover:bg-[#FCF3CF]" },
                    ].map((item, idx) => (
                        <div key={idx} className="col-span-1 h-[180px] lg:h-auto" onClick={onOpenChat}>
                            <TiltCard className="h-full w-full cursor-pointer group" intensity={15}>
                                <div className={`${item.color} ${item.hoverColor} h-full w-full rounded-[2rem] p-6 relative flex flex-col justify-between hover:shadow-xl transition-all duration-500 border border-stone-200/50 group-hover:border-stone-400/50 overflow-hidden`}>
                                    <h4 className="font-bold text-[#2A231D] text-lg sm:text-xl leading-tight relative z-20 group-hover:translate-x-1 transition-transform max-w-[60%]">
                                        {item.title}
                                    </h4>
                                    <motion.img
                                        src={item.image}
                                        alt={item.title}
                                        className="absolute bottom-2 right-2 w-28 sm:w-32 lg:w-36 h-auto object-contain drop-shadow-lg z-10 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-[-10deg]"
                                    />
                                    <div className="absolute top-1/2 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-1/2 translate-x-[-10px] group-hover:translate-x-0 z-30">
                                        <ChevronRight className="text-[#2A231D]" size={24} />
                                    </div>
                                </div>
                            </TiltCard>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HeroCategories;
import React, { useRef, useMemo } from 'react';
import { motion, useSpring, useTransform, useMotionValue, useScroll } from 'framer-motion';
import mainPersonImg from "./assets/10 Stylish Brown Suit Combinations for Men-Photoroom.png";

const LIQUID_SPRING = { stiffness: 45, damping: 35, mass: 0.1, restDelta: 0.001 };

const bgImages = [
    "https://i.pinimg.com/1200x/42/25/f1/4225f17474d98e89a59148caf8a2f6d9.jpg",
    "https://i.pinimg.com/1200x/bb/7a/bf/bb7abf64169941979a8bbbfe7e784633.jpg",
    "https://i.pinimg.com/1200x/c0/f9/e1/c0f9e1ffbc39a0815b3d7f5a2d0be204.jpg",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=90",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=90"
];

const BackgroundStream = () => (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#B5927C]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#D6B8A2] via-[#B5927C] to-[#8C6B54] z-0 opacity-90" />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-10"
            style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}
        />
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
            {bgImages.map((img, i) => (
                <MovingPhoto key={i} img={img} index={i} total={bgImages.length} />
            ))}
        </div>
    </div>
);

const MovingPhoto = ({ img, index, total }) => {
    const randomY = useMemo(() => [15, 50, 85][index % 3], [index]);
    return (
        <motion.div
            className="absolute w-[280px] aspect-[16/9] rounded-2xl shadow-lg overflow-hidden border border-white/10"
            style={{ top: `${randomY}%`, left: "-25%", willChange: "transform" }}
            animate={{ left: ["-25%", "125%"], opacity: [0, 1, 1, 0], scale: [0.95, 1.05] }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear", delay: index * (50 / total) }}
        >
            <img src={img} alt="AI memory" className="w-full h-full object-cover grayscale-[20%]" />
        </motion.div>
    );
};

const HeroComposite = () => {
    const containerRef = useRef(null);
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const mouseX = useSpring(mx, LIQUID_SPRING);
    const mouseY = useSpring(my, LIQUID_SPRING);

    const handleMouseMove = (e) => {
        const { innerWidth, innerHeight } = window;
        mx.set((e.clientX / innerWidth - 0.5) * 2);
        my.set((e.clientY / innerHeight - 0.5) * 2);
    };

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const smoothProgress = useSpring(scrollYProgress, LIQUID_SPRING);
    const personX = useTransform(smoothProgress, [0, 0.5], ["-100%", "0%"]);
    const personOpacity = useTransform(smoothProgress, [0, 0.15], [0, 1]);
    const textOpacity = useTransform(smoothProgress, [0.2, 0.45], [0, 1]);
    const textY = useTransform(smoothProgress, [0.2, 0.45], ["40px", "0px"]);

    return (
        <section
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="relative w-full h-[300vh] bg-[#B5927C]"
            style={{ perspective: '1200px' }}
        >
            <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
                <BackgroundStream />

                <motion.div
                    style={{
                        rotateY: useTransform(mouseX, [-1, 1], [-2, 2]),
                        rotateX: useTransform(mouseY, [-1, 1], [2, -2]),
                        transformStyle: "preserve-3d",
                        willChange: "transform"
                    }}
                    className="relative z-20 w-full max-w-[1400px] h-full flex flex-col items-center justify-center"
                >
                    <motion.div
                        style={{ opacity: textOpacity, y: textY, transform: "translateZ(-80px)", willChange: "transform, opacity" }}
                        className="absolute text-center z-0 w-full top-[25%] md:top-[20%]"
                    >
                        <h2 className="text-[#FFE5B4] text-lg md:text-2xl font-sans tracking-[0.8em] uppercase mb-4 font-bold">
                            AI PROJECTS
                        </h2>
                        <h1 className="text-[100px] md:text-[200px] leading-[0.8] font-serif text-white tracking-tighter opacity-90">
                            Business
                        </h1>
                    </motion.div>

                    <motion.div
                        style={{
                            x: personX,
                            scale: 1,
                            opacity: personOpacity,
                            transform: "translateZ(50px)",
                            willChange: "transform, opacity"
                        }}
                        className="relative h-full w-full md:w-[600px] aspect-[4/5] z-30"
                    >
                        <img
                            src={mainPersonImg}
                            alt="AI builder"
                            className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                        />
                        <div className="absolute bottom-[12%] left-0 right-0 flex justify-center z-50">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-white/20 backdrop-blur-xl border border-white/40 text-white px-12 py-5 rounded-full font-bold shadow-2xl transition-all"
                            >
                                Start AI Project
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};

export default HeroComposite;
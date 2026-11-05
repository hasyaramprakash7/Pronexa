import ffmpeg from 'ffmpeg-static';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

// ... keep the rest of the code exactly the same ...

// --- CONFIGURATION ---
const videosToConvert = [
    {
        input: 'src/assets/14739119_1920_1080_50fps.mp4',
        output: 'src/assets/video1_opt.mp4'
    },
    {
        input: 'src/assets/4122569-uhd_3840_2160_24fps.mp4',
        output: 'src/assets/video2_opt.mp4'
    },
    {
        input: 'src/assets/5729005-hd_1920_1080_30fps.mp4',
        output: 'src/assets/video3_opt.mp4'
    },
    {
        input: 'src/assets/6209221-uhd_3840_2160_25fps.mp4',
        output: 'src/assets/video4_opt.mp4'
    }
];

// --- CONVERSION FUNCTION ---
const convertVideo = (index) => {
    if (index >= videosToConvert.length) {
        console.log('\n✨ ALL DONE! You can now update your imports.');
        return;
    }

    const video = videosToConvert[index];
    
    // Check if input file exists
    if (!fs.existsSync(video.input)) {
        console.error(`❌ Error: File not found: ${video.input}`);
        convertVideo(index + 1); // Skip to next
        return;
    }

    console.log(`\nProcessing (${index + 1}/4): ${video.input}...`);

    // Command: Resize to 1920px width, auto height, remove audio (lighter), optimize for web
    const command = `"${ffmpeg}" -i "${video.input}" -vf scale=1920:-2 -an -preset fast -y "${video.output}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error: ${error.message}`);
        } else {
            console.log(`✅ Success! Created: ${video.output}`);
        }
        // Process the next video
        convertVideo(index + 1);
    });
};

// Start the loop
console.log("🚀 Starting Bulk Video Conversion...");
convertVideo(0);
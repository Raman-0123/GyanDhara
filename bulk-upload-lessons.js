/**
 * Bulk Lesson Uploader for GyanDhara
 * 
 * Usage:
 *   node bulk-upload-lessons.js
 * 
 * Customize the lessons array below with your content.
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000';
const TOPIC_ID = 'YOUR-TOPIC-UUID-HERE'; // Replace with actual topic UUID

// Define your lessons
const lessons = [
    {
        position: 1,
        title: 'भारतीय समाचार का परिचय',
        content_html: `
            <h2>समाचार क्या है?</h2>
            <p>समाचार वर्तमान घटनाओं की जानकारी है जो लोगों को सूचित करती है। यह समाज में क्या हो रहा है, इसकी एक तस्वीर प्रस्तुत करता है।</p>
            
            <h3>समाचार के मुख्य तत्व</h3>
            <ul>
                <li><strong>सत्यता</strong>: समाचार सत्य और तथ्यों पर आधारित होना चाहिए</li>
                <li><strong>समयबद्धता</strong>: ताजा और वर्तमान घटनाओं पर केंद्रित</li>
                <li><strong>प्रासंगिकता</strong>: लोगों के जीवन से संबंधित</li>
                <li><strong>महत्व</strong>: समाज के लिए महत्वपूर्ण विषय</li>
            </ul>
            
            <p>समाचार पत्रकारिता का मुख्य उद्देश्य जनता को जानकारी देना और लोकतंत्र को मजबूत करना है।</p>
        `,
        images: [], // Add image file paths if needed: ['./images/news1.jpg']
        audio: null // Add audio file path if needed: './audio/lesson1.mp3'
    },
    {
        position: 2,
        title: 'समाचार के प्रकार',
        content_html: `
            <h2>विभिन्न प्रकार के समाचार</h2>
            
            <h3>1. राजनीतिक समाचार</h3>
            <p>सरकार, चुनाव, नीतियां, और राजनीतिक घटनाओं से संबंधित समाचार।</p>
            
            <h3>2. आर्थिक समाचार</h3>
            <p>व्यापार, शेयर बाजार, अर्थव्यवस्था, और वित्तीय मामलों की जानकारी।</p>
            
            <h3>3. सामाजिक समाचार</h3>
            <p>समाज, संस्कृति, शिक्षा, और सामाजिक मुद्दों पर आधारित समाचार।</p>
            
            <h3>4. खेल समाचार</h3>
            <p>क्रिकेट, फुटबॉल, और अन्य खेलों से संबंधित घटनाएं।</p>
            
            <h3>5. मनोरंजन समाचार</h3>
            <p>फिल्में, संगीत, सेलिब्रिटी, और मनोरंजन उद्योग की खबरें।</p>
        `,
        images: [],
        audio: null
    },
    {
        position: 3,
        title: 'समाचार लेखन के सिद्धांत',
        content_html: `
            <h2>प्रभावी समाचार लेखन</h2>
            
            <h3>5W और 1H का नियम</h3>
            <p>हर समाचार में इन प्रश्नों के उत्तर होने चाहिए:</p>
            <ol>
                <li><strong>Who (कौन)</strong>: घटना में कौन शामिल था?</li>
                <li><strong>What (क्या)</strong>: क्या हुआ?</li>
                <li><strong>When (कब)</strong>: घटना कब हुई?</li>
                <li><strong>Where (कहाँ)</strong>: घटना कहाँ घटी?</li>
                <li><strong>Why (क्यों)</strong>: घटना क्यों हुई?</li>
                <li><strong>How (कैसे)</strong>: घटना कैसे हुई?</li>
            </ol>
            
            <h3>उल्टा पिरामिड संरचना</h3>
            <p>सबसे महत्वपूर्ण जानकारी पहले, फिर विवरण। यह पाठकों को जल्दी से मुख्य बिंदु समझने में मदद करता है।</p>
            
            <blockquote>
                <p>"अच्छी पत्रकारिता सत्य की खोज है और लोकतंत्र की रीढ़ है।"</p>
            </blockquote>
        `,
        images: [],
        audio: null
    }
];

// Function to upload a single lesson
async function uploadLesson(lesson) {
    const formData = new FormData();

    formData.append('topic_id', TOPIC_ID);
    formData.append('position', lesson.position);
    formData.append('title', lesson.title);
    formData.append('content_html', lesson.content_html);

    // Add images if provided
    if (lesson.images && lesson.images.length > 0) {
        for (const imagePath of lesson.images) {
            if (fs.existsSync(imagePath)) {
                formData.append('images', fs.createReadStream(imagePath));
            } else {
                console.warn(`⚠️  Image not found: ${imagePath}`);
            }
        }
    }

    // Add audio if provided
    if (lesson.audio && fs.existsSync(lesson.audio)) {
        formData.append('audio', fs.createReadStream(lesson.audio));
    }

    try {
        const response = await axios.post(`${API_URL}/api/lessons`, formData, {
            headers: formData.getHeaders()
        });

        console.log(`✅ Lesson ${lesson.position} created:`, response.data.lesson.title);
        return response.data;
    } catch (error) {
        console.error(`❌ Failed to create lesson ${lesson.position}:`, error.response?.data || error.message);
        throw error;
    }
}

// Main function to upload all lessons
async function main() {
    console.log('🚀 Starting bulk lesson upload...\n');
    console.log(`📚 Topic ID: ${TOPIC_ID}`);
    console.log(`📝 Total lessons: ${lessons.length}\n`);

    if (TOPIC_ID === 'YOUR-TOPIC-UUID-HERE') {
        console.error('❌ ERROR: Please replace TOPIC_ID with your actual topic UUID');
        process.exit(1);
    }

    for (const lesson of lessons) {
        try {
            await uploadLesson(lesson);
            console.log(`⏳ Waiting 1 second before next upload...\n`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`⚠️  Continuing despite error in lesson ${lesson.position}...\n`);
        }
    }

    console.log('🎉 Bulk upload complete!');
}

// Run the script
main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

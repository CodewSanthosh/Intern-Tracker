import fs from 'fs';

const summaries = [
    "Building an e-commerce platform with an admin dashboard using React and Node.js.",
    "Developing a mobile app for fitness tracking with React Native and Firebase.",
    "Creating a machine learning model for sentiment analysis on Twitter data.",
    "Building an IoT dashboard for tracking temperature sensors in a warehouse.",
    "Designing a portfolio website with a blog. Using Next.js and Markdown.",
    "Developing a hospital management system with patient records and appointments."
];

const progress_stages = {
    early: [
        ["Set up the repository and initial project structure.", 5],
        ["Created the database schema and ran initial migrations.", 15],
        ["Designed the UI wireframes in Figma.", 10],
        ["Set up authentication and login page.", 20],
        ["Configured routing and basic navigation.", 12],
        ["Researched APIs and gathered dataset.", 10]
    ],
    middle: [
        ["Built the core UI components and styling.", 40],
        ["Integrated the main API endpoints for the dashboard.", 50],
        ["Trained the initial model and achieved 70% accuracy.", 60],
        ["Connected the frontend to the backend database.", 45],
        ["Implemented the shopping cart and state management.", 55],
        ["Created the user profile page and settings.", 48]
    ],
    late: [
        ["Fixed bugs and edge cases in the payment gateway.", 85],
        ["Optimized the model to 92% accuracy and deployed to AWS.", 90],
        ["Wrote unit tests and integration tests for the core modules.", 80],
        ["Finalized the responsive design for mobile screens.", 95],
        ["Deployed the web application to Vercel and set up CI/CD.", 100],
        ["Completed the project presentation and documentation.", 100]
    ]
};

const data = [];
const prefixes = ["Today I ", "Finished: ", "Progress: ", "", "I have successfully ", "Worked on: "];

for (let i = 0; i < 1000; i++) {
    const summary = summaries[Math.floor(Math.random() * summaries.length)];
    const stages = Object.keys(progress_stages);
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const stage_items = progress_stages[stage];
    const item = stage_items[Math.floor(Math.random() * stage_items.length)];
    const progress_item = item[0];
    const base_pct = item[1];
    
    let pct = base_pct + Math.floor(Math.random() * 11) - 5;
    pct = Math.max(0, Math.min(100, pct));
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const is_lower = Math.random() > 0.5;
    const text_content = is_lower ? progress_item.toLowerCase() : progress_item;
    const text = prefix + text_content;
    
    data.push(`"${summary}","${text}",${pct}`);
}

const csvHeader = "project_summary,daily_progress,completion_percentage\n";
const csvContent = csvHeader + data.join("\n");

fs.writeFileSync("progress_dataset.csv", csvContent, "utf-8");
console.log(`Generated ${data.length} samples in progress_dataset.csv`);

import csv
import random

summaries = [
    "Building an e-commerce platform with an admin dashboard using React and Node.js.",
    "Developing a mobile app for fitness tracking with React Native and Firebase.",
    "Creating a machine learning model for sentiment analysis on Twitter data.",
    "Building an IoT dashboard for tracking temperature sensors in a warehouse.",
    "Designing a portfolio website with a blog. Using Next.js and Markdown.",
    "Developing a hospital management system with patient records and appointments."
]

progress_stages = {
    "early": [
        ("Set up the repository and initial project structure.", 5),
        ("Created the database schema and ran initial migrations.", 15),
        ("Designed the UI wireframes in Figma.", 10),
        ("Set up authentication and login page.", 20),
        ("Configured routing and basic navigation.", 12),
        ("Researched APIs and gathered dataset.", 10)
    ],
    "middle": [
        ("Built the core UI components and styling.", 40),
        ("Integrated the main API endpoints for the dashboard.", 50),
        ("Trained the initial model and achieved 70% accuracy.", 60),
        ("Connected the frontend to the backend database.", 45),
        ("Implemented the shopping cart and state management.", 55),
        ("Created the user profile page and settings.", 48)
    ],
    "late": [
        ("Fixed bugs and edge cases in the payment gateway.", 85),
        ("Optimized the model to 92% accuracy and deployed to AWS.", 90),
        ("Wrote unit tests and integration tests for the core modules.", 80),
        ("Finalized the responsive design for mobile screens.", 95),
        ("Deployed the web application to Vercel and set up CI/CD.", 100),
        ("Completed the project presentation and documentation.", 100)
    ]
}

data = []

# Generate 800 samples
for _ in range(800):
    summary = random.choice(summaries)
    
    stage = random.choice(list(progress_stages.keys()))
    progress_item, base_pct = random.choice(progress_stages[stage])
    
    # Add a little noise to the percentage so it's not always a flat 50 or 10
    pct = max(0, min(100, base_pct + random.randint(-5, 5)))
    
    prefixes = [
        "Today I ", 
        "Finished: ", 
        "Progress: ", 
        "", 
        "I have successfully ",
        "Worked on: "
    ]
    
    # Randomly lowercase some entries to simulate user input variations
    is_lower = random.choice([True, False])
    text_content = progress_item.lower() if is_lower else progress_item
    text = random.choice(prefixes) + text_content
    
    data.append([summary, text, pct])

# Write to CSV
file_name = "progress_dataset.csv"
with open(file_name, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["project_summary", "daily_progress", "completion_percentage"])
    writer.writerows(data)

print(f"Generated {len(data)} samples in {file_name}")

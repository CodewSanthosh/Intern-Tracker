import sys
import json
import warnings
import os
import logging

# Suppress annoying warnings
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)

# Loading message to stderr so it doesn't break stdout JSON parsing
print("Loading ML model...", file=sys.stderr)
from sentence_transformers import SentenceTransformer, util
import numpy as np

# Use the lightweight model
model = SentenceTransformer('all-MiniLM-L6-v2')


def split_sentences(text):
    """Split text into individual sentences for granular comparison."""
    import re
    # Split on period, exclamation, question mark, or newline
    sentences = re.split(r'[.!?\n]+', text)
    # Filter out empty/trivial sentences
    return [s.strip() for s in sentences if len(s.strip().split()) >= 3]


def is_gibberish(text):
    """Quick check if text is keyboard-mash or random characters."""
    words = text.split()
    if not words:
        return True
    
    vowels = set('aeiouAEIOU')
    gibberish_count = 0
    
    for word in words:
        alpha_chars = [c for c in word if c.isalpha()]
        if len(alpha_chars) < 4:
            continue
        vowel_count = sum(1 for c in alpha_chars if c in vowels)
        consonant_ratio = 1 - (vowel_count / max(1, len(alpha_chars)))
        if consonant_ratio > 0.8 and len(alpha_chars) > 5:
            gibberish_count += 1
    
    # If more than 30% of substantial words are gibberish
    substantial_words = [w for w in words if len(w) > 3]
    if substantial_words and gibberish_count / max(1, len(substantial_words)) > 0.3:
        return True
    return False


def get_similarity(target, progress, targets=""):
    """
    Compute semantic similarity between reference context and progress text.
    
    Args:
        target: Project summary / Week 0 description
        progress: Combined progress text from all submissions
        targets: All period targets concatenated (optional enriched context)
    
    Returns:
        Similarity percentage (0-100)
    """
    if not target or not progress.strip() or progress.strip() == "-":
        return 0
    
    # Garbage filter: very short or gibberish
    words = [w for w in progress.split() if w.isalpha() and len(w) > 2]
    if len(words) < 2:
        return 0
    
    # Gibberish check
    if is_gibberish(progress):
        return 0
    
    # Build enriched reference text
    reference_text = target
    if targets and targets.strip():
        reference_text = target + ". " + targets
    
    # ── Outcome Coverage Comparison ──
    # To measure OVERALL completion, we must see how much of the REFERENCE is covered.
    reference_sentences = split_sentences(reference_text)
    if not reference_sentences:
        reference_sentences = [reference_text]
        
    progress_sentences = split_sentences(progress)
    if not progress_sentences:
        progress_sentences = [progress]
        
    ref_vecs = model.encode(reference_sentences)
    prog_vecs = model.encode(progress_sentences)
    
    # For every required outcome (reference sentence), how well did progress satisfy it?
    target_coverage_scores = []
    
    for r_vec in ref_vecs:
        # Find the best matching progress line for this specific requirement
        best_match_sim = 0
        for p_vec in prog_vecs:
            sim = util.cos_sim(r_vec, p_vec).item()
            best_match_sim = max(best_match_sim, sim)
            
        # EXTREMELY STRICT NOISE GATE
        # MiniLM usually gives ~0.1 to 0.45 for partially related text due to shared language space.
        if best_match_sim < 0.45:
            target_coverage_scores.append(0)
        else:
            # Scale from 0.45 -> 1.0 to 0 -> 100
            normalized_score = ((best_match_sim - 0.45) / 0.55) * 100
            # Apply an exponential penalty for low matches so that early initializations score very low
            # e.g. 20% match becomes 4%, 50% match becomes 25% (normalized down)
            penalized_score = (normalized_score ** 1.3) / (100 ** 0.3)
            target_coverage_scores.append(penalized_score)
        
    # The completion is the average satisfaction of ALL required outcomes
    avg_score = np.mean(target_coverage_scores) if target_coverage_scores else 0
    
    # Final sanity divide: to ensure just doing initial setup doesn't inflate,
    # we enforce that a project is a sum of many complex parts. 
    score = int(avg_score * 0.7)
    
    if score > 100:
        return 100
    if score < 0:
        return 0
        
    return int(score)


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        target = sys.argv[1]
        progress = sys.argv[2]
        # Optional 3rd arg: all period targets
        targets = sys.argv[3] if len(sys.argv) >= 4 else ""
        sim_pct = get_similarity(target, progress, targets)
        print(json.dumps({"similarity": sim_pct}))
    else:
        # Default test case if run manually without args
        target = "React dashboard database project"
        progress = "Building UI using React"
        sim_pct = get_similarity(target, progress)
        print(json.dumps({"similarity": sim_pct, "test_mode": True}))

import sys
import json
import warnings
import os

warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import logging
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)

from sentence_transformers import SentenceTransformer, util

# ✅ Load best-quality semantic similarity model
# all-mpnet-base-v2 = highest accuracy on STS benchmarks among sentence-transformers
model = SentenceTransformer('all-mpnet-base-v2')


# 🔹 Clean text
def clean_text(text):
    return text.lower().strip()


# 🔹 Known junk/filler phrases that should never count as progress
JUNK_PHRASES = {
    "-", "--", "na", "n/a", "nil", "none", "nothing", "no", "nope",
    "ok", "okay", "yes", "done", "fine", "good", "completed", "k",
    "idk", "hmm", "lol", "haha", "hi", "hello", "hey", "bye",
    "asdf", "qwerty", "test", "testing", "1234", "abcd", "aaa", "bbb",
    "xyz", "random", "blah", "etc", "something", "anything", "stuff"
}

# 🔹 Keyboard row patterns — used to detect keyboard mashing
KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]


# 🔹 Junk/gibberish detector — returns True if progress is meaningless
def is_junk(text):
    t = text.strip().lower()

    # Empty or placeholder
    if not t or t in JUNK_PHRASES:
        return True

    # Too short to be meaningful (less than 5 chars)
    if len(t) < 5:
        return True

    # Must have at least 2 words of real content
    words = [w for w in t.split() if len(w) > 1]
    if len(words) < 2:
        return True

    # Must be mostly alphabetic (> 50% alpha chars)
    alpha_count = sum(1 for c in t if c.isalpha())
    if alpha_count / len(t) < 0.50:
        return True

    # Detect keyboard mashing — 4+ consecutive chars from same keyboard row
    for row in KEYBOARD_ROWS:
        for i in range(len(row) - 3):
            if row[i:i+4] in t.replace(" ", ""):
                return True

    # Detect excessive character repetition (e.g. "aaaaaaa", "hhhhhh")
    for ch in set(t):
        if ch.isalpha() and t.count(ch) > max(3, len(t) * 0.40):
            return True

    # Low character variety — fewer than 4 unique letters
    unique_letters = len({c for c in t if c.isalpha()})
    if unique_letters < 4:
        return True

    return False


# 🔹 Split targets: ; and \n are BOTH task boundaries — each chunk = 1 complete task
def decompose_targets(target_text):
    tasks = []
    for line in target_text.split("\n"):
        for part in line.split(";"):
            t = clean_text(part)
            if t:
                tasks.append(t)
    return tasks


# 🔹 Common stopwords to ignore during keyword matching
STOPWORDS = {
    "the","a","an","is","are","was","were","be","been","being",
    "have","has","had","do","does","did","will","would","could","should",
    "may","might","shall","can","to","of","in","for","on","with","at",
    "by","from","up","about","into","through","during","and","or","but",
    "if","then","that","this","these","those","i","we","my","our","your",
    "its","it","he","she","they","them","their","what","which","who",
    "how","all","each","both","few","more","most","other","such","no",
    "not","only","same","so","than","too","very","just","also","as"
}

def keyword_overlap_score(task_text, progress):
    """
    Extract meaningful keywords from the target and check how many
    appear (or are substrings) in the progress. Returns 0–20 boost points.
    """
    task_words   = {w for w in clean_text(task_text).split() if w not in STOPWORDS and len(w) > 2}
    prog_words   = {w for w in clean_text(progress).split()  if w not in STOPWORDS and len(w) > 2}
    prog_joined  = clean_text(progress)

    if not task_words:
        return 0

    matched = sum(
        1 for tw in task_words
        if tw in prog_words or tw in prog_joined   # exact word OR substring match
    )
    ratio = matched / len(task_words)
    return int(ratio * 20)   # max +20 bonus points


# 🔹 Compute similarity for ONE complete task (Hybrid: semantic + keyword)
def get_similarity(task_text, progress):
    progress = clean_text(progress)

    if not progress or progress == "-":
        return 0

    # 🛑 Reject junk/gibberish progress — never let it count
    if is_junk(progress):
        return 0

    p_vec = model.encode(progress, show_progress_bar=False)

    # ── Semantic similarity (all-mpnet-base-v2) ──────────────────────────
    t_vec = model.encode(clean_text(task_text), show_progress_bar=False)
    sem_score = max(0, min(100, int(util.cos_sim(t_vec, p_vec).item() * 100)))

    # Also check sub-phrases split by ' and '
    sub_phrases = [clean_text(p) for p in task_text.split(" and ") if clean_text(p)]
    if len(sub_phrases) > 1:
        for sub in sub_phrases:
            if len(sub.split()) >= 2:
                sv = model.encode(sub, show_progress_bar=False)
                score = max(0, min(100, int(util.cos_sim(sv, p_vec).item() * 100)))
                sem_score = max(sem_score, score)

    # ── Keyword overlap boost ─────────────────────────────────────────────
    kw_boost = keyword_overlap_score(task_text, progress)

    # Final score = semantic + keyword boost (capped at 100)
    return min(100, sem_score + kw_boost)


# 🔹 Main function
def calculate_completion(target_text, progress_list, total_slots=7):
    tasks = decompose_targets(target_text)  # ; and \n are task boundaries

    if not tasks:
        return {"similarity": 0}

    completed = 0
    details = []

    for task in tasks:
        best_score = 0

        for progress in progress_list:
            score = get_similarity(task, progress)
            best_score = max(best_score, score)

        # ✅ Whole task done if best score >= 60 (matches whole phrase OR any 'and'-sub-phrase)
        is_done = best_score >= 60

        if is_done:
            completed += 1

        details.append({
            "task": task,
            "score": best_score,
            "completed": is_done
        })

    # 🔹 Use total_slots as the base for 100% calculation
    completion = int((completed / total_slots) * 100)

    return {
        "similarity": min(100, completion),
        "total_tasks_found": len(tasks),
        "completed_count": completed,
        "total_slots": total_slots,
        "details": details
    }


# 🔹 CLI
if __name__ == "__main__":
    if len(sys.argv) >= 4:
        target = sys.argv[1]
        progress_json = sys.argv[2]
        total_slots = int(sys.argv[3])

        try:
            progress_list = json.loads(progress_json)
        except:
            progress_list = [progress_json]

        result = calculate_completion(target, progress_list, total_slots)
        print(json.dumps(result))

    else:
        # ✅ TEST CASE (this SHOULD NOT return 0 now)
        target = """setup project, design database, implement login,
build UI, file upload, testing"""

        progress_list = [
            "Initialized React and Express project",
            "Created MongoDB schema",
            "Built login API",
            "Developed UI using React"
        ]

        result = calculate_completion(target, progress_list)
        print(json.dumps(result, indent=2))
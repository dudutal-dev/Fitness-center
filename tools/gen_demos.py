"""Generate exercise demo loops: per coach x exercise -> start-frame image (same person as the coach portrait)
-> 4s seamless video loop (start_frame == end_frame). Resumable via assets/_src/demos_state.json."""
import json, os, sys, threading
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
import el

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "assets", "_src")
STATE_F = os.path.join(SRC, "demos_state.json")
DEMOS = json.load(open(os.path.join(os.path.dirname(__file__), "demos.json")))
COACH_GEN = json.load(open(os.path.join(SRC, "coaches.json")))
WHO = {"ori": "the same man from the reference image (same face, hair, stubble, same black t-shirt with lime piping and black shorts)",
       "noa": "the same woman from the reference image (same face, dark ponytail, same black sports top with lime piping and black leggings)"}
SCENE = ("in a dark premium modern gym with teal and electric-lime accent lighting. Full body visible, centered, vertical 9:16 framing, "
         "photorealistic. No text, no logos, no brand names.")
lock = threading.Lock()
state = json.load(open(STATE_F)) if os.path.exists(STATE_F) else {}

def save():
    with lock:
        json.dump(state, open(STATE_F, "w"), indent=1)

def job(coach, ex):
    key = f"{coach}/{ex}"
    st = state.setdefault(key, {})
    pose, motion = DEMOS[ex]
    try:
        if "img" not in st:
            gid = el.create("image", {"model_id": "gemini-3.1-flash-image", "resolution": "1K", "aspect_ratio": "9:16",
                                      "images": [{"type": "generation", "generation_id": COACH_GEN[coach]}],
                                      "prompt": f"Photo of {WHO[coach]} {pose}, {SCENE}"})
            r = el.wait("image", gid)
            el.download(r["content_url"], os.path.join(SRC, "demos", coach, f"{ex}.png"))
            st["img"] = gid; save()
        if "vid" not in st:
            ref = {"type": "generation", "generation_id": st["img"]}
            body = {"model_id": "veo-3.1-fast-generate-001", "duration_secs": 4, "resolution": "720p", "aspect_ratio": "9:16",
                    "generate_audio": False, "start_frame": ref,
                    "prompt": f"The athlete {motion}. Smooth realistic human motion, correct technique, fixed static camera, {SCENE}"}
            if ex not in ("farmer_carry", "sled_push", "treadmill_run", "battle_rope"):
                body["end_frame"] = ref  # seamless loop
            gid = el.create("video", body)
            r = el.wait("video", gid)
            el.download(r["content_url"], os.path.join(SRC, "demos", coach, f"{ex}.mp4"))
            st["vid"] = gid; save()
        return key, "ok"
    except Exception as e:  # keep going, rerun to resume
        return key, f"ERR {e}"

if __name__ == "__main__":
    only = sys.argv[1:]  # optional list of exercise ids
    jobs = [(c, e) for e in DEMOS for c in ("ori", "noa") if not only or e in only]
    with ThreadPoolExecutor(8) as ex:
        for key, res in ex.map(lambda a: job(*a), jobs):
            print(key, res, flush=True)

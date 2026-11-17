"""Generate the two virtual coach portraits (Ori - male, Noa - female)."""
import json, os, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
import el

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "_src")
STYLE = ("dark premium futuristic gym with moody teal and electric-lime rim lighting, shallow depth of field, "
         "photorealistic editorial fitness photography, 85mm, cinematic. Absolutely no text, no logos, no brand names, no lettering anywhere.")
COACHES = {
    "ori": "Portrait of Ori, a confident athletic Israeli male personal trainer, about 30, short dark hair faded on the sides, light stubble, "
           "warm determined smile, muscular but lean, wearing a plain fitted charcoal-black performance t-shirt with thin lime-green piping and black shorts, "
           "arms crossed, standing, waist-up framing. " + STYLE,
    "noa": "Portrait of Noa, a confident athletic Israeli female personal trainer, about 28, long dark-brown hair in a high ponytail, "
           "bright energetic smile, toned and strong, wearing a plain charcoal-black sports top with thin lime-green piping and black high-waist leggings, "
           "hands on hips, standing, waist-up framing. " + STYLE,
}

def run(cid):
    gid = el.create("image", {"model_id": "gemini-3.1-flash-image", "resolution": "2K", "aspect_ratio": "3:4", "prompt": COACHES[cid]})
    r = el.wait("image", gid)
    el.download(r["content_url"], os.path.join(OUT, f"coach_{cid}.png"))
    return cid, gid

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    with ThreadPoolExecutor(2) as ex:
        res = dict(ex.map(run, COACHES))
    json.dump(res, open(os.path.join(OUT, "coaches.json"), "w"), indent=1)
    print(res)

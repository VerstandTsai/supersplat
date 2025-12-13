import numpy as np
import torch
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from PIL import Image
from flask import Flask, make_response, request
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

class Segmentor:
    def __init__(self) -> None:
        self.predictor = SAM2ImagePredictor(build_sam2(
            "configs/sam2.1/sam2.1_hiera_l.yaml",
            "../sam2/checkpoints/sam2.1_hiera_large.pt",
            device=torch.device("cuda:2")
        ))

    def get_mask(self, image: np.ndarray, box: np.ndarray) -> np.ndarray:
        self.predictor.set_image(image)
        with torch.inference_mode(), torch.autocast("cuda", dtype=torch.bfloat16):
            masks, _, _ = self.predictor.predict(box=box[None, :], multimask_output=False)
        return masks[0]

def color_mask(mask: np.ndarray, color: np.ndarray) -> np.ndarray:
    h, w = mask.shape[-2:]
    mask = mask.astype(np.uint8)
    mask_image = mask.reshape(h, w, 1) * color.reshape(1, 1, -1)
    return mask_image

def show_box(box: np.ndarray, ax) -> None:
    x0, y0 = box[0], box[1]
    w, h = box[2] - box[0], box[3] - box[1]
    ax.add_patch(Rectangle((x0, y0), w, h, edgecolor='green', facecolor=(0, 0, 0, 0), lw=2))

#torch.cuda.empty_cache()
seg = Segmentor()
app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def root():
    if request.method == 'GET':
        return '<p>Hello, world!</p>'

    box = np.array([int(request.form['x0']), int(request.form['y0']), int(request.form['x1']), int(request.form['y1'])])
    size = (int(request.form['width']), int(request.form['height']))
    data = request.files['rendering'].read()
    image = np.array(Image.frombytes('RGBA', size, data).convert('RGB'))

    mask = seg.get_mask(image, box)
    mask_image = color_mask(mask, np.array([255, 102, 0, 255], dtype=np.uint8))
    response = make_response(mask_image.tobytes())
    response.headers.set('Content-Type', 'application/octet-stream')
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response


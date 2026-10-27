#!/usr/bin/env python3
"""Generate zoo art with Qwen Image 2.1 through a running ComfyUI (default http://127.0.0.1:8188).

Usage: comfy_gen.py "prompt" --out file.png [--source img.png] [--ref img.png ...] [--seed N] [--model turbo|full]
       [--width 1024 --height 1024]

Unlike a plain LoadImage, source and reference images keep their alpha channel: LoadImage splits
RGBA into colour + mask, so the two are joined back before they reach the encoder. The Qwen Image 2.1
VAE decodes four channels and SaveImage writes them as an RGBA PNG.
"""
import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

SERVER = os.environ.get("COMFY_URL", "http://127.0.0.1:8188")

# name -> (diffusion model, text encoder, default steps)
MODELS = {
    "turbo": ("qwen_image_2.1_turbo_Q6_K.gguf", "qwen3vl_8b_w4a8.safetensors", 4),
    "full": ("qwen_image_2.1_Q8_0.gguf", "qwen3vl_8b_int8_convrot.safetensors", 25),
}


def workflow(prompt, width, height, steps, seed, images, model, has_source):
    unet, clip, _ = MODELS[model]
    wf = {
        "unet": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": unet}},
        "clip": {"class_type": "CLIPLoader", "inputs": {"clip_name": clip, "type": "qwen_image", "device": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_2.1_vae_bf16.safetensors"}},
        "enc": {"class_type": "TextEncodeQwenImage21", "inputs": {
            "clip": ["clip", 0], "prompt": prompt, "negative_prompt": "", "resolution": 1024}},
        "sample": {"class_type": "KSampler", "inputs": {
            "model": ["unet", 0], "positive": ["enc", 0], "negative": ["enc", 1],
            # with a source image the encoder's latent matches its size; other sizes shift the edit
            "latent_image": ["enc", 2] if has_source else ["empty", 0],
            "seed": seed, "steps": steps, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "decode": {"class_type": "VAEDecode", "inputs": {"samples": ["sample", 0], "vae": ["vae", 0]}},
        "save": {"class_type": "SaveImage", "inputs": {"images": ["decode", 0], "filename_prefix": "zoo/art"}},
    }
    if not has_source:
        wf["empty"] = {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}}
    if images:
        wf["enc"]["inputs"]["vae"] = ["vae", 0]
    for i, name in enumerate(images, start=1):
        wf[f"load{i}"] = {"class_type": "LoadImage", "inputs": {"image": name}}
        wf[f"rgba{i}"] = {"class_type": "JoinImageWithAlpha", "inputs": {"image": [f"load{i}", 0], "alpha": [f"load{i}", 1]}}
        wf["enc"]["inputs"][f"images.image_{i}"] = [f"rgba{i}", 0]
    return wf


def call(path, data=None, raw=False):
    req = urllib.request.Request(SERVER + path, data=json.dumps(data).encode() if data is not None else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        body = resp.read()
    return body if raw else json.loads(body)


def upload(path):
    boundary = uuid.uuid4().hex
    with open(path, "rb") as f:
        data = f.read()
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{os.path.basename(path)}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + data + \
           f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(SERVER + "/upload/image", data=body,
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["name"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prompt")
    ap.add_argument("--out", required=True)
    ap.add_argument("--source", help="image to edit, <image1> in the prompt; sets the output size")
    ap.add_argument("--ref", action="append", default=[], help="reference image, numbered after the source")
    ap.add_argument("--model", choices=MODELS, default="turbo")
    ap.add_argument("--steps", type=int)
    ap.add_argument("--seed", type=int)
    ap.add_argument("--width", type=int, default=1024)
    ap.add_argument("--height", type=int, default=1024)
    ap.add_argument("--timeout", type=int, default=1800)
    args = ap.parse_args()

    images = [upload(p) for p in ([args.source] if args.source else []) + args.ref]
    seed = args.seed if args.seed is not None else random.randint(0, 2**48)
    steps = args.steps or MODELS[args.model][2]
    wf = workflow(args.prompt, args.width, args.height, steps, seed, images, args.model, bool(args.source))
    try:
        prompt_id = call("/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})["prompt_id"]
    except urllib.error.HTTPError as e:
        sys.exit(f"ComfyUI rejected the workflow: {e.read().decode()}")

    start = time.time()
    while True:
        entry = call(f"/history/{prompt_id}").get(prompt_id)
        if entry:
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                sys.exit(f"generation failed: {json.dumps(status.get('messages'), indent=2)}")
            if status.get("completed"):
                break
        if time.time() - start > args.timeout:
            sys.exit(f"timed out after {args.timeout}s")
        time.sleep(2)

    image = entry["outputs"]["save"]["images"][0]
    with open(args.out, "wb") as f:
        f.write(call("/view?" + urllib.parse.urlencode(image), raw=True))
    print(f"{args.out} (seed {seed}, {time.time() - start:.0f}s)")


if __name__ == "__main__":
    main()

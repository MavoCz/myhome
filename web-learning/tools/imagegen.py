#!/usr/bin/env python3
"""Generate zoo art with Qwen Image 2.1 through the image generator on the LAN.

Usage: imagegen.py "prompt" --out out.png [--seed 501] [--count 3] [--transparent] [--size 1024]

With --count N, a fixed seed gives seed, seed+1 ... and the files are named out-<seed>.png.
The model is always qwen: the server's other checkpoints are not suitable for a children's app.
API: GET http://192.168.2.225:8290/api/docs. Python stdlib plus curl.
Requests go through curl because macOS Local Network privacy blocks Python in herdr-core sessions.
"""
import argparse
import json
import os
import random
import subprocess
import sys
import time

SERVER = os.environ.get("IMAGEGEN_URL", "http://192.168.2.225:8290")


def curl(path, *args, body=None):
    data = None if body is None else json.dumps(body).encode()
    command = ["curl", "-sSf", "-m", "60", *args]
    if data is not None:
        command += ["-X", "POST", "-H", "Content-Type: application/json", "--data-binary", "@-"]
    return subprocess.run([*command, SERVER + path], input=data, stdout=subprocess.PIPE, check=True).stdout


def call(path, body=None):
    return json.loads(curl(path, body=body))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prompt")
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int)
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--transparent", action="store_true")
    ap.add_argument("--size", type=int, default=1024)
    ap.add_argument("--timeout", type=int, default=1800)
    args = ap.parse_args()

    seed = random.randrange(2**31) if args.seed is None else args.seed
    created = call("/api/jobs", {
        "prompt": args.prompt, "model": "qwen", "width": args.size, "height": args.size,
        "steps": 25, "cfg": 1, "sampler": "euler", "scheduler": "simple",
        "transparent": args.transparent, "seed": seed, "count": args.count,
    })["jobs"]
    ids = {job["id"] for job in created}

    deadline = time.time() + args.timeout
    while True:
        jobs = [job for job in call("/api/jobs")["jobs"] if job["id"] in ids]
        if all(job["status"] not in ("queued", "running") for job in jobs):
            break
        if time.time() > deadline:
            sys.exit(f"timed out, jobs still on the server: {sorted(ids)}")
        time.sleep(5)

    root, ext = os.path.splitext(args.out)
    failed = False
    for job in jobs:
        if job["status"] != "done":
            print(f"job {job['id']} seed {job['seed']}: {job['status']} {job.get('error') or ''}", file=sys.stderr)
            failed = True
            continue
        out = args.out if args.count == 1 else f"{root}-{job['seed']}{ext}"
        curl(f"/img/{job['files'][0]}", "-o", out)
        call("/api/delete", {"id": job["id"]})
        print(f"{out} seed {job['seed']}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
CORTEX Git — 100% Pure, Single-Window Master Video Production Pipeline
Eliminates all background desktop windows (Spotify, LinkedIn, desktop icons)
Features:
  - Pure 1920x1080 terminal recording (/tmp/cortex-git-terminal-pure.mp4) via VHS
  - Pure Cloudflare Dashboard exclusive tab recording (/tmp/cortex_cf_tabs_exclusive.mp4)
  - Pristine 1080p conceptual intro/architecture/outro slides
  - San Francisco typography PIL overlays (no other windows visible)
  - High-definition Samantha narration
  - Apple Silicon VideoToolbox hardware acceleration
  - Concatenation to /Users/isheriffgomes/Downloads/cortex-git-video-production/cortex-git-demo.mp4
"""

import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

WORK_DIR = "/Users/isheriffgomes/Downloads/cortex-git-video-production/full-production"
OUTPUT_VIDEO = "/Users/isheriffgomes/Downloads/cortex-git-video-production/cortex-git-demo.mp4"
ARCHIVE_VIDEO = "/Users/isheriffgomes/Downloads/cortex-git-video-production/cortex-git-demo-full-5min.mp4"
os.makedirs(WORK_DIR, exist_ok=True)

PURE_TERMINAL_VIDEO = "/tmp/cortex-git-terminal-pure.mp4"
PURE_CLOUDFLARE_D1_VIDEO = "/tmp/cortex_cf_d1_exclusive.mp4"
PURE_CLOUDFLARE_WF_VIDEO = "/tmp/cortex_cf_wf_worker_exclusive.mp4"

def create_overlay(badge_text, out_path):
    img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([(0, 0), (1920, 120)], fill=(10, 15, 29, 248))
    draw.line([(0, 120), (1920, 120)], fill=(243, 128, 32, 180), width=2)

    # Footer bar
    draw.rectangle([(0, 960), (1920, 1080)], fill=(10, 15, 29, 248))
    draw.line([(0, 960), (1920, 960)], fill=(255, 255, 255, 30), width=2)

    try:
        font_bold = ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', 24)
        font_sub = ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', 16)
        font_badge = ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', 15)
    except Exception:
        font_bold = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_badge = ImageFont.load_default()

    # Header text
    draw.text((48, 44), '⚡ CORTEX Git', fill=(248, 250, 252, 255), font=font_bold)
    draw.text((220, 50), 'CLOUDFLARE WORKERS & ARTIFACTS', fill=(243, 128, 32, 255), font=font_sub)

    # Badge on right
    bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
    text_w = bbox[2] - bbox[0]
    badge_x1 = 1872 - text_w - 32
    draw.rounded_rectangle([(badge_x1, 36), (1872, 84)], radius=8, fill=(56, 189, 248, 30), outline=(56, 189, 248, 140), width=1)
    draw.text((badge_x1 + 16, 48), badge_text, fill=(56, 189, 248, 255), font=font_badge)

    # Footer text
    draw.text((48, 1008), 'Cloudflare Connect 2026 Challenge Submission', fill=(148, 163, 184, 255), font=font_sub)
    draw.text((1350, 1008), 'Rodrigo Gomes (OConnector Technology) • Apache-2.0', fill=(148, 163, 184, 255), font=font_sub)

    img.save(out_path, 'PNG')
    return out_path

def get_duration(media_file):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', media_file]).decode().strip()
    return float(out)

scenes = [
    {
        "id": "scene_01",
        "type": "slide",
        "title": "01 / 10 • The Problem",
        "slide_png": f"{WORK_DIR}/scene_01.png",
        "audio_aac": f"{WORK_DIR}/scene_01.aac"
    },
    {
        "id": "scene_02",
        "type": "slide",
        "title": "02 / 10 • Architecture",
        "slide_png": f"{WORK_DIR}/scene_02.png",
        "audio_aac": f"{WORK_DIR}/scene_02.aac"
    },
    {
        "id": "scene_03",
        "type": "slide",
        "title": "03 / 10 • Repository & Setup",
        "slide_png": f"{WORK_DIR}/scene_03.png",
        "audio_aac": f"{WORK_DIR}/scene_03.aac"
    },
    {
        "id": "scene_04",
        "type": "video",
        "title": "04 / 10 • Scenario A: Safe Mutation (ALLOW)",
        "source_mov": PURE_TERMINAL_VIDEO,
        "seek": "00:00:00",
        "badge": "REAL EXECUTION • SCENARIO A: SAFE MUTATION (ALLOW) • EXIT CODE 0",
        "audio_aac": f"{WORK_DIR}/scene_04.aac"
    },
    {
        "id": "scene_05",
        "type": "video",
        "title": "05 / 10 • Scenario B: Secret Detection (DENY)",
        "source_mov": PURE_TERMINAL_VIDEO,
        "seek": "00:00:20",
        "badge": "REAL EXECUTION • SCENARIO B: CONFIGURED SECRET PATTERN (DENY)",
        "audio_aac": f"{WORK_DIR}/scene_05.aac"
    },
    {
        "id": "scene_06",
        "type": "video",
        "title": "06 / 10 • Scenario C: Sensitive Mutation (ESCALATE -> Quorum)",
        "source_mov": PURE_TERMINAL_VIDEO,
        "seek": "00:00:42",
        "badge": "REAL EXECUTION • SCENARIO C: SENSITIVE MUTATION • M-OF-N HUMAN QUORUM",
        "audio_aac": f"{WORK_DIR}/scene_06.aac"
    },
    {
        "id": "scene_07",
        "type": "video",
        "title": "07 / 10 • Scenario D: Two-Agent Conflict Triage",
        "source_mov": PURE_TERMINAL_VIDEO,
        "seek": "00:01:02",
        "badge": "REAL EXECUTION • SCENARIO D: TWO-AGENT LINE-CONFLICT RESOLUTION",
        "audio_aac": f"{WORK_DIR}/scene_07.aac"
    },
    {
        "id": "scene_08",
        "type": "video",
        "title": "08 / 10 • Scenario E: Idempotent Replay",
        "source_mov": PURE_TERMINAL_VIDEO,
        "seek": "00:01:20",
        "badge": "REAL EXECUTION • SCENARIO E: DUPLICATE EVENT RECOGNIZED",
        "audio_aac": f"{WORK_DIR}/scene_08.aac"
    },
    {
        "id": "scene_09a",
        "type": "video",
        "title": "09A / 10 • Cloudflare D1 Governance State",
        "source_mov": PURE_CLOUDFLARE_D1_VIDEO,
        "seek": "00:00:00",
        "badge": "CLOUDFLARE DASHBOARD • LIVE D1 GOVERNANCE STATE",
        "audio_aac": f"{WORK_DIR}/scene_09a.aac"
    },
    {
        "id": "scene_09b",
        "type": "video",
        "title": "09B / 10 • Cloudflare Workflows & Worker Tabs",
        "source_mov": PURE_CLOUDFLARE_WF_VIDEO,
        "seek": "00:00:00",
        "badge": "CLOUDFLARE DASHBOARD • WORKFLOW INSTANCES & WORKER TOPOLOGY",
        "audio_aac": f"{WORK_DIR}/scene_09b.aac"
    },
    {
        "id": "scene_10",
        "type": "slide",
        "title": "10 / 10 • Scope, Capabilities & Summary",
        "slide_png": f"{WORK_DIR}/scene_10.png",
        "audio_aac": f"{WORK_DIR}/scene_10.aac"
    }
]

def main():
    print("=" * 80)
    print("  🚀 CORTEX Git — Pure Single-Window Master Video Assembly Pipeline")
    print("=" * 80)

    encoded_segments = []
    total_projected = 0.0

    for idx, sc in enumerate(scenes):
        print(f"\n[Scene {idx+1}/{len(scenes)}] Processing {sc['id']}: {sc['title']}...")

        audio_dur = get_duration(sc["audio_aac"])
        scene_dur = audio_dur + 1.2
        total_projected += scene_dur
        print(f"  ✓ Narration Audio: {audio_dur:.1f}s (Segment total: {scene_dur:.1f}s)")

        segment_mp4 = f"{WORK_DIR}/{sc['id']}_pure_encoded.mp4"

        if sc["type"] == "slide":
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", sc["slide_png"],
                "-i", sc["audio_aac"],
                "-c:v", "h264_videotoolbox", "-b:v", "5M",
                "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                "-t", f"{scene_dur:.2f}",
                segment_mp4
            ]
            subprocess.run(cmd, capture_output=True, check=True)
            print(f"  ✓ Encoded Slide Segment: {os.path.basename(segment_mp4)}")

        elif sc["type"] == "video":
            overlay_png = f"{WORK_DIR}/{sc['id']}_overlay.png"
            create_overlay(sc["badge"], overlay_png)

            # Center video into 1920x840 between top and bottom bars, zero background clutter
            filter_str = (
                "[0:v]scale=1920:840[scaled];"
                "color=c=0x0a0f1d:s=1920x1080:r=30[bg];"
                "[bg][scaled]overlay=0:120[comp];"
                "[comp][1:v]overlay=0:0[outv]"
            )

            cmd = [
                "ffmpeg", "-y",
                "-ss", sc["seek"], "-t", f"{scene_dur:.2f}",
                "-i", sc["source_mov"],
                "-loop", "1", "-i", overlay_png,
                "-i", sc["audio_aac"],
                "-filter_complex", filter_str,
                "-map", "[outv]", "-map", "2:a",
                "-c:v", "h264_videotoolbox", "-b:v", "5M",
                "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                "-t", f"{scene_dur:.2f}",
                segment_mp4
            ]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode != 0:
                print(f"Error encoding video {sc['id']}:", res.stderr[-500:])
                raise RuntimeError(f"FFmpeg failed on {sc['id']}")
            print(f"  ✓ Encoded Pure Video Segment: {os.path.basename(segment_mp4)}")

        encoded_segments.append(segment_mp4)

    print("\n" + "-" * 80)
    print(f"Projected Total Duration: {total_projected:.1f}s ({total_projected/60:.2f} minutes)")
    print("-" * 80)

    # Concatenate all segments
    print("\nStitching pure master video...")
    concat_list = f"{WORK_DIR}/pure_concat_list.txt"
    with open(concat_list, "w") as f:
        for seg in encoded_segments:
            f.write(f"file '{seg}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        OUTPUT_VIDEO
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    subprocess.run(["cp", "-f", OUTPUT_VIDEO, ARCHIVE_VIDEO])

    final_dur = get_duration(OUTPUT_VIDEO)
    mins = int(final_dur // 60)
    secs = int(final_dur % 60)
    size_mb = os.path.getsize(OUTPUT_VIDEO) / (1024 * 1024)

    print("\n" + "=" * 80)
    print("  🏆 SUCCESS: Pure Master Video Produced (Zero Other Windows)!")
    print(f"  • File: {OUTPUT_VIDEO}")
    print(f"  • Size: {size_mb:.1f} MB")
    print(f"  • Exact Duration: {final_dur:.1f}s ({mins}m {secs}s)")
    print(f"  • Criteria: >= 6m (360s) -> {'PASSED ✅' if final_dur >= 360 else 'FAILED ❌'}")
    print("=" * 80)

if __name__ == "__main__":
    main()

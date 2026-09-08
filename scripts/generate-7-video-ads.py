# -*- coding: utf-8 -*-
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import math
import os
import shutil

WIDTH = 1080
HEIGHT = 1080
FPS = 30
TOTAL_FRAMES = 210  # 7.0 seconds per ad

PROJECT_ROOT = r"d:\ANDROID_STD\PROJECT_CUSTOMER_WEBSITE\LDOCX-FORMAT-PROJECT-MARK1"
OUT_DIR = os.path.join(PROJECT_ROOT, "public", "ads")
os.makedirs(OUT_DIR, exist_ok=True)

LOGO_PATH = os.path.join(PROJECT_ROOT, "public", "ldoc_logo.png")
base_logo = Image.open(LOGO_PATH).convert("RGBA")

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_SEGOE = "C:/Windows/Fonts/segoeuib.ttf"
FONT_CODE = "C:/Windows/Fonts/consola.ttf"
FONT_IMPACT = "C:/Windows/Fonts/impact.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

font_hero = get_font(FONT_IMPACT, 52)
font_title = get_font(FONT_SEGOE, 40)
font_sub = get_font(FONT_BOLD, 28)
font_body = get_font(FONT_BOLD, 25)
font_badge = get_font(FONT_CODE, 20)
font_cta = get_font(FONT_BOLD, 27)

def project_3d_points(vertices, angle_x, angle_y, scale=170, center=(540, 480)):
    Rx = np.array([
        [1, 0, 0],
        [0, math.cos(angle_x), -math.sin(angle_x)],
        [0, math.sin(angle_x), math.cos(angle_x)]
    ])
    Ry = np.array([
        [math.cos(angle_y), 0, math.sin(angle_y)],
        [0, 1, 0],
        [-math.sin(angle_y), 0, math.cos(angle_y)]
    ])
    rotated = vertices @ Rx @ Ry
    projected = []
    for x, y, z in rotated:
        fov = 480
        depth = z + 550
        px = int(center[0] + (x * fov) / depth)
        py = int(center[1] + (y * fov) / depth)
        projected.append((px, py))
    return projected

def get_cube_wireframe():
    v = np.array([
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ], dtype=float) * 130
    edges = [
        (0,1),(1,2),(2,3),(3,0),
        (4,5),(5,6),(6,7),(7,4),
        (0,4),(1,5),(2,6),(3,7)
    ]
    return v, edges

def get_octahedron_wireframe():
    v = np.array([
        [1, 0, 0], [-1, 0, 0],
        [0, 1, 0], [0, -1, 0],
        [0, 0, 1], [0, 0, -1]
    ], dtype=float) * 160
    edges = [
        (0,2),(2,1),(1,3),(3,0),
        (0,4),(1,4),(2,4),(3,4),
        (0,5),(1,5),(2,5),(3,5)
    ]
    return v, edges

def get_cylinder_wireframe(segments=12):
    v = []
    r = 120
    h = 130
    for i in range(segments):
        a = (i / float(segments)) * 2 * math.pi
        v.append([r * math.cos(a), -h, r * math.sin(a)])
        v.append([r * math.cos(a), h, r * math.sin(a)])
    v = np.array(v, dtype=float)
    edges = []
    for i in range(0, segments * 2, 2):
        edges.append((i, (i + 2) % (segments * 2)))
        edges.append((i + 1, (i + 3) % (segments * 2)))
        edges.append((i, i + 1))
    return v, edges

ADS = [
    {
        "id": "ad1_3d_webgl",
        "badge": "SPATIAL 3D REVOLUTION",
        "alert": "CAN YOUR FIGMA OR PDF DO THIS? ❌ NEVER.",
        "hook_title": "STOP SENDING FLAT 2D DRAWINGS IN 2026",
        "feature_title": "NATIVE 60 FPS 3D WEBGL ENGINE",
        "bullets": [
            "Embed .GLTF, .OBJ, .STL directly inside reports",
            "Hardware-accelerated 60 FPS camera orbit & pan",
            "Discrete GPU (NVIDIA/AMD) allocation switcher",
            "Zero plugins required. Zero cloud dependencies."
        ],
        "accent_bgr": (255, 240, 0),
        "mesh_type": "octahedron"
    },
    {
        "id": "ad2_merkle_security",
        "badge": "CRYPTOGRAPHIC INTEGRITY",
        "alert": "SECURITY ALERT: WORD (.DOCX) IS NOT SAFE ⚠️",
        "hook_title": "ANYONE CAN UNZIP .DOCX & EDIT YOUR CONTRACT",
        "feature_title": "SHA-256 MERKLE-TREE TAMPER ALARM",
        "bullets": [
            "Every paragraph & table cryptographically hashed",
            "Instant tamper detection alarm in under 15ms",
            "Mathematical proof of authenticity for legal specs",
            "Zero macro exploits or arbitrary script vulnerabilities"
        ],
        "accent_bgr": (0, 100, 255),
        "mesh_type": "cube"
    },
    {
        "id": "ad3_instant_creator",
        "badge": "ZERO-INSTALL CREATOR",
        "alert": "WHY PAY $2,000 FOR CAD & AUTHORING SUITES? 💸",
        "hook_title": "BUILD 3D LIVING DOCUMENTS IN YOUR BROWSER",
        "feature_title": "INSTANT ZERO-SIGNUP WEB CREATOR",
        "bullets": [
            "Open browser & build 3D documents in 3 seconds",
            "Drag & drop 3D GLTF models, audio, & live data",
            "Cryptographic SHA-256 export with 1-click",
            "100% client-side privacy. Zero cloud telemetry."
        ],
        "accent_bgr": (255, 100, 200),
        "mesh_type": "cylinder"
    },
    {
        "id": "ad4_reactive_ast",
        "badge": "ACTIVE SOFTWARE DOCUMENTS",
        "alert": "STATIC PDFS ARE DEAD GLASS. 🪦",
        "hook_title": "YOUR DOCUMENTS SHOULD THINK & CALCULATE",
        "feature_title": "REACTIVE COMPUTATIONAL AST ENGINE",
        "bullets": [
            "Live reactive formulas update charts dynamically",
            "Interactive sandboxed widgets running inside",
            "Financial, CAD & telemetry real-time math",
            "Pre-chunked AST ready for AI RAG embeddings"
        ],
        "accent_bgr": (100, 255, 100),
        "mesh_type": "octahedron"
    },
    {
        "id": "ad5_native_viewer",
        "badge": "EXTREME PERFORMANCE",
        "alert": "ADOBE ACROBAT: 800MB. LDOC: 3.7MB. ⚡",
        "hook_title": "WHY IS A PDF VIEWER 800MB WITH CLOUD TRACKING?",
        "feature_title": "3.7MB NATIVE MULTI-PLATFORM VIEWER",
        "bullets": [
            "Under 4MB standalone native desktop app",
            "Available for Windows, Linux, and iOS",
            "Sub-second boot time with zero cloud dependency",
            "Hardware-accelerated 3D graphics built-in"
        ],
        "accent_bgr": (0, 215, 255),
        "mesh_type": "cube"
    },
    {
        "id": "ad6_universal_converter",
        "badge": "UNIVERSAL INGESTION",
        "alert": "30 YEARS OF DEAD DOCUMENTS. CONVERTED. 🔄",
        "hook_title": "DRAG & DROP DEAD PDFS, GET LIVING 3D DOCS",
        "feature_title": "1-CLICK LEGACY TO LDOCX CONVERTER",
        "bullets": [
            "Converts PDF, Word (.docx), & PPTX instantly",
            "Auto-wraps .OBJ and .STL into interactive 3D",
            "Preserves hierarchy, typography, and tables",
            "Zero watermark stamps. Zero formatting loss."
        ],
        "accent_bgr": (255, 160, 50),
        "mesh_type": "cylinder"
    },
    {
        "id": "ad7_clean_print",
        "badge": "PUBLICATION-GRADE PRINT",
        "alert": "HATE UGLY WATERMARKS ON YOUR PDF EXPORTS? 🚫",
        "hook_title": "ZERO WATERMARKS. ZERO AD STAMPS. FOREVER.",
        "feature_title": "WATERMARK-FREE CLEAN PRINT ENGINE",
        "bullets": [
            "100% clean A4 pagination and PDF flattening",
            "Hides editor toolbars & renders crisp typography",
            "Publication-grade output for clients & executives",
            "100% offline print capability via Ctrl+P"
        ],
        "accent_bgr": (220, 220, 255),
        "mesh_type": "octahedron"
    }
]

def render_all_ads():
    logo_small = base_logo.resize((64, 64), Image.Resampling.LANCZOS)
    logo_med = base_logo.resize((140, 140), Image.Resampling.LANCZOS)
    logo_large = base_logo.resize((220, 220), Image.Resampling.LANCZOS)

    for ad_idx, ad in enumerate(ADS):
        ad_id = ad["id"]
        out_video_path = os.path.join(OUT_DIR, f"{ad_id}.mp4")
        out_poster_path = os.path.join(OUT_DIR, f"{ad_id}_poster.jpg")
        print(f"[{ad_idx + 1}/7] Rendering {ad['badge']} -> {ad_id}.mp4...")

        if ad["mesh_type"] == "cube":
            v, edges = get_cube_wireframe()
        elif ad["mesh_type"] == "cylinder":
            v, edges = get_cylinder_wireframe()
        else:
            v, edges = get_octahedron_wireframe()

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(out_video_path, fourcc, FPS, (WIDTH, HEIGHT))

        for frame_idx in range(TOTAL_FRAMES):
            bg = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
            for y in range(HEIGHT):
                ratio = y / float(HEIGHT)
                bg[y, :] = [int(12 + ratio * 14), int(10 + ratio * 12), int(20 + ratio * 18)]

            grid_offset = int((frame_idx * 2) % 40)
            for gx in range(0, WIDTH, 60):
                cv2.line(bg, (gx, 0), (gx, HEIGHT), (24, 20, 32), 1)
            for gy in range(grid_offset, HEIGHT, 40):
                cv2.line(bg, (0, gy), (WIDTH, gy), (24, 20, 32), 1)

            accent = ad["accent_bgr"]
            glow_radius = int(220 + math.sin(frame_idx * 0.1) * 30)
            cv2.circle(bg, (540, 480), glow_radius, (accent[0]//7, accent[1]//7, accent[2]//7), -1)

            angle = frame_idx * 0.05
            pts = project_3d_points(v, angle * 0.7, angle * 1.1, scale=170, center=(540, 480))
            for p1_idx, p2_idx in edges:
                p1 = pts[p1_idx]
                p2 = pts[p2_idx]
                cv2.line(bg, p1, p2, accent, 2, cv2.LINE_AA)
            for pt in pts:
                cv2.circle(bg, pt, 4, (255, 255, 255), -1)

            img = Image.fromarray(cv2.cvtColor(bg, cv2.COLOR_BGR2RGB))
            draw = ImageDraw.Draw(img)

            # Top Header Bar
            draw.rectangle([50, 35, 430, 85], fill=(18, 24, 38, 220), outline=(70, 90, 130), width=1)
            img.paste(logo_small, (58, 38), logo_small)
            draw.text((130, 42), "LIVING DOCUMENT", fill=(255, 215, 0), font=font_body)
            draw.text((130, 64), ".ldocx Format v2.5.0", fill=(160, 180, 210), font=font_badge)

            draw.rectangle([740, 35, 1030, 85], fill=(18, 24, 38, 220), outline=(accent[2], accent[1], accent[0]), width=1)
            draw.text((755, 50), f"* {ad['badge']}", fill=(255, 255, 255), font=font_badge)

            if frame_idx < 65:
                # Scene 1: Provocation
                pulse = math.sin(frame_idx * 0.3)
                alert_bg = (180, 25, 45) if pulse > 0 else (110, 15, 30)
                draw.rectangle([80, 140, 1000, 210], fill=alert_bg, outline=(255, 80, 100), width=2)
                draw.text((110, 160), ad["alert"], fill=(255, 255, 255), font=font_sub)

                draw.rectangle([80, 245, 1000, 430], fill=(10, 15, 25, 235), outline=(50, 65, 85), width=2)
                words = ad["hook_title"].split()
                mid = len(words) // 2
                line1 = " ".join(words[:mid])
                line2 = " ".join(words[mid:])
                draw.text((105, 265), line1, fill=(255, 255, 255), font=font_hero)
                draw.text((105, 335), line2, fill=(255, 215, 0), font=font_hero)

                img.paste(logo_med, (470, 410), logo_med)

                draw.rectangle([100, 920, 980, 990], fill=(20, 30, 48), outline=(0, 215, 255), width=2)
                draw.text((130, 942), "💥 WATCH HOW .LDOCX TRANSCENDS 30-YEAR-OLD DEAD FORMATS", fill=(0, 240, 255), font=font_body)

            elif frame_idx < 150:
                # Scene 2: Feature Breakdown
                draw.rectangle([80, 120, 1000, 210], fill=(15, 22, 35, 240), outline=(accent[2], accent[1], accent[0]), width=2)
                draw.text((105, 130), "NEXT-GEN FEATURE SHOWCASE:", fill=(170, 190, 220), font=font_badge)
                draw.text((105, 155), ad["feature_title"], fill=(255, 215, 0), font=font_title)

                card_x1, card_y1, card_x2, card_y2 = 100, 715, 980, 990
                draw.rectangle([card_x1, card_y1, card_x2, card_y2], fill=(12, 18, 28, 235), outline=(50, 80, 120), width=2)

                for bi, bullet in enumerate(ad["bullets"]):
                    by = card_y1 + 18 + bi * 58
                    draw.rectangle([card_x1 + 20, by + 4, card_x1 + 32, by + 16], fill=(0, 255, 180))
                    draw.text((card_x1 + 45, by), bullet, fill=(240, 245, 255), font=font_body)

            else:
                # Scene 3: Climax & CTA
                ring_r = int(160 + math.sin(frame_idx * 0.2) * 20)
                draw.ellipse([540 - ring_r, 370 - ring_r, 540 + ring_r, 370 + ring_r], outline=(255, 215, 0), width=3)
                img.paste(logo_large, (430, 260), logo_large)

                draw.text((230, 520), "THE LIVING DOCUMENT FORMAT", fill=(255, 255, 255), font=font_title)
                draw.text((370, 575), "100% Free & Open Source", fill=(0, 240, 255), font=font_sub)

                draw.rectangle([90, 640, 990, 840], fill=(14, 20, 32, 245), outline=(255, 215, 0), width=2)
                draw.text((120, 665), "⭐ Star on GitHub:", fill=(200, 220, 255), font=font_cta)
                draw.text((120, 705), "👉 github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT", fill=(255, 215, 0), font=font_body)
                draw.text((120, 765), "📦 Install SDK:  npm install ldoc-sdk", fill=(0, 255, 180), font=font_cta)

                draw.rectangle([90, 880, 990, 970], fill=(18, 28, 48), outline=(70, 110, 170), width=1)
                draw.text((120, 910), "🚀 Try Live Web Creator: coderjay2003-svg.github.io  |  Win • Linux • iOS", fill=(255, 255, 255), font=font_body)

            if frame_idx == 100:
                img.save(out_poster_path, quality=95)

            frame_bgr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
            writer.write(frame_bgr)

        writer.release()
        size_mb = os.path.getsize(out_video_path) / (1024.0 * 1024.0)
        print(f"[OK] Finished Ad {ad_idx + 1}: {ad_id}.mp4 ({size_mb:.2f} MB)")

    print("\n🎉 All 7 Video Ads and Posters Generated Successfully!")

if __name__ == "__main__":
    render_all_ads()

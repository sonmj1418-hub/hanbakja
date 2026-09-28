"""Focus on launcher art: a vertical shorts frame with a pause mark."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "icons"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

INK = (44, 38, 31, 255)
CREAM = (246, 241, 231, 255)
CLAY = (196, 92, 62, 255)

LAUNCHER = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}
FOREGROUND = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432,
}


def phone(draw: ImageDraw.ImageDraw, size: int, scale: float) -> None:
    width = size * 0.46 * scale
    height = size * 0.72 * scale
    left = (size - width) / 2
    top = (size - height) / 2
    radius = max(2, size * 0.09 * scale)
    draw.rounded_rectangle(
        (left, top, left + width, top + height),
        radius=radius,
        fill=CREAM,
    )
    bezel_x = size * 0.045 * scale
    bezel_top = size * 0.062 * scale
    bezel_bottom = size * 0.05 * scale
    screen = (
        left + bezel_x,
        top + bezel_top,
        left + width - bezel_x,
        top + height - bezel_bottom,
    )
    draw.rounded_rectangle(screen, radius=max(1, size * 0.035 * scale), fill=INK)
    screen_w = screen[2] - screen[0]
    screen_h = screen[3] - screen[1]
    bar_w = max(2, screen_w * 0.16)
    bar_h = screen_h * 0.36
    gap = max(2, screen_w * 0.12)
    total = bar_w * 2 + gap
    bar_x = screen[0] + (screen_w - total) / 2
    bar_y = screen[1] + (screen_h - bar_h) / 2
    bar_radius = bar_w / 2
    draw.rounded_rectangle(
        (bar_x, bar_y, bar_x + bar_w, bar_y + bar_h),
        radius=bar_radius,
        fill=CLAY,
    )
    draw.rounded_rectangle(
        (bar_x + bar_w + gap, bar_y, bar_x + total, bar_y + bar_h),
        radius=bar_radius,
        fill=CLAY,
    )


def full_icon(size: int, scale: float = 1) -> Image.Image:
    image = Image.new("RGBA", (size, size), INK)
    phone(ImageDraw.Draw(image), size, scale)
    return image


def foreground_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    phone(ImageDraw.Draw(image), size, 0.78)
    return image


def round_icon(size: int) -> Image.Image:
    image = full_icon(size, 0.86)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    image.putalpha(mask)
    return image


PUBLIC.mkdir(parents=True, exist_ok=True)
full_icon(192).save(PUBLIC / "icon-192.png")
full_icon(512).save(PUBLIC / "icon-512.png")
full_icon(180).save(PUBLIC / "apple-touch-icon.png")
full_icon(512, 0.8).save(PUBLIC / "icon-maskable-512.png")

for density, size in LAUNCHER.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    full_icon(size).save(folder / "ic_launcher.png")
    round_icon(size).save(folder / "ic_launcher_round.png")

for density, size in FOREGROUND.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    foreground_icon(size).save(folder / "ic_launcher_foreground.png")

print(PUBLIC)

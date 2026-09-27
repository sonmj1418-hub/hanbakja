"""한박자 홈 화면 아이콘. 종이색 바탕에 일시정지 막대 두 개."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"
ROOT.mkdir(parents=True, exist_ok=True)

PAPER = (243, 236, 223, 255)
INK = (42, 36, 30, 255)
CLAY = (181, 82, 58, 255)


def draw(size: int, pad: float) -> Image.Image:
    image = Image.new("RGBA", (size, size), PAPER)
    draw = ImageDraw.Draw(image)
    radius = int(size * 0.22)
    inset = int(size * pad)
    draw.rounded_rectangle(
        (inset, inset, size - inset - 1, size - inset - 1),
        radius=radius,
        fill=PAPER,
    )
    bar_w = size * 0.09
    bar_h = size * 0.42
    gap = size * 0.07
    top = (size - bar_h) / 2
    left = (size - (bar_w * 2 + gap)) / 2
    radius_bar = bar_w / 2
    draw.rounded_rectangle(
        (left, top, left + bar_w, top + bar_h),
        radius=radius_bar,
        fill=INK,
    )
    draw.rounded_rectangle(
        (left + bar_w + gap, top, left + bar_w * 2 + gap, top + bar_h),
        radius=radius_bar,
        fill=CLAY,
    )
    return image


draw(192, 0.06).save(ROOT / "icon-192.png")
draw(512, 0.06).save(ROOT / "icon-512.png")
draw(180, 0.08).save(ROOT / "apple-touch-icon.png")
draw(512, 0.18).save(ROOT / "icon-maskable-512.png")
print(ROOT)

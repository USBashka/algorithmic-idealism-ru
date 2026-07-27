#!/usr/bin/env python3
"""Normalize generated article images to 1080px-wide WebP files."""

from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


GENERATED = Path(
    r"C:\Users\Sava\.codex\generated_images"
    r"\019fa3cf-524a-7f31-a1a7-9b241d7b6e49"
)
OUTPUT = Path(__file__).resolve().parents[1] / "assets"

FILES = {
    "AlgId1.webp": "exec-ddd564e8-57c2-4df0-b0c6-fda0cb3eb1f1.png",
    "AlgId2.webp": "exec-60cb45a3-fb64-41dd-97e8-1afb3ad25827.png",
    "greenhead2.webp": "exec-11800593-1482-4609-91c6-962953d20e66.png",
    "selfstates.webp": "exec-4c25297c-cf61-41dd-81ed-388c10dbf787.png",
    "bb2.webp": "exec-588489ce-64ec-4b80-bed0-2dbb023ad633.png",
    "greentm3.webp": "exec-4fb595c0-dbe6-40f9-a710-27fd253e74c3.png",
    "experiments3.webp": "exec-87e0be81-05e1-4282-87ad-c4d4b878f183.png",
    "alicebobsunrise2.webp": "exec-411fbab3-73c0-4931-881f-68614952df24.png",
    "wf_rickmorty.webp": "exec-0d5465ec-dcff-412f-920a-9ec34a15e704.png",
    "parfit.webp": "exec-7afb543d-8c8c-47ca-b58b-3da6ed5d3ce1.png",
    "machcomic2.webp": "exec-e131a7cf-87fd-41a7-8752-cc2076907442.png",
    "changeling2.webp": "exec-81823be9-1f9d-40db-bd92-431c0de3ac66.png",
    "earthscientists3.webp": "exec-e4cbbba7-31b4-4bcf-8ee5-25d90ace368e.png",
    "bellnew4.webp": "exec-e18cc66a-aa79-42ae-b154-63341d505666.png",
}


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for output_name, generated_name in FILES.items():
        source = GENERATED / generated_name
        if not source.is_file():
            raise FileNotFoundError(source)
        with Image.open(source) as image:
            image = image.convert("RGB")
            target_height = round(image.height * 1080 / image.width)
            image = image.resize((1080, target_height), Image.Resampling.LANCZOS)
            image = ImageEnhance.Sharpness(image).enhance(1.06)
            image = image.filter(ImageFilter.UnsharpMask(radius=0.45, percent=45, threshold=3))
            target = OUTPUT / output_name
            image.save(
                target,
                "WEBP",
                quality=88,
                method=6,
                optimize=True,
                exif=b"",
            )
            print(f"{output_name}: {image.width}x{image.height}, {target.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()

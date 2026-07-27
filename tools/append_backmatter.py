#!/usr/bin/env python3
"""Append the source bibliography and notes, preserving citation metadata verbatim."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "algorithmic-idealism.md"
TARGET = ROOT / "algorithmic-idealism-ru" / "algorithmic-idealism-ru.md"

source = SOURCE.read_text(encoding="utf-8")
start = source.index('<a id="Acknowledgments"></a>')
end = source.index("# Right column")
backmatter = source[start:end].strip()
ack_en = (
    "I am grateful to [Kelvin McQueen](https://kelvinmcqueen.com) for many helpful "
    "and stimulating discussions, and in particular for his earlier contributions "
    "to what has become [Section 7](#Section7) of the present paper. I would also "
    "like to thank [Michael Cuffaro](https://www.michaelcuffaro.com) for helpful "
    "comments on an earlier draft."
)
ack_ru = (
    "Я благодарен [Келвину Маккуину](https://kelvinmcqueen.com) за многочисленные "
    "полезные и вдохновляющие обсуждения, особенно за его ранний вклад в то, что "
    "стало [разделом 7](#Section7) этой статьи. Я также благодарю "
    "[Майкла Каффаро](https://www.michaelcuffaro.com) за ценные замечания к ранней версии."
)
backmatter = backmatter.replace("## Acknowledgments", "## Благодарности")
backmatter = backmatter.replace(ack_en, ack_ru)
backmatter = backmatter.replace("## References", "## Литература")

target = TARGET.read_text(encoding="utf-8").rstrip()
if '<a id="Acknowledgments"></a>' in target:
    raise SystemExit("Backmatter is already present")
TARGET.write_text(target + "\n\n" + backmatter + "\n", encoding="utf-8", newline="\n")
print("Backmatter appended")

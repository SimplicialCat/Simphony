#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate 19-EDO (19 Equal Divisions of the Octave) note table"""

import sys
import io

# Set stdout to UTF-8 encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def generate_19edo_table():
    """Generate a markdown table of 19-EDO notes with frequency ratios"""

    # Note names following the sequence from EDO_19_KEY_SEQUENCE
    # W=Purple,Blue,W,Purple,Blue,W,Purple,W,Purple,Blue,W,Purple,Blue,W,Purple,Blue,W,Purple
    note_names = [
        "C",
        "♯C", "♭D",  # positions 1-2
        "D",
        "♯D", "♭E",  # positions 4-5
        "E",
        "F",         # position 7 (single purple in original, but we'll use E/F naming)
        "♭F", "F",   # Actually, let me reconsider the naming
    ]

    # Better approach: use the actual 19-EDO note sequence
    # Based on the keyboard layout: W, P, B, W, P, B, W, P, W, P, B, W, P, B, W, P, B, W, P
    # Where W = white (natural), P = purple, B = blue

    # Standard notation for 19-EDO using sharps and flats
    edo19_notes = [
        ("C", "1"),
        ("♯C/♭D", "2¹⁹"),
        ("D", "2"),
        ("♯D/♭E", "3¹⁹"),
        ("E", "3"),
        ("F", "4" if False else "♭F"),  # This is the small interval
        ("♭F/♮E", "4"),
        ("F", "4"),
        ("♯F", "5¹⁹"),
        ("G", "5"),
        ("♯G/♭A", "6¹⁹"),
        ("A", "6"),
        ("♯A/♭B", "7¹⁹"),
        ("B", "7"),
        ("♭C", "8¹⁹"),
    ]

    print("| 步数 | 音名 | 频率比 | 音分 |")
    print("|------|------|--------|------|")

    for i in range(19):
        ratio = 2 ** (i / 19)
        cents = i * (1200 / 19)  # Each step is 1200/19 ≈ 63.16 cents

        # Note names based on position (using LaTeX notation for sharps/flats)
        if i == 0:
            note = r"\text{C}"
        elif i == 1:
            note = r"\sharp\text{C}"
        elif i == 2:
            note = r"\flat\text{D}"
        elif i == 3:
            note = r"\text{D}"
        elif i == 4:
            note = r"\sharp\text{D}"
        elif i == 5:
            note = r"\flat\text{E}"
        elif i == 6:
            note = r"\text{E}"
        elif i == 7:
            note = r"\flat\text{F}"  # Small interval (single purple key)
        elif i == 8:
            note = r"\text{F}"
        elif i == 9:
            note = r"\sharp\text{F}"
        elif i == 10:
            note = r"\flat\text{G}"
        elif i == 11:
            note = r"\text{G}"
        elif i == 12:
            note = r"\sharp\text{G}"
        elif i == 13:
            note = r"\flat\text{A}"
        elif i == 14:
            note = r"\text{A}"
        elif i == 15:
            note = r"\sharp\text{A}"
        elif i == 16:
            note = r"\flat\text{B}"
        elif i == 17:
            note = r"\text{B}"
        elif i == 18:
            note = r"\flat\text{C}"  # Small interval (single purple key)

        print(f"| {i} | ${note}$ | ${ratio:.6f}$ | ${cents:.2f}$ |")

if __name__ == "__main__":
    generate_19edo_table()

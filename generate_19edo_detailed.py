#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate detailed 19-EDO (19 Equal Divisions of the Octave) note table with key types"""

import sys
import io

# Set stdout to UTF-8 encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Key type sequence based on EDO_19_KEY_SEQUENCE
# W=White, P=Purple, B=Blue
KEY_TYPES = [
    'W',   # 0: C
    'P', 'B',  # 1-2: C#, Db
    'W',   # 3: D
    'P', 'B',  # 4-5: D#, Eb
    'W',   # 6: E
    'P',   # 7: F (small interval - single purple)
    'W',   # 8: F
    'P', 'B',  # 9-10: F#, Gb
    'W',   # 11: G
    'P', 'B',  # 12-13: G#, Ab
    'W',   # 14: A
    'P', 'B',  # 15-16: A#, Bb
    'W',   # 17: B
    'P',   # 18: C (small interval - single purple)
]

def get_note_name(i):
    """Get LaTeX note name for position i"""
    notes = [
        r"\text{C}",
        r"\sharp\text{C}", r"\flat\text{D}",
        r"\text{D}",
        r"\sharp\text{D}", r"\flat\text{E}",
        r"\text{E}",
        r"\flat\text{F}",
        r"\text{F}",
        r"\sharp\text{F}", r"\flat\text{G}",
        r"\text{G}",
        r"\sharp\text{G}", r"\flat\text{A}",
        r"\text{A}",
        r"\sharp\text{A}", r"\flat\text{B}",
        r"\text{B}",
        r"\flat\text{C}"
    ]
    return notes[i]

def get_interval_type(i):
    """Get interval type description"""
    if i == 7 or i == 18:
        return "小间隔"
    elif i in [1, 2, 4, 5, 9, 10, 12, 13, 15, 16]:
        return "大间隔"
    else:
        return "-"

def get_key_color(i):
    """Get key color/type description"""
    key_type = KEY_TYPES[i]
    if key_type == 'W':
        return "白键"
    elif key_type == 'P':
        return "紫键"
    elif key_type == 'B':
        return "蓝键"

def generate_basic_table():
    """Generate basic 19-EDO table"""
    print("| 步数 | 音名 | 频率比 | 音分 |")
    print("|------|------|--------|------|")

    for i in range(19):
        ratio = 2 ** (i / 19)
        cents = i * (1200 / 19)
        note = get_note_name(i)

        print(f"| {i} | ${note}$ | ${ratio:.6f}$ | ${cents:.2f}$ |")

def generate_detailed_table():
    """Generate detailed 19-EDO table with key types and intervals"""
    print("| 步数 | 音名 | 键型 | 间隔类型 | 频率比 | 音分 |")
    print("|------|------|------|----------|--------|------|")

    for i in range(19):
        ratio = 2 ** (i / 19)
        cents = i * (1200 / 19)
        note = get_note_name(i)
        key_type = get_key_color(i)
        interval = get_interval_type(i)

        print(f"| {i} | ${note}$ | {key_type} | {interval} | ${ratio:.6f}$ | ${cents:.2f}$ |")

def generate_octave_comparison():
    """Compare 19-EDO with 12-EDO (standard tuning)"""
    print("\n### 19-EDO 与 12-EDO 对比")
    print("| 音名 | 12-EDO 音分 | 19-EDO 最接近音 | 差异 |")
    print("|------|-------------|-----------------|------|")

    # Standard 12-EDO notes
    edo12_notes = [
        ("C", 0),
        ("C#/Db", 100),
        ("D", 200),
        ("D#/Eb", 300),
        ("E", 400),
        ("F", 500),
        ("F#/Gb", 600),
        ("G", 700),
        ("G#/Ab", 800),
        ("A", 900),
        ("A#/Bb", 1000),
        ("B", 1100),
    ]

    for note, edo12_cents in edo12_notes:
        # Find closest 19-EDO note
        edo19_step = round(edo12_cents / (1200/19))
        edo19_cents = edo19_step * (1200/19)
        diff = edo19_cents - edo12_cents
        print(f"| {note} | ${edo12_cents}$ | 步骤 {edo19_step} (${edo19_cents:.2f}$¢) | ${diff:+.2f}$¢ |")

if __name__ == "__main__":
    print("## 19-EDO 基础表\n")
    generate_basic_table()

    print("\n## 19-EDO 详细表（含键型和间隔）\n")
    generate_detailed_table()

    generate_octave_comparison()

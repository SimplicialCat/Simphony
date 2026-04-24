#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate 19-EDO scale tables for different keys"""

import sys
import io

# Set stdout to UTF-8 encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 19EDO note positions (same as EDO_19_NOTES in music-player.js)
EDO_19_NOTES = {
    '1': 0,    '#1': 1,  'b2': 2,  '2': 3,
    '#2': 4,   'b3': 5,  '3': 6,   '#3': 7,
    'b4': 7,   '4': 8,   '#4': 9,  'b5': 10,
    '5': 11,   '#5': 12, 'b6': 13, '6': 14,
    '#6': 15,  'b7': 16, '7': 17,  '#7': 18, 'b1': -1
}

# Key positions in 19-EDO (same as KEY_19EDO_POSITIONS)
KEY_19EDO_POSITIONS = {
    'C': 0,
    'C#': 1, 'Db': 2,
    'D': 3,
    'D#': 4, 'Eb': 5,
    'E': 6,
    'F': 8,
    'F#': 9, 'Gb': 10,
    'G': 11,
    'G#': 12, 'Ab': 13,
    'A': 14,
    'A#': 15, 'Bb': 16,
    'B': 17
}

# Major scale intervals in 19-EDO (steps from tonic)
MAJOR_SCALE_19EDO = [0, 3, 6, 8, 11, 14, 17]  # Based on major scale structure

def get_note_name(degree):
    """Get note name for scale degree (1-7)"""
    names = ['1', '2', '3', '4', '5', '6', '7']
    return names[degree - 1]

def generate_scale(key_name):
    """Generate major scale for given key in 19-EDO"""
    if key_name not in KEY_19EDO_POSITIONS:
        return None

    tonic_pos = KEY_19EDO_POSITIONS[key_name]
    scale_degrees = []

    for i, interval in enumerate(MAJOR_SCALE_19EDO, 1):
        abs_pos = tonic_pos + interval
        octave = abs_pos // 19
        pos_in_octave = abs_pos % 19

        # Calculate frequency ratio
        ratio = 2 ** (abs_pos / 19)
        cents = abs_pos * (1200 / 19)

        scale_degrees.append({
            'degree': i,
            'note_name': get_note_name(i),
            'abs_position': abs_pos,
            'octave': octave,
            'ratio': ratio,
            'cents': cents
        })

    return scale_degrees

def print_scale_table(key_name):
    """Print scale table for a given key"""
    scale = generate_scale(key_name)
    if not scale:
        print(f"未知调式: {key_name}")
        return

    print(f"\n### {key_name} 大调音阶 (19-EDO)")
    print("| 音级 | 唱名 | 绝对位置 | 频率比 | 音分 |")
    print("|------|------|----------|--------|------|")

    for deg in scale:
        print(f"| {deg['degree']} | {deg['note_name']} | {deg['abs_position']} | ${deg['ratio']:.6f}$ | ${deg['cents']:.2f}$ |")

def compare_with_12edo(key_name):
    """Compare 19-EDO scale with 12-EDO"""
    if key_name not in KEY_19EDO_POSITIONS:
        return

    scale_19 = generate_scale(key_name)

    # 12-EDO major scale intervals (in semitones)
    major_intervals_12 = [0, 2, 4, 5, 7, 9, 11]

    # Get 12-EDO tonic position
    edo12_tonic = {
        'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
        'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
        'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71
    }.get(key_name, 60)

    print(f"\n#### {key_name} 大调: 19-EDO vs 12-EDO")
    print("| 音级 | 12-EDO 音分 | 19-EDO 音分 | 差异 |")
    print("|------|-------------|-------------|------|")

    for i, deg in enumerate(scale_19):
        edo12_cents = major_intervals_12[i] * 100
        edo19_cents = deg['cents'] % 1200  # Normalize to one octave
        diff = edo19_cents - edo12_cents
        print(f"| {deg['degree']} | ${edo12_cents}$ | ${edo19_cents:.2f}$ | ${diff:+.2f}$¢ |")

if __name__ == "__main__":
    print("# 19-EDO 调式音阶表")
    print("\n生成各调式的大调音阶在19-EDO中的音高分布...")

    # Common keys to demonstrate
    keys_to_show = ['C', 'Eb', 'F', 'G', 'Bb']

    for key in keys_to_show:
        print_scale_table(key)
        compare_with_12edo(key)

    print(f"\n---\n")
    print("## 调式位置参考 (19-EDO)")
    print("| 调式 | 19-EDO 位置 |")
    print("|------|-------------|")
    for key, pos in sorted(KEY_19EDO_POSITIONS.items(), key=lambda x: x[1]):
        print(f"| {key} | {pos} |")

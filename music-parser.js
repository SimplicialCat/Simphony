// music-parser.js - Music notation parser and player
// Extracted from music-player.js for standalone use

(function() {
  'use strict';

  // ==================== Constants ====================

  const C_MAJOR_SEMITONES = { '1': 0, '2': 2, '3': 4, '4': 5, '5': 7, '6': 9, '7': 11 };

  const KEY_ROOT_MIDI = {
    'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
    'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
    'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71
  };

  // 19EDO各音级的19平均律偏移
  const EDO_19_NOTES = {
    '1': 0,    '#1': 1,  'b2': 2,  '2': 3,
    '#2': 4,   'b3': 5,  '3': 6,   '#3': 7,
    'b4': 7,   '4': 8,   '#4': 9,  'b5': 10,
    '5': 11,   '#5': 12, 'b6': 13, '6': 14,
    '#6': 15,  'b7': 16, '7': 17,  '#7': 18, 'b1': -1
  };

  // 19EDO中各调的主音位置（相对于C4=0）
  const KEY_19EDO_POSITIONS = {
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
  };

  // 19EDO键盘序列
  const EDO_19_KEY_SEQUENCE = [
    "white",  // 0
    "purple", "blue",   // 1-2
    "white",  // 3
    "purple", "blue",   // 4-5
    "white",  // 6
    "purple",           // 7
    "white",  // 8
    "purple", "blue",   // 9-10
    "white",  // 11
    "purple", "blue",   // 12-13
    "white",  // 14
    "purple", "blue",   // 15-16
    "white",  // 17
    "purple"            // 18
  ];

  const NOTE_MAP = {
    '1': 'C', '2': 'D', '3': 'E', '4': 'F',
    '5': 'G', '6': 'A', '7': 'B'
  };

  // ==================== Helper Functions ====================

  function getKeySemitones(key) {
    var rootMidi = KEY_ROOT_MIDI[key] || 60;
    return { rootMidi: rootMidi, semitones: C_MAJOR_SEMITONES };
  }

  function getKey19EdoPosition(key) {
    return KEY_19EDO_POSITIONS[key] || 0;
  }

  function getEdoNoteSemitones(noteChar, accidental, edo) {
    if (edo === 19) {
      var noteKey = noteChar;
      if (accidental) noteKey = accidental + noteChar;
      return EDO_19_NOTES[noteKey];
    } else {
      var baseSemitone = C_MAJOR_SEMITONES[noteChar] || 0;
      if (accidental === '#') baseSemitone += 1;
      else if (accidental === 'b') baseSemitone -= 1;
      return baseSemitone;
    }
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function edoToFreq(edoNumber, edo, refFreq) {
    if (edo === 12) {
      return 440 * Math.pow(2, (edoNumber - 69) / 12);
    } else {
      // 19-EDO: edoNumber从C0=0开始
      // refFreq=261.6256是C4的频率
      // C4在19-EDO中的位置 = 4 * 19 = 76
      refFreq = refFreq || 261.6256;
      var c4Position = 4 * 19;  // C4在19-EDO中的位置
      return refFreq * Math.pow(2, (edoNumber - c4Position) / 19);
    }
  }

  // ==================== Parser ====================

  function parseMusic(code) {
    var lines = code.split('\n');
    var bpm = 120;
    var key = 'C';
    var edo = 12;
    var parts = [];
    var currentPart = { voices: [] };
    var currentVoiceArray = [];

    // 跟踪行号信息
    var lineNumber = 0;  // 当前行号（从1开始，与用户编辑器显示一致）
    var lineInfo = [];  // 保存每行的行号映射
    var currentLineStart = 0;  // 当前处理的音乐行号

    for (var i = 0; i < lines.length; i++) {
      lineNumber++;  // 每处理一行，行号加1
      var line = lines[i].trim();
      var commentIndex = line.indexOf('//');
      if (commentIndex !== -1) line = line.substring(0, commentIndex).trim();

      if (line === '') {
        if (currentPart.voices.length > 0 || currentVoiceArray.length > 0) {
          if (currentVoiceArray.length > 0) {
            currentPart.voices.push(currentVoiceArray);
            currentVoiceArray = [];
          }
          parts.push(currentPart);
          currentPart = { voices: [] };
        }
        continue;
      }

      if (line.startsWith('let ')) {
        var match = line.match(/^let\s+(\w+)\s*=\s*(.+)$/);
        if (match) {
          var varName = match[1].trim();
          var value = match[2].trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          if (varName === 'bpm') {
            var parsedBpm = parseInt(value, 10);
            if (!isNaN(parsedBpm)) bpm = parsedBpm;
          } else if (varName === 'key') {
            key = value;
          } else if (varName === 'edo') {
            var parsedEdo = parseInt(value, 10);
            if (!isNaN(parsedEdo) && (parsedEdo === 12 || parsedEdo === 19)) {
              edo = parsedEdo;
            }
          }
        }
        continue;
      }

      if (line.startsWith('|')) {
        if (currentVoiceArray.length > 0) {
          currentPart.voices.push(currentVoiceArray);
          currentVoiceArray = [];
        }
        var voiceLine = line.substring(1).trim();
        var newVoice = [];
        currentLineStart = lineNumber;  // 使用当前行号（已经+1了）
        parseVoiceLine(voiceLine, newVoice, key, edo, currentLineStart);
        if (newVoice.length > 0) {
          currentPart.voices.push(newVoice);
        }
      } else {
        currentLineStart = lineNumber;  // 使用当前行号（已经+1了）
        parseVoiceLine(line, currentVoiceArray, key, edo, currentLineStart);
      }
    }

    if (currentVoiceArray.length > 0) {
      currentPart.voices.push(currentVoiceArray);
    }
    if (currentPart.voices.length > 0) {
      parts.push(currentPart);
    }

    var partStartBeat = 0;
    for (var p = 0; p < parts.length; p++) {
      var part = parts[p];
      for (var v = 0; v < part.voices.length; v++) {
        var voice = part.voices[v];
        var currentBeat = partStartBeat;
        for (var e = 0; e < voice.length; e++) {
          voice[e].start = currentBeat;
          currentBeat += voice[e].duration;
        }
      }
      var partMaxBeat = partStartBeat;
      for (var v = 0; v < part.voices.length; v++) {
        var voice = part.voices[v];
        if (voice.length > 0) {
          var last = voice[voice.length - 1];
          partMaxBeat = Math.max(partMaxBeat, last.start + last.duration);
        }
      }
      partStartBeat = partMaxBeat;
    }

    return { bpm: bpm, key: key, edo: edo, parts: parts };

    function parseVoiceLine(line, eventsArray, currentKey, edo, lineNumber) {
      var tokens = tokenize(line);
      var pos = 0;

      // 设置默认八度偏移，让音符落在键盘范围内
      // 19-EDO: 从octave=2开始（大约C2）
      // 12-EDO: 从octave=4开始（中央C附近）
      var defaultOctaveOffset = edo === 19 ? 2 : 4;

      while (pos < tokens.length) {
        var result = parseTokens(tokens, pos, {
          octaveOffset: defaultOctaveOffset,
          durationMultiplier: 1.0,
          sustainBlockId: null
        }, currentKey, eventsArray, edo, lineNumber);
        pos = result.pos;
      }
    }

    function tokenize(line) {
      var tokens = [];
      var i = 0;

      while (i < line.length) {
        var char = line[i];

        if (/\s/.test(char)) {
          i++;
          continue;
        }

        if (char === '_' && line[i + 1] === '{') {
          tokens.push('_{');
          i += 2;
          continue;
        }
        if (char === '^' && line[i + 1] === '{') {
          tokens.push('^{');
          i += 2;
          continue;
        }
        if (char === '=' && line[i + 1] === '{') {
          tokens.push('={');
          i += 2;
          continue;
        }
        if (char === '@' && line[i + 1] === '{') {
          tokens.push('@{');
          i += 2;
          continue;
        }

        if (char === '}') {
          tokens.push('}');
          i++;
          continue;
        }

        if (char === '-') {
          var dashes = '';
          while (i < line.length && line[i] === '-') {
            dashes += '-';
            i++;
          }
          tokens.push(dashes);
          continue;
        }

        if (char === '(') {
          var depth = 0;
          var chord = '';
          while (i < line.length) {
            chord += line[i];
            if (line[i] === '(') depth++;
            if (line[i] === ')') {
              depth--;
              if (depth === 0) {
                i++;
                break;
              }
            }
            i++;
          }
          tokens.push(chord);
          continue;
        }

        if (char === '0' || char === '1' || char === '2' || char === '3' ||
            char === '4' || char === '5' || char === '6' || char === '7' ||
            char === '_' || char === '^' || char === '#' || char === 'b') {
          var note = '';

          if (char === '0') {
            tokens.push('0');
            i++;
            continue;
          }

          while (i < line.length && (line[i] === '_' || line[i] === '^' || line[i] === '#' || line[i] === 'b')) {
            note += line[i];
            i++;
          }
          if (i < line.length && line[i] >= '1' && line[i] <= '7') {
            note += line[i];
            i++;
          }
          while (i < line.length && (line[i] === '#' || line[i] === 'b')) {
            note += line[i];
            i++;
          }

          if (note.length > 0 && /[1-7]/.test(note)) {
            tokens.push(note);
          }
          continue;
        }

        i++;
      }

      return tokens;
    }

    function parseTokens(tokens, pos, context, currentKey, eventsArray, edo, lineNumber) {
      var currentOctave = context.octaveOffset;
      var currentDuration = context.durationMultiplier;
      var currentSustainBlock = context.sustainBlockId;
      var i = pos;

      while (i < tokens.length) {
        var token = tokens[i];

        if (token === '}') {
          return { pos: i + 1 };
        }

        if (token === '^{') {
          var result = parseTokens(tokens, i + 1, {
            octaveOffset: currentOctave + 1,
            durationMultiplier: currentDuration,
            sustainBlockId: currentSustainBlock
          }, currentKey, eventsArray, edo, lineNumber);
          i = result.pos;
          continue;
        }

        if (token === '_{') {
          var result = parseTokens(tokens, i + 1, {
            octaveOffset: currentOctave - 1,
            durationMultiplier: currentDuration,
            sustainBlockId: currentSustainBlock
          }, currentKey, eventsArray, edo, lineNumber);
          i = result.pos;
          continue;
        }

        if (token === '={') {
          var result = parseTokens(tokens, i + 1, {
            octaveOffset: currentOctave,
            durationMultiplier: currentDuration * 0.5,
            sustainBlockId: currentSustainBlock
          }, currentKey, eventsArray, edo, lineNumber);
          i = result.pos;
          continue;
        }

        if (token === '@{') {
          var blockId = 'sustain_' + Math.random().toString(36).substr(2, 9);
          var result = parseTokens(tokens, i + 1, {
            octaveOffset: currentOctave,
            durationMultiplier: currentDuration,
            sustainBlockId: blockId
          }, currentKey, eventsArray, edo, lineNumber);
          i = result.pos;
          continue;
        }

        if (token.indexOf('-') === 0) {
          i++;
          continue;
        }

        if (token.indexOf('(') === 0 && token.lastIndexOf(')') === token.length - 1) {
          var inner = token.substring(1, token.length - 1);
          var noteTokens = inner.split(/\s+/).filter(function(t) { return t.length > 0; });
          var chordNotes = [];

          for (var nt = 0; nt < noteTokens.length; nt++) {
            var noteInfo = parseNoteTokenWithContext(noteTokens[nt], currentOctave, currentKey, edo);
            if (noteInfo) chordNotes.push(noteInfo);
          }

          var duration = 1 * currentDuration;
          var j = i + 1;
          while (j < tokens.length && tokens[j].indexOf('-') === 0) {
            duration += tokens[j].length * currentDuration;
            j++;
          }

          if (chordNotes.length > 0) {
            eventsArray.push({
              type: 'chord',
              notes: chordNotes,
              duration: duration,
              sustainBlockId: currentSustainBlock,
              lineNumber: lineNumber
            });
            console.log('Chord added with lineNumber:', lineNumber);
          }

          i = j;
          continue;
        }

        if (token === '0') {
          var duration = 1 * currentDuration;
          var j = i + 1;
          while (j < tokens.length && tokens[j].indexOf('-') === 0) {
            duration += tokens[j].length * currentDuration;
            j++;
          }

          eventsArray.push({
            type: 'rest',
            duration: duration,
            sustainBlockId: currentSustainBlock,
            lineNumber: lineNumber
          });

          i = j;
          continue;
        }

        var noteInfo = parseNoteTokenWithContext(token, currentOctave, currentKey, edo);
        if (noteInfo) {
          var duration = 1 * currentDuration;
          var j = i + 1;
          while (j < tokens.length && tokens[j].indexOf('-') === 0) {
            duration += tokens[j].length * currentDuration;
            j++;
          }

          eventsArray.push({
            type: 'note',
            pitch: noteInfo.pitch,
            midi: noteInfo.midi,
            duration: duration,
            sustainBlockId: currentSustainBlock,
            lineNumber: lineNumber
          });
          console.log('Note added with lineNumber:', lineNumber, 'midi:', noteInfo.midi);

          i = j;
          continue;
        }

        i++;
      }

      return { pos: i };
    }

    function parseNoteTokenWithContext(token, octaveOffset, key, edo) {
      var accidental = '';
      var localOctaveOffset = 0;
      var noteChar = '';
      var idx = 0;

      while (idx < token.length && (token[idx] === '_' || token[idx] === '^')) {
        if (token[idx] === '_') localOctaveOffset -= 1;
        else if (token[idx] === '^') localOctaveOffset += 1;
        idx++;
      }

      if (idx < token.length && (token[idx] === '#' || token[idx] === 'b')) {
        accidental = token[idx];
        idx++;
      }

      if (idx < token.length && token[idx] >= '1' && token[idx] <= '7') {
        noteChar = token[idx];
        idx++;
      } else {
        return null;
      }

      if (idx < token.length && (token[idx] === '#' || token[idx] === 'b')) {
        accidental = token[idx];
        idx++;
      }

      var totalOctaveOffset = octaveOffset + localOctaveOffset;

      var edoNumber;
      if (edo === 19) {
        var note19Offset = getEdoNoteSemitones(noteChar, accidental, edo);
        var key19Position = getKey19EdoPosition(key);
        if (key19Position === null) {
          key19Position = 0;
        }
        edoNumber = key19Position + note19Offset + totalOctaveOffset * 19;
      } else {
        var keyData = getKeySemitones(key);
        var keyBaseMidi = keyData.rootMidi;
        var cMajorOffset = getEdoNoteSemitones(noteChar, accidental, edo);
        edoNumber = keyBaseMidi + cMajorOffset + totalOctaveOffset * 12;
      }

      var divisor = edo === 19 ? 19 : 12;
      var resultOctave = Math.floor(edoNumber / divisor) + 4;
      var baseNoteName = NOTE_MAP[noteChar];
      var pitchStr = baseNoteName + accidental + resultOctave;

      return { pitch: pitchStr, midi: edoNumber, edo: edo };
    }
  }

  function processSustainPedals(score) {
    var sustainBlocks = [];

    for (var p = 0; p < score.parts.length; p++) {
      var part = score.parts[p];
      for (var v = 0; v < part.voices.length; v++) {
        var voice = part.voices[v];
        for (var e = 0; e < voice.length; e++) {
          var evt = voice[e];
          if (evt.sustainBlockId) {
            var block = null;
            for (var b = 0; b < sustainBlocks.length; b++) {
              if (sustainBlocks[b].id === evt.sustainBlockId) {
                block = sustainBlocks[b];
                break;
              }
            }
            if (!block) {
              block = { id: evt.sustainBlockId, events: [] };
              sustainBlocks.push(block);
            }
            block.events.push(evt);
          }
        }
      }
    }

    for (var b = 0; b < sustainBlocks.length; b++) {
      var block = sustainBlocks[b];
      var maxEndBeat = 0;
      for (var e = 0; e < block.events.length; e++) {
        var evt = block.events[e];
        if (evt.type !== 'rest') {
          var endBeat = evt.start + evt.duration;
          maxEndBeat = Math.max(maxEndBeat, endBeat);
        }
      }

      for (var e = 0; e < block.events.length; e++) {
        var evt = block.events[e];
        if (evt.type !== 'rest') {
          evt.duration = maxEndBeat - evt.start;
        }
      }
    }
  }

  // ==================== Audio Player ====================

  function AudioPlayer(score) {
    this.score = score;
    this.audioCtx = null;
    this.scheduledEvents = [];
    this.startTime = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.pausedAt = 0;
    this.duration = this.calculateDuration();
    this.gainNode = null;
  }

  AudioPlayer.prototype.calculateDuration = function() {
    var maxBeat = 0;
    var currentPartStart = 0;

    for (var p = 0; p < this.score.parts.length; p++) {
      var part = this.score.parts[p];
      var partMaxBeat = currentPartStart;
      for (var v = 0; v < part.voices.length; v++) {
        var voice = part.voices[v];
        if (voice.length > 0) {
          var last = voice[voice.length - 1];
          partMaxBeat = Math.max(partMaxBeat, last.start + last.duration);
        }
      }
      maxBeat = Math.max(maxBeat, partMaxBeat);
      currentPartStart = partMaxBeat;
    }

    return (maxBeat * 60) / this.score.bpm;
  };

  AudioPlayer.prototype.initAudio = function() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.connect(this.audioCtx.destination);
    this.gainNode.gain.value = 0.5;
  };

  AudioPlayer.prototype.schedule = function(startFromSec) {
    if (!this.audioCtx) return;
    this.stopAllNotes();

    // 保存所有timeout引用，以便stop时清除
    if (!this.activeTimeouts) {
      this.activeTimeouts = [];
    }

    var bpm = this.score.bpm;
    var startTime = this.audioCtx.currentTime;
    this.startTime = startTime - startFromSec;

    var currentPartStartBeat = 0;
    var player = this;

    for (var partIdx = 0; partIdx < this.score.parts.length; partIdx++) {
      var part = this.score.parts[partIdx];

      for (var v = 0; v < part.voices.length; v++) {
        var voice = part.voices[v];
        for (var e = 0; e < voice.length; e++) {
          var evt = voice[e];
          if (evt.type === 'rest') continue;

          var eventAbsStartBeat = evt.start;

          if (eventAbsStartBeat + evt.duration <= currentPartStartBeat) continue;

          var eventStartInPart = Math.max(0, eventAbsStartBeat - currentPartStartBeat);
          var startSec = currentPartStartBeat * 60 / bpm + eventStartInPart * 60 / bpm;

          if (startSec + (evt.duration * 60) / bpm < startFromSec) continue;

          var adjustedStart = Math.max(startSec - startFromSec, 0);
          var durationSec = (evt.duration * 60) / bpm;

          // 调用行号高亮回调
          if (this.onLineHighlight && evt.lineNumber) {
            var lineDelay = (adjustedStart - (player.audioCtx.currentTime - player.startTime)) * 1000;
            var lineTimeout = setTimeout(function() {
              if (player.isPlaying) {
                player.onLineHighlight(evt.lineNumber);
              }
            }, Math.max(0, lineDelay));
            player.activeTimeouts.push(lineTimeout);

            // 在音符结束时清除高亮
            if (this.onLineClear && evt.lineNumber) {
              var endDelay = (adjustedStart + durationSec - (player.audioCtx.currentTime - player.startTime)) * 1000;
              var endTimeout = setTimeout(function() {
                if (player.isPlaying) {
                  player.onLineClear(evt.lineNumber);
                }
              }, Math.max(0, endDelay));
              player.activeTimeouts.push(endTimeout);
            }
          }

          if (evt.type === 'chord') {
            for (var n = 0; n < evt.notes.length; n++) {
              this.scheduleNote(evt.notes[n].midi, adjustedStart, durationSec);
            }
          } else {
            this.scheduleNote(evt.midi, adjustedStart, durationSec);
          }
        }
      }
      currentPartStartBeat = this.calculatePartDuration(partIdx);
    }
  };

  AudioPlayer.prototype.calculatePartDuration = function(partIdx) {
    var part = this.score.parts[partIdx];
    var maxBeat = 0;
    for (var v = 0; v < part.voices.length; v++) {
      var voice = part.voices[v];
      for (var e = 0; e < voice.length; e++) {
        var endBeat = voice[e].start + voice[e].duration;
        maxBeat = Math.max(maxBeat, endBeat);
      }
    }
    return maxBeat;
  };

  AudioPlayer.prototype.scheduleNote = function(midi, startTime, durationSec) {
    var freq = edoToFreq(midi, this.score.edo || 12);
    if (!freq) return;

    // 调用音符开始回调
    if (this.onNoteStart) {
      var player = this;
      var noteOnDelay = (startTime - player.audioCtx.currentTime) * 1000;
      setTimeout(function() {
        player.onNoteStart(midi);
      }, Math.max(0, noteOnDelay));
    }

    // 调用音符结束回调
    if (this.onNoteEnd) {
      var player = this;
      var noteOffDelay = (startTime + durationSec - player.audioCtx.currentTime) * 1000;
      setTimeout(function() {
        player.onNoteEnd(midi);
      }, Math.max(0, noteOffDelay));
    }

    var peakLevel = 0.2;
    var decayRate = 0.5;

    var osc1 = this.audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;

    var gainNode1 = this.audioCtx.createGain();

    gainNode1.gain.setValueAtTime(0, startTime);
    gainNode1.gain.linearRampToValueAtTime(peakLevel, startTime + 0.005);
    var decayEnd = startTime + durationSec - 0.15;
    if (decayEnd > startTime + 0.005) {
      var targetLevel = Math.max(0.001, peakLevel - decayRate * (decayEnd - startTime - 0.005));
      gainNode1.gain.linearRampToValueAtTime(targetLevel, decayEnd);
    }
    gainNode1.gain.linearRampToValueAtTime(0.001, startTime + durationSec);

    osc1.connect(gainNode1);
    gainNode1.connect(this.gainNode);
    osc1.start(startTime);
    osc1.stop(startTime + durationSec);

    var osc2 = this.audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    var gainNode2 = this.audioCtx.createGain();
    gainNode2.gain.setValueAtTime(0, startTime);
    gainNode2.gain.linearRampToValueAtTime(0.15, startTime + 0.005);
    var decayEnd2 = startTime + durationSec - 0.15;
    if (decayEnd2 > startTime + 0.005) {
      var targetLevel2 = Math.max(0.001, 0.15 - decayRate * 0.5 * (decayEnd2 - startTime - 0.005));
      gainNode2.gain.linearRampToValueAtTime(targetLevel2, decayEnd2);
    }
    gainNode2.gain.linearRampToValueAtTime(0.001, startTime + durationSec);

    osc2.connect(gainNode2);
    gainNode2.connect(this.gainNode);
    osc2.start(startTime);
    osc2.stop(startTime + durationSec);

    // 保存振荡器和增益节点的引用，以便停止
    if (!this.activeOscillators) {
      this.activeOscillators = [];
    }
    this.activeOscillators.push({ osc1, gainNode1, osc2, gainNode2, stopTime: startTime + durationSec });
  };

  AudioPlayer.prototype.stopAllNotes = function() {
    // 清除所有排队的timeout
    if (this.activeTimeouts) {
      for (var i = 0; i < this.activeTimeouts.length; i++) {
        clearTimeout(this.activeTimeouts[i]);
      }
      this.activeTimeouts = [];
    }

    if (!this.activeOscillators) return;

    var now = this.audioCtx.currentTime;
    for (var i = 0; i < this.activeOscillators.length; i++) {
      var note = this.activeOscillators[i];
      try {
        // 立即停止声音
        note.gainNode1.gain.cancelScheduledValues(now);
        note.gainNode1.gain.setValueAtTime(note.gainNode1.gain.value, now);
        note.gainNode1.gain.linearRampToValueAtTime(0.001, now + 0.01);

        note.gainNode2.gain.cancelScheduledValues(now);
        note.gainNode2.gain.setValueAtTime(note.gainNode2.gain.value, now);
        note.gainNode2.gain.linearRampToValueAtTime(0.001, now + 0.01);

        note.osc1.stop(now + 0.01);
        note.osc2.stop(now + 0.01);
      } catch (e) {
        // Oscillator may already be stopped
      }
    }
    this.activeOscillators = [];
  };

  AudioPlayer.prototype.play = function() {
    this.initAudio();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.stopAllNotes();
    this.schedule(this.pausedAt);
    this.isPlaying = true;
    this.isPaused = false;

    var player = this;
    var checkEnd = setInterval(function() {
      if (!player.isPlaying) {
        clearInterval(checkEnd);
        return;
      }
      var current = player.getCurrentTime();
      if (current >= player.duration) {
        player.isPlaying = false;
        player.isPaused = false;
        player.pausedAt = 0;
        clearInterval(checkEnd);
        if (player.onEnd) player.onEnd();
      }
    }, 100);

    return Promise.resolve();
  };

  AudioPlayer.prototype.pause = function() {
    if (this.isPlaying) {
      this.pausedAt = this.getCurrentTime();
      this.stopAllNotes();
      this.isPlaying = false;
      this.isPaused = true;
    }
  };

  AudioPlayer.prototype.stop = function() {
    this.stopAllNotes();
    this.isPlaying = false;
    this.isPaused = false;
    this.pausedAt = 0;
  };

  AudioPlayer.prototype.seek = function(percent) {
    var target = (percent / 100) * this.duration;
    this.pausedAt = target;
    if (this.isPlaying) {
      this.stopAllNotes();
      this.schedule(target);
    }
  };

  AudioPlayer.prototype.getCurrentTime = function() {
    if (!this.audioCtx) return 0;
    if (!this.isPlaying && !this.isPaused) return 0;
    if (this.isPaused) return this.pausedAt;
    var current = this.audioCtx.currentTime - this.startTime;
    return Math.min(current, this.duration);
  };

  // ==================== Export ====================

  window.MusicParser = {
    parseMusic: parseMusic,
    processSustainPedals: processSustainPedals,
    AudioPlayer: AudioPlayer,
    EDO_19_KEY_SEQUENCE: EDO_19_KEY_SEQUENCE,
    KEY_19EDO_POSITIONS: KEY_19EDO_POSITIONS
  };

})();

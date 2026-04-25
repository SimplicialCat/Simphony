// music-player.js
(function() {
  // Constants first
  const NOTE_MAP = { '1': 'C', '2': 'D', '3': 'E', '4': 'F', '5': 'G', '6': 'A', '7': 'B' };
  const BASE_OCTAVE = 4;
  const BASE_MIDI = 60;

  // C大调各音级的半音偏移 (全全半全全半)
  const C_MAJOR_SEMITONES = { '1': 0, '2': 2, '3': 4, '4': 5, '5': 7, '6': 9, '7': 11 };

  // 各调号1级音的MIDI基准 (C4=60)
  const KEY_ROOT_MIDI = {
    'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
    'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
    'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71
  };

  // 计算指定调号下各音级的半音偏移
  // 大调的音阶结构是固定的: 全全半全全全半
  // 所以各音级相对于根音的偏移在所有大调中是一样的
  function getKeySemitones(key) {
    var rootMidi = KEY_ROOT_MIDI[key] || 60;
    // 大调的偏移是固定的
    return { rootMidi: rootMidi, semitones: C_MAJOR_SEMITONES };
  }

  // 19EDO各音级的19平均律偏移
  const EDO_19_NOTES = {
    '1': 0,    '#1': 1,  'b2': 2,  '2': 3,
    '#2': 4,   'b3': 5,  '3': 6,   '#3': 7,
    'b4': 7,   '4': 8,   '#4': 9,  'b5': 10,
    '5': 11,   '#5': 12, 'b6': 13, '6': 14,
    '#6': 15,  'b7': 16, '7': 17,  '#7': 18, 'b1': -1
  };

  // 19EDO中各调的主音位置（相对于C4=0）
  // 基于大调音阶在19EDO中的结构
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

  // 获取调在19EDO中的位置
  function getKey19EdoPosition(key) {
    return KEY_19EDO_POSITIONS[key] || 0;
  }

  // EDO-aware note calculation function
  function getEdoNoteSemitones(noteChar, accidental, edo) {
    if (edo === 19) {
      var noteKey = noteChar;
      if (accidental) noteKey = accidental + noteChar;
      return EDO_19_NOTES[noteKey];
    } else {
      // 12EDO: existing logic
      var baseSemitone = C_MAJOR_SEMITONES[noteChar] || 0;
      if (accidental === '#') baseSemitone += 1;
      else if (accidental === 'b') baseSemitone -= 1;
      return baseSemitone;
    }
  }

  const KEY_SIGNATURES = {
    'C':  { note: 'C', octave: 4 },
    'C#': { note: 'C', accidental: '#', octave: 4 },
    'Db': { note: 'C', accidental: 'b', octave: 4 },
    'D':  { note: 'D', octave: 4 },
    'D#': { note: 'D', accidental: '#', octave: 4 },
    'Eb': { note: 'D', accidental: 'b', octave: 4 },
    'E':  { note: 'E', octave: 4 },
    'F':  { note: 'F', octave: 4 },
    'F#': { note: 'F', accidental: '#', octave: 4 },
    'Gb': { note: 'F', accidental: 'b', octave: 4 },
    'G':  { note: 'G', octave: 4 },
    'G#': { note: 'G', accidental: '#', octave: 4 },
    'Ab': { note: 'G', accidental: 'b', octave: 4 },
    'A':  { note: 'A', octave: 4 },
    'A#': { note: 'A', accidental: '#', octave: 4 },
    'Bb': { note: 'A', accidental: 'b', octave: 4 },
    'B':  { note: 'B', octave: 4 }
  };

  // Helper functions
  function noteToMidi(noteStr) {
    var match = noteStr.match(/^([A-G])([#b]?)(\d+)$/);
    if (!match) return null;
    var letter = match[1];
    var accidental = match[2];
    var octave = match[3];
    var semitone = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 }[letter];
    if (accidental === '#') semitone += 1;
    else if (accidental === 'b') semitone -= 1;
    return (parseInt(octave) + 1) * 12 + semitone;
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // EDO-aware frequency calculation
  function edoToFreq(edoNumber, edo, refFreq) {
    if (edo === 12) {
      return 440 * Math.pow(2, (edoNumber - 69) / 12);
    } else {
      // For 19EDO, use reference frequency (C4 = 261.6256 Hz by default)
      refFreq = refFreq || 261.6256;
      // edoNumber 0 corresponds to C4 in 19EDO system
      return refFreq * Math.pow(2, edoNumber / 19);
    }
  }

  // Main parser function
  function parseMusic(code) {
    var lines = code.split('\n');
    var bpm = 120;
    var key = 'C';
    var edo = 12;
    var parts = [];
    var currentPart = { voices: [] };
    var currentVoiceArray = [];

    for (var i = 0; i < lines.length; i++) {
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
          // 去掉引号
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          if (varName === 'bpm') {
            var parsedBpm = parseInt(value, 10);
            if (!isNaN(parsedBpm)) {
              bpm = parsedBpm;
            }
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
        parseVoiceLine(voiceLine, newVoice, key, edo);
        if (newVoice.length > 0) {
          currentPart.voices.push(newVoice);
        }
      } else {
        parseVoiceLine(line, currentVoiceArray, key, edo);
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

    function parseVoiceLine(line, eventsArray, currentKey, edo) {
      var tokens = tokenize(line);
      var pos = 0;
      while (pos < tokens.length) {
        var result = parseTokens(tokens, pos, {
          octaveOffset: 0,
          durationMultiplier: 1.0,
          sustainBlockId: null
        }, currentKey, eventsArray, edo);
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
        
        // Note or rest - check character by character
        if (char === '0' || char === '1' || char === '2' || char === '3' || 
            char === '4' || char === '5' || char === '6' || char === '7' ||
            char === '_' || char === '^' || char === '#' || char === 'b') {
          var note = '';
          
          // Special case: '0' is a rest, handle it separately
          if (char === '0') {
            tokens.push('0');
            i++;
            continue;
          }
          
          // Collect prefix first
          while (i < line.length && (line[i] === '_' || line[i] === '^' || line[i] === '#' || line[i] === 'b')) {
            note += line[i];
            i++;
          }
          // Then note number
          if (i < line.length && line[i] >= '1' && line[i] <= '7') {
            note += line[i];
            i++;
          }
          // Possible suffix accidental
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

    function parseTokens(tokens, pos, context, currentKey, eventsArray, edo) {
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
          }, currentKey, eventsArray, edo);
          i = result.pos;
          continue;
        }

        if (token === '_{') {
          var result = parseTokens(tokens, i + 1, {
            octaveOffset: currentOctave - 1,
            durationMultiplier: currentDuration,
            sustainBlockId: currentSustainBlock
          }, currentKey, eventsArray, edo);
          i = result.pos;
          continue;
        }

        if (token === '={') {
          var result = parseTokens(tokens, i + 1, {
            octaveOffset: currentOctave,
            durationMultiplier: currentDuration * 0.5,
            sustainBlockId: currentSustainBlock
          }, currentKey, eventsArray, edo);
          i = result.pos;
          continue;
        }

        if (token === '@{') {
          var blockId = 'sustain_' + Math.random().toString(36).substr(2, 9);
          var result = parseTokens(tokens, i + 1, {
            octaveOffset: currentOctave,
            durationMultiplier: currentDuration,
            sustainBlockId: blockId
          }, currentKey, eventsArray, edo);
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
              sustainBlockId: currentSustainBlock
            });
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
            sustainBlockId: currentSustainBlock
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
            sustainBlockId: currentSustainBlock
          });

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
        // 19EDO calculation - use direct 19EDO key positions
        var note19Offset = getEdoNoteSemitones(noteChar, accidental, edo);

        // Get the 19EDO position of the key tonic directly
        var key19Position = getKey19EdoPosition(key);
        if (key19Position === null) {
          // Fallback to C if key not found
          key19Position = 0;
        }

        // Calculate absolute position in 19EDO
        // totalOctaveOffset represents octave shifts from the key's base octave
        edoNumber = key19Position + note19Offset + totalOctaveOffset * 19;
      } else {
        // 12EDO calculation (existing logic)
        var keyData = getKeySemitones(key);
        var keyBaseMidi = keyData.rootMidi;
        var cMajorOffset = getEdoNoteSemitones(noteChar, accidental, edo);
        edoNumber = keyBaseMidi + cMajorOffset + totalOctaveOffset * 12;
      }

      // 从EDO值计算八度和音名
      var divisor = edo === 19 ? 19 : 12;
      var resultOctave = Math.floor(edoNumber / divisor) + 4; // +4 to align with C4 = 60
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

  // Audio Player class
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

    var bpm = this.score.bpm;
    var startTime = this.audioCtx.currentTime;
    this.startTime = startTime - startFromSec;

    var currentPartStartBeat = 0;
    
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
          var actualStartTime = startTime + adjustedStart;
          
          if (evt.type === 'note') {
            this.scheduleNote(evt.midi, actualStartTime, (evt.duration * 60) / bpm);
          } else if (evt.type === 'chord') {
            for (var n = 0; n < evt.notes.length; n++) {
              this.scheduleNote(evt.notes[n].midi, actualStartTime, (evt.duration * 60) / bpm);
            }
          }
        }
      }
      
      var partMaxBeat = currentPartStartBeat;
      for (var v = 0; v < part.voices.length; v++) {
        var voice = part.voices[v];
        if (voice.length > 0) {
          var last = voice[voice.length - 1];
          partMaxBeat = Math.max(partMaxBeat, last.start + last.duration);
        }
      }
      currentPartStartBeat = partMaxBeat;
    }
  };

  AudioPlayer.prototype.scheduleNote = function(midi, startTime, durationSec) {
    var freq = edoToFreq(midi, this.score.edo || 12);
    if (!freq) return;

    var peakLevel = 0.2;
    var decayRate = 0.5;

    // 主音 - 正弦波
    var osc1 = this.audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;
    
    var gainNode1 = this.audioCtx.createGain();
    
    // 主音包络 - 更快起音
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

    // 泛音 - 高八度，让音色更亮
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

    // 高亮钢琴按键 - 检查播放状态，传入当前generation防止残留
    var self = this;
    if (typeof window.highlightPianoKey === 'function' && this.isPlaying) {
      var now = this.audioCtx.currentTime;
      var delay = (startTime - now) * 1000;
      var currentGeneration = pianoHighlightGeneration;
      if (delay <= 0) {
        window.highlightPianoKey(midi, durationSec, currentGeneration);
      } else {
        setTimeout(function() {
          // 再次检查播放状态和世代
          if (self.isPlaying && pianoHighlightGeneration === currentGeneration) {
            window.highlightPianoKey(midi, durationSec, currentGeneration);
          }
        }, delay);
      }
    }

    this.scheduledEvents.push({ osc: osc1, gainNode: gainNode1 });
    this.scheduledEvents.push({ osc: osc2, gainNode: gainNode2 });
  };

  AudioPlayer.prototype.stopAllNotes = function() {
    for (var i = 0; i < this.scheduledEvents.length; i++) {
      var item = this.scheduledEvents[i];
      try {
        item.osc.stop();
        item.osc.disconnect();
        item.gainNode.disconnect();
      } catch (e) {}
    }
    this.scheduledEvents = [];
    // 清除钢琴按键高亮
    if (typeof window.clearAllPianoHighlights === 'function') {
      window.clearAllPianoHighlights();
    }
  };

  AudioPlayer.prototype.play = function() {
    var self = this;
    return new Promise(function(resolve) {
      if (!self.audioCtx) {
        self.initAudio();
      }
      if (self.isPlaying) {
        resolve();
        return;
      }
      // 播放前先清除所有钢琴高亮，防止残留
      if (typeof window.clearAllPianoHighlights === 'function') {
        window.clearAllPianoHighlights();
      }
      if (self.isPaused) {
        self.audioCtx.resume().then(function() {
          self.isPlaying = true;
          self.isPaused = false;
          self.schedule(self.pausedAt);
          resolve();
        });
      } else {
        self.audioCtx.resume().then(function() {
          self.isPlaying = true;
          self.isPaused = false;
          self.schedule(0);
          resolve();
        });
      }
    });
  };

  AudioPlayer.prototype.pause = function() {
    var self = this;
    if (!this.isPlaying) return;
    this.audioCtx.suspend().then(function() {
      self.isPlaying = false;
      self.isPaused = true;
      if (self.audioCtx) {
        self.pausedAt = self.audioCtx.currentTime - self.startTime;
      }
      self.stopAllNotes();
      // 清除钢琴按键高亮
      if (typeof window.clearAllPianoHighlights === 'function') {
        window.clearAllPianoHighlights();
      }
    });
  };

  AudioPlayer.prototype.stop = function() {
    if (this.audioCtx) {
      this.audioCtx.suspend();
      this.stopAllNotes();
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.pausedAt = 0;
    // 清除钢琴按键高亮
    if (typeof window.clearAllPianoHighlights === 'function') {
      window.clearAllPianoHighlights();
    }
  };

  AudioPlayer.prototype.seek = function(percent) {
    if (!this.audioCtx) return;
    var targetSec = (percent / 100) * this.duration;
    var wasPlaying = this.isPlaying;
    this.stopAllNotes();
    if (wasPlaying) {
      this.schedule(targetSec);
      this.startTime = this.audioCtx.currentTime - targetSec;
      this.pausedAt = targetSec;
    } else {
      this.pausedAt = targetSec;
    }
  };

  AudioPlayer.prototype.getCurrentTime = function() {
    if (!this.audioCtx) return 0;
    if (this.isPlaying) {
      return Math.max(0, this.audioCtx.currentTime - this.startTime);
    } else {
      return this.pausedAt;
    }
  };

  // UI Controller
  function createPlayer(container, musicCode) {
    var score = parseMusic(musicCode);
    processSustainPedals(score);

    var player = new AudioPlayer(score);

    var playerId = 'music-player-' + Math.random().toString(36).substr(2, 9);

    var wrapper = document.createElement('div');
    wrapper.className = 'music-player';
    wrapper.id = playerId;
    wrapper.style.cssText = 'margin:0.5em 0; padding:8px 12px; background:#FAFBFC;';

    var buttonRow = document.createElement('div');
    buttonRow.style.cssText = 'margin-bottom:4px;';

    var playBtn = document.createElement('button');
    playBtn.id = playerId + '-playpause';
    playBtn.style.cssText = 'background:none; color:#465BCF; border:none; padding:2px 8px; cursor:pointer; font-size:13px;';
    playBtn.textContent = '▶ 播放';

    var stopBtn = document.createElement('button');
    stopBtn.style.cssText = 'background:none; color:#BD9368; border:none; padding:2px 8px; cursor:pointer; font-size:13px;';
    stopBtn.textContent = '⏹ 停止';

    buttonRow.appendChild(playBtn);
    buttonRow.appendChild(stopBtn);

    var progressContainer = document.createElement('div');
    progressContainer.id = playerId + '-progress-container';
    progressContainer.style.cssText = 'width:100%; height:6px; background:#E9ECEF; border-radius:3px; margin-top:6px;';

    var progressFill = document.createElement('div');
    progressFill.id = playerId + '-progress-fill';
    progressFill.style.cssText = 'width:0%; height:100%; background:#A6BBCF; border-radius:3px;';

    progressContainer.appendChild(progressFill);

    wrapper.appendChild(buttonRow);
    wrapper.appendChild(progressContainer);

    container.parentNode.replaceChild(wrapper, container);

    var animationFrame = null;

    function formatTime(sec) {
      var mins = Math.floor(sec / 60);
      var secs = Math.floor(sec % 60);
      return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function updateProgress() {
      var current = player.getCurrentTime();
      if (current >= player.duration) {
        // Playback finished
        progressFill.style.width = '100%';
        player.isPlaying = false;
        player.isPaused = false;
        playBtn.textContent = '▶ 播放';
        if (animationFrame) cancelAnimationFrame(animationFrame);
        return;
      }
      if (!player.isPlaying && !player.isPaused) return;
      var percent = (current / player.duration) * 100;
      if (percent > 100) percent = 100;
      progressFill.style.width = percent + '%';
      if (player.isPlaying) {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    }

    playBtn.addEventListener('click', function() {
      // 切换键盘到当前音乐的EDO
      switchPianoUI(score.edo);

      if (player.isPlaying) {
        player.pause();
        playBtn.textContent = '▶ 播放';
        if (animationFrame) cancelAnimationFrame(animationFrame);
      } else {
        player.play().then(function() {
          playBtn.textContent = '⏸ 暂停';
          updateProgress();
        });
      }
    });

    stopBtn.addEventListener('click', function() {
      player.stop();
      playBtn.textContent = '▶ 播放';
      progressFill.style.width = '0%';
      if (animationFrame) cancelAnimationFrame(animationFrame);
    });

    progressContainer.addEventListener('click', function(e) {
      var rect = progressContainer.getBoundingClientRect();
      var percent = ((e.clientX - rect.left) / rect.width) * 100;
      progressFill.style.width = percent + '%';
      var targetSec = (percent / 100) * player.duration;
      if (player.isPlaying) {
        player.seek(percent);
      } else {
        player.pausedAt = targetSec;
      }
    });

    wrapper.title = '时长: ' + formatTime(player.duration);
  }

  // Export to global scope - AFTER all definitions
  window.parseMusic = parseMusic;
  window.processSustainPedals = processSustainPedals;
  window.AudioPlayer = AudioPlayer;

  // Initialize on DOM ready
  function initPlayers() {
    try {
      var codeBlocks = document.querySelectorAll('pre code.language-music');
      console.log('Found', codeBlocks.length, 'code blocks');

      // First pass: detect EDO from first music block
      var detectedEdo = 12; // default to 12EDO
      for (var i = 0; i < codeBlocks.length; i++) {
        var musicCode = codeBlocks[i].textContent.trim();
        var edoMatch = musicCode.match(/let\s+edo\s*=\s*(\d+)/);
        if (edoMatch) {
          var edoValue = parseInt(edoMatch[1]);
          if (edoValue === 12 || edoValue === 19) {
            detectedEdo = edoValue;
            break;
          }
        }
      }

      // Create piano with detected EDO
      if (!pianoContainer) {
        createPianoUI(detectedEdo);
      }

      // Second pass: create players
      for (var i = 0; i < codeBlocks.length; i++) {
        var code = codeBlocks[i];
        var musicCode = code.textContent.trim();
        console.log('Processing block', i, ':', musicCode.substring(0, 30));
        createPlayer(code, musicCode);
      }
    } catch (e) {
      console.error('Error initializing players:', e);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayers);
  } else {
    initPlayers();
  }

  // ========== 钢琴界面功能 ==========
  
  // 钢琴样式
  var pianoStyle = document.createElement('style');
  pianoStyle.textContent = `
    /* 为页面底部留出空间 */
    body {
      padding-bottom: 120px !important;
    }
    html {
      scroll-padding-bottom: 120px;
    }
    
    /* 钢琴容器 */
    .music-piano-container {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #ffffff;
      padding: 10px 20px 14px;
      z-index: 10000;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      border-top: 1px solid #e0e0e0;
    }
    
    .music-piano-keys {
      position: relative;
      height: 105px;
      min-width: 700px;
      max-width: 90%;
      margin: 0 auto;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .music-piano-key {
      position: absolute;
      cursor: pointer;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 4px;
      font-size: 0.5rem;
      font-weight: 300;
      user-select: none;
      transition: background 0.05s, transform 0.05s;
      box-sizing: border-box;
      border: none;
    }
    
    .music-piano-key:active {
      transform: scaleY(0.92);
    }
    
    .music-piano-key.white {
      background: #FAFBFC;
      height: 120px;
      bottom: 0;
      color: #253085;
      border-right: 1px solid rgba(37, 48, 133, 0.15);
      border-radius: 0 0 4px 4px;
    }
    
    .music-piano-key.black {
      background: #1a1a1a;
      height: 72px;
      top: 0;
      color: #fff;
      z-index: 10;
      border-radius: 0 0 3px 3px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    }
    
    .music-piano-key.playing {
      background: #50BBFF !important;
      box-shadow: 0 0 15px #70DBFF, 0 -3px 0 #70DBFF;
    }
    
    .music-piano-key.black.playing {
      background: #4550D5 !important;
      box-shadow: 0 0 15px #70DBFF;
    }

    /* 19EDO-specific key styles */
    .music-piano-key.purple {
      background: linear-gradient(135deg, #465BCF, #5670E9);
      height: 60px;
      top: 0;
      color: #fff;
      z-index: 10;
      border-radius: 0 0 3px 3px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    
    .music-piano-key.blue {
      background: linear-gradient(135deg, #70DBFF, #6AC6E8);
      height: 34px;
      top: 0;
      color: #fff;
      z-index: 10;
      border-radius: 0 0 3px 3px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }

    .music-piano-key.purple.playing {
      background: #4550D5 !important;
      box-shadow: 0 0 15px #70DBFF;
    }

    .music-piano-key.blue.playing {
      background: #4550D5 !important;
      box-shadow: 0 0 15px #70DBFF;
    }
    
    .music-piano-label {
      text-align: center;
      color: #666;
      font-size: 0.7rem;
      margin-bottom: 8px;
      opacity: 0.8;
    }
  `;
  document.head.appendChild(pianoStyle);

  // 全局钢琴相关变量
  var pianoAudioCtx = null;
  var pianoContainer = null;
  var pianoKeyElements = {};
  var pianoHighlightGeneration = 0;  // 高亮世代计数器
  var currentEdo = 12;  // 当前EDO模式

  // 钢琴音符到 MIDI 的映射
  var pianoMidiToNote = {};

  // 19EDO键盘序列 (from 19edo-keyboard.html)
  const EDO_19_KEY_SEQUENCE = [
    "white",  // 1
    "purple", "blue",   // 1-2 (large interval)
    "white",  // 2
    "purple", "blue",   // 2-3 (large interval)
    "white",  // 3
    "purple",           // 3-4 (small interval - purple only)
    "white",  // 4
    "purple", "blue",   // 4-5 (large interval)
    "white",  // 5
    "purple", "blue",   // 5-6 (large interval)
    "white",  // 6
    "purple", "blue",   // 6-7 (large interval)
    "white",  // 7
    "purple"            // 7-end (purple only)
  ];
  
  // 销毁钢琴界面
  function destroyPianoUI() {
    if (pianoContainer) {
      pianoContainer.remove();
      pianoContainer = null;
      pianoKeyElements = {};
      pianoMidiToNote = {};
    }
  }

  // 切换钢琴EDO模式
  function switchPianoUI(edo) {
    if (currentEdo === edo && pianoContainer) return; // 已经是目标EDO，无需切换

    destroyPianoUI();
    createPianoUI(edo);
  }

  // 创建钢琴界面 (EDO-aware)
  function createPianoUI(edo) {
    currentEdo = edo || 12;
    pianoContainer = document.createElement('div');
    pianoContainer.className = 'music-piano-container';
    pianoContainer.innerHTML = '<div class="music-piano-keys" id="musicPianoKeys"></div>';
    document.body.appendChild(pianoContainer);

    if (currentEdo === 19) {
      create19EdoPiano();
    } else {
      create12EdoPiano();
    }
  }

  // 12EDO钢琴创建 (原有逻辑)
  function create12EdoPiano() {
    var pianoKeysDiv = document.getElementById('musicPianoKeys');

    // 从 C2 到 C7 的音符（左右各加一个八度）
    var whiteNotes = [];
    var blackNotes = [];

    for (var midi = 36; midi <= 96; midi++) {
      var noteName = midiToNoteName(midi);
      var isBlack = noteName.includes('#');

      pianoMidiToNote[midi] = noteName;

      if (isBlack) {
        blackNotes.push({ midi: midi, note: noteName });
      } else {
        whiteNotes.push({ midi: midi, note: noteName });
      }
    }

    var whiteWidthPercent = 100 / whiteNotes.length;
    var blackWidthPercent = whiteWidthPercent * 0.6;

    // 白键
    whiteNotes.forEach(function(item, index) {
      var key = document.createElement('div');
      key.className = 'music-piano-key white';
      key.dataset.midi = item.midi;
      key.dataset.note = item.note;
      key.style.left = (index * whiteWidthPercent) + '%';
      key.style.width = whiteWidthPercent + '%';

      key.addEventListener('click', function() {
        playPianoNote(item.midi);
      });

      pianoKeysDiv.appendChild(key);
      pianoKeyElements[item.midi] = key;
    });

    // 黑键位置计算
    var blackPositions = {
      'C#': 0, 'D#': 1, 'F#': 3, 'G#': 4, 'A#': 5
    };

    blackNotes.forEach(function(item) {
      var noteName = item.note.slice(0, -1);
      var octave = parseInt(item.note.slice(-1));
      var whiteIndex = -1;

      // 找到该黑键左边的白键索引
      for (var i = 0; i < whiteNotes.length; i++) {
        var wn = whiteNotes[i].note;
        var wnName = wn.slice(0, -1);
        var wnOctave = parseInt(wn.slice(-1));

        if (wnOctave === octave) {
          if (wnName === 'C' && noteName === 'C#') { whiteIndex = i; break; }
          if (wnName === 'D' && noteName === 'D#') { whiteIndex = i; break; }
          if (wnName === 'F' && noteName === 'F#') { whiteIndex = i; break; }
          if (wnName === 'G' && noteName === 'G#') { whiteIndex = i; break; }
          if (wnName === 'A' && noteName === 'A#') { whiteIndex = i; break; }
        }
      }

      if (whiteIndex === -1) return;

      var leftPercent = (whiteIndex + 1) * whiteWidthPercent - blackWidthPercent * 0.5;

      // 计算等音名称
      var noteName = item.note.slice(0, -1);
      var octave = item.note.slice(-1);
      var enharmonic = '';
      if (noteName === 'C#') enharmonic = 'Db';
      else if (noteName === 'D#') enharmonic = 'Eb';
      else if (noteName === 'F#') enharmonic = 'Gb';
      else if (noteName === 'G#') enharmonic = 'Ab';
      else if (noteName === 'A#') enharmonic = 'Bb';

      var key = document.createElement('div');
      key.className = 'music-piano-key black';
      key.dataset.midi = item.midi;
      key.dataset.note = item.note;
      // 无文字
      key.style.left = leftPercent + '%';
      key.style.width = blackWidthPercent + '%';

      key.addEventListener('click', function() {
        playPianoNote(item.midi);
      });

      pianoKeysDiv.appendChild(key);
      pianoKeyElements[item.midi] = key;
    });
  }

  // 19EDO钢琴创建 (新逻辑)
  function create19EdoPiano() {
    var pianoKeysDiv = document.getElementById('musicPianoKeys');
    var whiteNotes = [];
    var purpleNotes = [];
    var blueNotes = [];

    // 生成19EDO音符
    // We want to create keys from approximately C2 to C7
    // In 19EDO, C4 is position 0, so we want keys from position -38 to +57
    var octaveCount = 5;
    var startOctave = -2; // Start 2 octaves below C4
    var endOctave = 3;    // End 3 octaves above C4

    for (var oct = startOctave; oct < endOctave; oct++) {
      for (var i = 0; i < EDO_19_KEY_SEQUENCE.length; i++) {
        var keyType = EDO_19_KEY_SEQUENCE[i];
        // Calculate 19EDO position from C4 (where C4 = 0)
        var edo19Position = oct * 19 + i;

        pianoMidiToNote[edo19Position] = keyType.charAt(0).toUpperCase() + keyType.slice(1);

        if (keyType === 'white') {
          whiteNotes.push({ midi: edo19Position, type: keyType, localIdx: i });
        } else if (keyType === 'purple') {
          purpleNotes.push({ midi: edo19Position, type: keyType, localIdx: i });
        } else if (keyType === 'blue') {
          blueNotes.push({ midi: edo19Position, type: keyType, localIdx: i });
        }
      }
    }

    var whiteWidthPercent = 100 / whiteNotes.length;

    // 白键
    whiteNotes.forEach(function(item, index) {
      var key = document.createElement('div');
      key.className = 'music-piano-key white';
      key.dataset.midi = item.midi;
      key.dataset.note = item.type;
      key.style.left = (index * whiteWidthPercent) + '%';
      key.style.width = whiteWidthPercent + '%';

      key.addEventListener('click', function() {
        playPianoNote19Edo(item.midi);
      });

      pianoKeysDiv.appendChild(key);
      pianoKeyElements[item.midi] = key;
    });

    // 紫/蓝键位置计算 (based on 19edo-keyboard.html logic)
    var allColoredNotes = purpleNotes.concat(blueNotes);
    allColoredNotes.forEach(function(item) {
      // 找到对应的白键位置
      var whiteIndex = -1;
      for (var i = 0; i < whiteNotes.length; i++) {
        if (whiteNotes[i].midi > item.midi) {
          whiteIndex = i - 1;
          break;
        }
      }
      if (whiteIndex === -1) whiteIndex = whiteNotes.length - 1;

      // 根据间隔模式确定位置
      var localPos = item.localIdx;
      var leftPercent;
      var widthPercent = whiteWidthPercent * 0.5;

      // 单紫键 (间隔小)
      if (item.type === 'purple' &&
          (localPos === 7 || localPos === 18)) {
        leftPercent = (whiteIndex + 0.7) * whiteWidthPercent ;
      }
      // 紫+蓝双键 (间隔大)
      else if ((localPos === 1 || localPos === 2 ||
           localPos === 4 || localPos === 5 ||
           localPos === 9 || localPos === 10 ||
           localPos === 12 || localPos === 13 ||
           localPos === 15 || localPos === 16)) {
        if (item.type === 'purple') {
          leftPercent = (whiteIndex + 0.55) * whiteWidthPercent ;
        } else { // blue
          leftPercent = (whiteIndex + 0.85) * whiteWidthPercent ;
        }
      } else {
        leftPercent = (whiteIndex + 0.8) * whiteWidthPercent;
      }

      var key = document.createElement('div');
      key.className = 'music-piano-key ' + item.type;
      key.dataset.midi = item.midi;
      key.dataset.note = item.type;
      key.style.left = leftPercent + '%';
      key.style.width = widthPercent + '%';

      key.addEventListener('click', function() {
        playPianoNote19Edo(item.midi);
      });

      pianoKeysDiv.appendChild(key);
      pianoKeyElements[item.midi] = key;
    });
  }
  
  // MIDI 转音符名
  function midiToNoteName(midi) {
    var notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var octave = Math.floor(midi / 12) - 1;
    var note = notes[midi % 12];
    return note + octave;
  }
  
  // 播放钢琴音符
  function playPianoNote(midi) {
    if (!pianoAudioCtx) {
      pianoAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (pianoAudioCtx.state === 'suspended') {
      pianoAudioCtx.resume();
    }
    
    var freq = 440 * Math.pow(2, (midi - 69) / 12);
    var now = pianoAudioCtx.currentTime;
    
    // 主音 - 正弦波
    var osc1 = pianoAudioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;
    
    var gainNode1 = pianoAudioCtx.createGain();
    gainNode1.gain.setValueAtTime(0, now);
    gainNode1.gain.linearRampToValueAtTime(0.3, now + 0.005);
    gainNode1.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gainNode1.gain.linearRampToValueAtTime(0.001, now + 0.8);
    
    osc1.connect(gainNode1);
    gainNode1.connect(pianoAudioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);
    
    // 泛音 - 让音色更亮
    var osc2 = pianoAudioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2; // 高八度泛音
    
    var gainNode2 = pianoAudioCtx.createGain();
    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.15, now + 0.005);
    gainNode2.gain.linearRampToValueAtTime(0.08, now + 0.2);
    gainNode2.gain.linearRampToValueAtTime(0.001, now + 0.6);
    
    osc2.connect(gainNode2);
    gainNode2.connect(pianoAudioCtx.destination);
    osc2.start(now);
    osc2.stop(now + 0.6);
  }

  // 播放19EDO钢琴音符
  function playPianoNote19Edo(midi) {
    if (!pianoAudioCtx) {
      pianoAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (pianoAudioCtx.state === 'suspended') {
      pianoAudioCtx.resume();
    }

    var freq = edoToFreq(midi, 19); // Use 19EDO frequency calculation
    var now = pianoAudioCtx.currentTime;

    // 主音 - 正弦波
    var osc1 = pianoAudioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;

    var gainNode1 = pianoAudioCtx.createGain();
    gainNode1.gain.setValueAtTime(0, now);
    gainNode1.gain.linearRampToValueAtTime(0.3, now + 0.005);
    gainNode1.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gainNode1.gain.linearRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gainNode1);
    gainNode1.connect(pianoAudioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    // 泛音 - 让音色更亮
    var osc2 = pianoAudioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2; // 高八度泛音

    var gainNode2 = pianoAudioCtx.createGain();
    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.15, now + 0.005);
    gainNode2.gain.linearRampToValueAtTime(0.08, now + 0.2);
    gainNode2.gain.linearRampToValueAtTime(0.001, now + 0.6);

    osc2.connect(gainNode2);
    gainNode2.connect(pianoAudioCtx.destination);
    osc2.start(now);
    osc2.stop(now + 0.6);
  }
  
  // 高亮钢琴按键（供外部调用）
  window.highlightPianoKey = function(midi, duration, generation) {
    if (!pianoContainer) {
      createPianoUI(currentEdo || 12);
    }
    
    var keyEl = pianoKeyElements[midi];
    if (keyEl) {
      // 检查世代是否匹配，如果代不符合则不添加高亮
      if (generation !== undefined && generation !== pianoHighlightGeneration) {
        return;
      }
      // 清除之前可能存在的 timeout
      if (keyEl._highlightTimeout) {
        clearTimeout(keyEl._highlightTimeout);
      }
      // 清除可能存在的其他高亮
      keyEl.classList.remove('playing');
      // 强制重绘以确保状态更新
      void keyEl.offsetWidth;
      // 添加高亮
      keyEl.classList.add('playing');
      // 记录当前世代
      var myGeneration = pianoHighlightGeneration;
      // 提前100ms取消高亮，这样同一个键很快被按下也能看清楚
      var highlightDuration = Math.max(50, (duration * 1000) - 100);
      // 设置新的 timeout
      keyEl._highlightTimeout = setTimeout(function() {
        // 只有当前世代匹配时才取消高亮
        if (pianoHighlightGeneration === myGeneration) {
          keyEl.classList.remove('playing');
          keyEl._highlightTimeout = null;
        }
      }, highlightDuration);
    }
  };
  
  // 清除所有钢琴按键高亮
  window.clearAllPianoHighlights = function() {
    // 递增世代计数器，使所有 pending 的高亮回调失效
    pianoHighlightGeneration++;
    for (var midi in pianoKeyElements) {
      var keyEl = pianoKeyElements[midi];
      if (keyEl) {
        // 清除 pending 的 timeout
        if (keyEl._highlightTimeout) {
          clearTimeout(keyEl._highlightTimeout);
          keyEl._highlightTimeout = null;
        }
        // 清除高亮状态
        keyEl.classList.remove('playing');
      }
    }
  };
  
  // 初始化钢琴界面 - 已移到 initPlayers 中统一处理
  // 钢琴会根据第一个音乐代码块的 EDO 设置自动创建

})();

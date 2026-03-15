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

  // Main parser function
  function parseMusic(code) {
    var lines = code.split('\n');
    var bpm = 120;
    var key = 'C';
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
        parseVoiceLine(voiceLine, newVoice, key);
        if (newVoice.length > 0) {
          currentPart.voices.push(newVoice);
        }
      } else {
        parseVoiceLine(line, currentVoiceArray, key);
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

    return { bpm: bpm, key: key, parts: parts };

    function parseVoiceLine(line, eventsArray, currentKey) {
      var tokens = tokenize(line);
      var pos = 0;
      while (pos < tokens.length) {
        var result = parseTokens(tokens, pos, {
          octaveOffset: 0,
          durationMultiplier: 1.0,
          sustainBlockId: null
        }, currentKey, eventsArray);
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

    function parseTokens(tokens, pos, context, currentKey, eventsArray) {
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
          }, currentKey, eventsArray);
          i = result.pos;
          continue;
        }
        
        if (token === '_{') {
          var result = parseTokens(tokens, i + 1, {
            octaveOffset: currentOctave - 1,
            durationMultiplier: currentDuration,
            sustainBlockId: currentSustainBlock
          }, currentKey, eventsArray);
          i = result.pos;
          continue;
        }
        
        if (token === '={') {
          var result = parseTokens(tokens, i + 1, {
            octaveOffset: currentOctave,
            durationMultiplier: currentDuration * 0.5,
            sustainBlockId: currentSustainBlock
          }, currentKey, eventsArray);
          i = result.pos;
          continue;
        }
        
        if (token === '@{') {
          var blockId = 'sustain_' + Math.random().toString(36).substr(2, 9);
          var result = parseTokens(tokens, i + 1, {
            octaveOffset: currentOctave,
            durationMultiplier: currentDuration,
            sustainBlockId: blockId
          }, currentKey, eventsArray);
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
            var noteInfo = parseNoteTokenWithContext(noteTokens[nt], currentOctave, currentKey);
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
        
        var noteInfo = parseNoteTokenWithContext(token, currentOctave, currentKey);
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

    function parseNoteTokenWithContext(token, octaveOffset, key) {
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
      
      // 使用新的调号计算函数
      var keyData = getKeySemitones(key);
      var keyBaseMidi = keyData.rootMidi;
      var cMajorOffset = keyData.semitones[noteChar] || 0;
      
      var totalOctaveOffset = octaveOffset + localOctaveOffset;
      
      var midi = keyBaseMidi + cMajorOffset;
      if (accidental === '#') midi += 1;
      else if (accidental === 'b') midi -= 1;
      midi += totalOctaveOffset * 12;
      
      // 从MIDI值计算八度 (MIDI 60 = C4)
      var resultOctave = Math.floor(midi / 12) - 1;
      var baseNoteName = NOTE_MAP[noteChar];
      var pitchStr = baseNoteName + accidental + resultOctave;
      
      return { pitch: pitchStr, midi: midi };
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
    var freq = midiToFreq(midi);
    if (!freq) return;

    var osc = this.audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    var gainNode = this.audioCtx.createGain();
    
    var attackTime = 0.02;
    var releaseTime = 0.1;
    var sustainLevel = 0.3;
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime);
    gainNode.gain.setValueAtTime(sustainLevel, startTime + durationSec - releaseTime);
    gainNode.gain.linearRampToValueAtTime(0, startTime + durationSec);

    osc.connect(gainNode);
    gainNode.connect(this.gainNode);

    osc.start(startTime);
    osc.stop(startTime + durationSec);

    this.scheduledEvents.push({ osc: osc, gainNode: gainNode });
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
})();

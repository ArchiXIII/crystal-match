(function () {
  'use strict';

  class CrystalMatchAudio {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.enabled = true;
      this.pausedBySystem = false;
      this.musicOn = false;
      this.musicNodes = [];
      this.musicVolume = 0.55;
      this.lastPlayed = {};
      this.sampleFiles = {
        fishka: 'sounds/fishka.wav',
        bomb: 'sounds/bomb.wav',
        luch: 'sounds/luch.wav',
        rainbow: 'sounds/rainbow.wav',
        stone: 'sounds/stone.wav',
        coins: 'sounds/coins.wav'
      };
      this.sampleAliases = {
        gemBreak: 'fishka',
        hammer: 'fishka',
        line: 'luch',
        bomb: 'bomb',
        rainbow: 'rainbow',
        stone: 'stone',
        coinCollect: 'coins'
      };
      this.sampleVolumes = {
        fishka: 0.72,
        bomb: 0.86,
        luch: 1.28,
        rainbow: 0.82,
        stone: 0.74,
        coins: 0.24
      };
      this.samples = {};
      this.sampleLoading = {};
      this.activeSamples = [];
      this.maxActiveSamples = 9;
      this.maxActivePerSample = 3;
    }

    ensure() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? 1 : 0;
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      this.preloadSamples();
      return this.ctx;
    }

    setEnabled(enabled) {
      this.enabled = !!enabled;
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(this.enabled ? 1 : 0.0001, now + (this.enabled ? 0.04 : 0.01));
      }
      if (!this.enabled) this.stopMusic();
      else this.startMusic();
    }

    toggle() {
      this.setEnabled(!this.enabled);
      return this.enabled;
    }

    play(name) {
      if (!this.enabled || this.pausedBySystem) return;
      const ctx = this.ensure();
      if (!ctx) return;
      const now = ctx.currentTime;
      const gaps = {
        gemBreak: 0.06,
        coinGain: 0.12,
        line: 0.12,
        bomb: 0.16,
        rainbow: 0.18,
        stone: 0.1,
        hammer: 0.08,
        coinCollect: 0.09
      };
      if (this.lastPlayed[name] && now - this.lastPlayed[name] < (gaps[name] || 0.02)) return;
      this.lastPlayed[name] = now;
      if (this.playSample(name, now)) return;
      const method = this['play' + name.charAt(0).toUpperCase() + name.slice(1)];
      if (method) method.call(this, now);
    }

    preloadSamples() {
      Object.keys(this.sampleFiles).forEach((name) => this.loadSample(name));
    }

    hasSample(name) {
      return !!this.samples[name];
    }

    loadSample(name) {
      if (this.samples[name] || this.sampleLoading[name] || !this.ctx) return;
      const url = this.sampleFiles[name];
      if (!url || !window.fetch) return;
      this.sampleLoading[name] = true;
      window.fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error('Sound not found: ' + url);
          return response.arrayBuffer();
        })
        .then((data) => this.ctx.decodeAudioData(data))
        .then((buffer) => {
          this.samples[name] = buffer;
        })
        .catch(() => {
          this.samples[name] = null;
        })
        .finally(() => {
          this.sampleLoading[name] = false;
        });
    }

    pruneActiveSamples() {
      this.activeSamples = this.activeSamples.filter((item) => item && !item.done);
    }

    playSample(eventName, time) {
      const sampleName = this.sampleAliases[eventName];
      if (!sampleName) return false;
      const buffer = this.samples[sampleName];
      if (!buffer) {
        this.loadSample(sampleName);
        return false;
      }

      this.pruneActiveSamples();
      const sameCount = this.activeSamples.filter((item) => item.name === sampleName).length;
      if (this.activeSamples.length >= this.maxActiveSamples || sameCount >= this.maxActivePerSample) return true;

      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buffer;
      gain.gain.setValueAtTime(Math.max(0.0001, this.sampleVolumes[sampleName] || 0.75), time);
      src.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      const item = { name: sampleName, done: false };
      src.onended = () => {
        item.done = true;
        src.disconnect();
        gain.disconnect();
      };
      this.activeSamples.push(item);
      src.start(time);
      return true;
    }

    gain(time, volume, duration) {
      const ctx = this.ctx;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      gain.connect(this.masterGain || ctx.destination);
      return gain;
    }

    osc(type, freq, time, duration, volume, endFreq) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);
      osc.connect(this.gain(time, volume, duration));
      osc.start(time);
      osc.stop(time + duration + 0.02);
    }

    noise(time, duration, volume, filterFreq) {
      const ctx = this.ctx;
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq || 1800;
      filter.Q.value = 1.8;
      src.buffer = buffer;
      src.connect(filter);
      filter.connect(this.gain(time, volume, duration));
      src.start(time);
      src.stop(time + duration + 0.02);
    }

    arpeggio(time, notes, step, type, volume, duration) {
      notes.forEach((freq, index) => {
        this.osc(type || 'sine', freq, time + index * step, duration || 0.18, volume || 0.05);
      });
    }

    musicTone(type, freq, time, duration, volume, attack, release, filterFreq, detune) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const safeVolume = Math.max(0.0001, (volume || 0.01) * this.musicVolume);
      const attackTime = Math.max(0.01, attack || 0.08);
      const releaseTime = Math.max(0.04, release || 0.4);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime(detune || 0, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq || 2400, time);
      filter.Q.setValueAtTime(0.8, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(safeVolume, time + attackTime);
      gain.gain.setValueAtTime(safeVolume, Math.max(time + attackTime, time + duration - releaseTime));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(time);
      osc.stop(time + duration + 0.05);
    }

    musicPad(time, notes, duration) {
      notes.forEach((freq) => {
        this.musicTone('sine', freq, time, duration, 0.007, 1.4, 1.8, 920, -5);
        this.musicTone('triangle', freq * 2, time + 0.04, duration - 0.08, 0.0035, 1.2, 1.6, 1400, 7);
      });
    }

    musicBass(time, freq) {
      this.musicTone('sine', freq, time, 3.1, 0.007, 0.55, 1.45, 280, 0);
      this.musicTone('triangle', freq * 2, time + 0.03, 2.4, 0.0015, 0.5, 1.15, 420, -8);
    }

    playButton(time) {
      this.osc('triangle', 740, time, 0.08, 0.045, 1040);
      this.osc('sine', 1480, time + 0.02, 0.07, 0.025);
    }

    playSwapError(time) {
      this.osc('triangle', 210, time, 0.18, 0.06, 120);
      this.noise(time + 0.02, 0.12, 0.025, 420);
    }

    playGemBreak(time) {
      this.arpeggio(time, [880, 1174, 1568], 0.018, 'sine', 0.035, 0.16);
      this.noise(time, 0.12, 0.025, 2200);
    }

    playBomb(time) {
      this.osc('sine', 92, time, 0.34, 0.08, 48);
      this.noise(time, 0.28, 0.06, 260);
      this.arpeggio(time + 0.08, [520, 780, 1040], 0.035, 'triangle', 0.035, 0.22);
    }

    playRainbow(time) {
      this.arpeggio(time, [523, 659, 784, 988, 1318, 1568], 0.035, 'sine', 0.045, 0.28);
      this.noise(time + 0.04, 0.4, 0.025, 4200);
    }

    playLine(time) {
      this.osc('sawtooth', 420, time, 0.22, 0.035, 1440);
      this.noise(time, 0.18, 0.02, 3200);
    }

    playHammer(time) {
      this.osc('triangle', 180, time, 0.11, 0.07, 95);
      this.osc('sine', 980, time + 0.015, 0.08, 0.025);
    }

    playStone(time) {
      this.noise(time, 0.18, 0.055, 520);
      this.osc('triangle', 130, time + 0.01, 0.16, 0.045, 80);
    }

    playCoinGain(time) {
      this.arpeggio(time, [988, 1318, 1760], 0.04, 'triangle', 0.026, 0.18);
    }

    playGoalComplete(time) {
      this.arpeggio(time, [523, 659, 784, 1046], 0.055, 'sine', 0.055, 0.35);
      this.noise(time + 0.08, 0.32, 0.018, 3600);
    }

    playRoundEnd(time) {
      this.arpeggio(time, [392, 523, 659, 784], 0.075, 'triangle', 0.05, 0.42);
    }

    startMusic() {
      if (!this.enabled || this.pausedBySystem || this.musicOn) return;
      const ctx = this.ensure();
      if (!ctx) return;
      this.musicOn = true;
      this.musicLoopIndex = this.musicLoopIndex || 0;
      const schedule = () => {
        if (!this.musicOn || !this.enabled || !this.ctx) return;
        const start = this.ctx.currentTime + 0.05;
        const chords = [
          { bass: 110.00, notes: [220.00, 261.63, 329.63] },
          { bass: 87.31, notes: [174.61, 220.00, 261.63] },
          { bass: 98.00, notes: [196.00, 246.94, 293.66] },
          { bass: 130.81, notes: [261.63, 329.63, 392.00] },
          { bass: 116.54, notes: [233.08, 293.66, 349.23] },
          { bass: 87.31, notes: [174.61, 220.00, 329.63] },
          { bass: 98.00, notes: [196.00, 246.94, 392.00] },
          { bass: 110.00, notes: [220.00, 261.63, 329.63] }
        ];
        chords.forEach((chord, index) => {
          const t = start + index * 4;
          this.musicPad(t, chord.notes, 5.2);
          this.musicBass(t + 0.15, chord.bass);
          this.musicBass(t + 2.15, chord.bass * 1.5);
        });
        this.musicLoopIndex += 1;
        this.musicTimer = window.setTimeout(schedule, 32000);
      };
      schedule();
    }

    stopMusic() {
      this.musicOn = false;
      window.clearTimeout(this.musicTimer);
    }

    pauseForSystem() {
      this.pausedBySystem = true;
      this.stopMusic();
      if (this.ctx && this.ctx.state !== 'closed') {
        this.ctx.suspend().catch(() => {});
      }
    }

    resumeFromSystem() {
      this.pausedBySystem = false;
      if (!this.enabled) return;
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.startMusic();
    }
  }

  window.CrystalMatchAudio = CrystalMatchAudio;
})();

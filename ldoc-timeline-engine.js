/**
 * LDOC Document Animation Timeline & Sequencer
 * Lightweight document-oriented keyframe sequencer with parametric easing,
 * multi-track evaluation, and 60fps CSS transform interpolator.
 */
(function (global) {
  'use strict';

  const EASINGS = {
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => t * (2 - t),
    easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    spring: t => 1 - Math.cos(t * Math.PI * 4.5) * Math.exp(-t * 6)
  };

  const LDocTimelineEngine = {
    EASINGS,

    createTimeline: function (durationMs = 3000, options = {}) {
      return {
        id: 'timeline_' + Math.random().toString(36).slice(2, 8),
        duration: durationMs,
        loop: options.loop !== undefined ? !!options.loop : true,
        autoplay: options.autoplay !== undefined ? !!options.autoplay : true,
        tracks: []
      };
    },

    addTrack: function (timeline, targetBlockId, property = 'opacity') {
      const track = {
        id: 'track_' + Math.random().toString(36).slice(2, 6),
        targetId: targetBlockId,
        property: property, // 'opacity' | 'x' | 'y' | 'scale' | 'rotation' | 'blur'
        keyframes: [
          { time: 0, value: property === 'opacity' || property === 'scale' ? 0 : 0, easing: 'easeInOut' },
          { time: timeline.duration, value: property === 'opacity' || property === 'scale' ? 1 : 100, easing: 'easeInOut' }
        ]
      };
      timeline.tracks.push(track);
      return track;
    },

    addKeyframe: function (track, timeMs, value, easing = 'easeInOut') {
      const kf = { time: timeMs, value: value, easing: easing };
      track.keyframes.push(kf);
      track.keyframes.sort((a, b) => a.time - b.time);
      return kf;
    },

    /**
     * Interpolates property value at specific elapsed time (ms).
     */
    evaluateTrack: function (track, elapsedMs) {
      if (!track || !Array.isArray(track.keyframes) || track.keyframes.length === 0) {
        return null;
      }
      const kfs = track.keyframes;
      if (kfs.length === 1) return kfs[0].value;

      if (elapsedMs <= kfs[0].time) return kfs[0].value;
      if (elapsedMs >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

      // Find adjacent keyframe segment
      let i = 0;
      while (i < kfs.length - 1 && kfs[i + 1].time < elapsedMs) {
        i++;
      }
      const k1 = kfs[i];
      const k2 = kfs[i + 1];

      const segmentDuration = k2.time - k1.time;
      if (segmentDuration <= 0) return k1.value;

      const progress = (elapsedMs - k1.time) / segmentDuration;
      const easeFn = EASINGS[k2.easing] || EASINGS.linear;
      const easedProgress = easeFn(Math.min(1, Math.max(0, progress)));

      return k1.value + (k2.value - k1.value) * easedProgress;
    },

    /**
     * Evaluates all tracks at given time and generates CSS style overrides.
     */
    evaluateTimelineToStyles: function (timeline, elapsedMs) {
      const stylesByTarget = {};
      if (!timeline || !Array.isArray(timeline.tracks)) return stylesByTarget;

      const duration = timeline.duration || 3000;
      const effectiveTime = timeline.loop ? (elapsedMs % duration) : Math.min(elapsedMs, duration);

      timeline.tracks.forEach(track => {
        const val = this.evaluateTrack(track, effectiveTime);
        if (val === null || val === undefined) return;

        if (!stylesByTarget[track.targetId]) {
          stylesByTarget[track.targetId] = { transforms: {}, styles: {} };
        }

        const target = stylesByTarget[track.targetId];
        switch (track.property) {
          case 'opacity': target.styles.opacity = val; break;
          case 'blur': target.styles.filter = `blur(${val}px)`; break;
          case 'x': target.transforms.translateX = `${val}px`; break;
          case 'y': target.transforms.translateY = `${val}px`; break;
          case 'scale': target.transforms.scale = val; break;
          case 'rotation': target.transforms.rotate = `${val}deg`; break;
        }
      });

      return stylesByTarget;
    }
  };

  global.LDocTimelineEngine = LDocTimelineEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LDocTimelineEngine;
    module.exports.LDocTimelineEngine = LDocTimelineEngine;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

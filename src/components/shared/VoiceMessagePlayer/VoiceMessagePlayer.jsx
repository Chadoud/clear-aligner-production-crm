import { useCallback, useEffect, useRef, useState } from "react";
import "./VoiceMessagePlayer.css";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Playable voice note for Discussion (mobile voice.webm / voice.m4a parity).
 */
export default function VoiceMessagePlayer({ src, label = "Voice message" }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setDuration(0);
    setCurrent(0);
    setReady(false);
    setError(false);
  }, [src]);

  const onLoadedMetadata = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (Number.isFinite(el.duration) && el.duration > 0) {
      setDuration(el.duration);
      setReady(true);
      setError(false);
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    setCurrent(el.currentTime);
  }, []);

  const onEnded = useCallback(() => {
    setPlaying(false);
    setCurrent(0);
    const el = audioRef.current;
    if (el) el.currentTime = 0;
  }, []);

  const onAudioError = useCallback(() => {
    setError(true);
    setPlaying(false);
    setReady(false);
  }, []);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || error) return;
    if (el.paused) {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setError(true));
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [error]);

  const onSeek = useCallback(
    (e) => {
      const el = audioRef.current;
      if (!el || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (e.clientX - rect.left) / rect.width)
      );
      el.currentTime = ratio * duration;
      setCurrent(el.currentTime);
    },
    [duration]
  );

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;
  const showElapsed = playing || current > 0;

  return (
    <div
      className={`voice-message-player${error ? " voice-message-player--error" : ""}${playing ? " voice-message-player--playing" : ""}`}
      role="group"
      aria-label={label}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={onAudioError}
      />
      <button
        type="button"
        className="voice-message-player__play"
        onClick={togglePlay}
        disabled={error}
        aria-label={playing ? "Pause" : "Play"}
      >
        <i
          className={`fas ${playing ? "fa-pause" : "fa-play"}${!playing ? " voice-message-player__play-icon--offset" : ""}`}
          aria-hidden
        />
      </button>
      <div className="voice-message-player__body">
        <button
          type="button"
          className="voice-message-player__track"
          onClick={onSeek}
          disabled={!ready || error}
          aria-label="Seek"
        >
          <span className="voice-message-player__track-bg" />
          <span
            className="voice-message-player__track-fill"
            style={{ width: `${progress * 100}%` }}
          />
          <span
            className="voice-message-player__thumb"
            style={{ left: `${progress * 100}%` }}
          />
        </button>
        <div className="voice-message-player__meta">
          <span className="voice-message-player__wave" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </span>
          <div className="voice-message-player__times">
            {showElapsed ? (
              <>
                <span className="voice-message-player__time-current">
                  {formatTime(current)}
                </span>
                <span className="voice-message-player__time-sep">/</span>
                <span className="voice-message-player__time-total">
                  {formatTime(duration)}
                </span>
              </>
            ) : (
              <span className="voice-message-player__time-total">
                {formatTime(duration)}
              </span>
            )}
          </div>
        </div>
      </div>
      {error ? (
        <span
          className="voice-message-player__error"
          title="Could not load audio"
        >
          <i className="fas fa-exclamation-circle" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

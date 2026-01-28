import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
import { Audio } from "expo-av";
import {
  fetchSurahAudio,
  findCurrentVerseTiming,
  getVerseTimingByNumber,
  VerseTiming,
  ReciterId,
  RECITERS,
} from "../services/quranAudioService";

// Unified playback state enum - single source of truth for all UI components
export type PlaybackState = "idle" | "loading" | "playing" | "paused";

interface QuranAudioContextType {
  // State
  audioUrl: string | null;
  verseTimings: VerseTiming[];
  currentChapterId: number | null;
  currentVerseKey: string | null;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  selectedReciterId: ReciterId;
  pendingVerseNumber: number | null;

  // Derived helpers for convenience
  isPlaying: boolean;
  isLoading: boolean;

  // Actions
  loadSurahAudio: (surahId: number, reciterId?: ReciterId) => Promise<void>;
  playVerse: (surahId: number, verseNumber: number) => Promise<void>;
  playSurah: (surahId: number, fromVerse?: number) => Promise<void>;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  stop: () => void;
  seekTo: (timeInSeconds: number) => void;
  setReciter: (reciterId: ReciterId) => void;
}

const QuranAudioContext = createContext<QuranAudioContextType | undefined>(
  undefined
);

export function QuranAudioProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  // Ref for single-verse end time (in milliseconds)
  const singleVerseEndTimeRef = useRef<number | null>(null);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);

  // State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [verseTimings, setVerseTimings] = useState<VerseTiming[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<number | null>(null);
  const [currentVerseKey, setCurrentVerseKey] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedReciterId, setSelectedReciterId] = useState<ReciterId>(
    RECITERS.MISHARY_ALAFASY
  );
  const [isSingleVerseMode, setIsSingleVerseMode] = useState(false);
  const [pendingVerseNumber, setPendingVerseNumber] = useState<number | null>(
    null
  );

  // Derived state for convenience
  const isPlaying = playbackState === "playing";
  const isLoading = playbackState === "loading";

  const ensureSound = useCallback(async () => {
    if (soundRef.current) return soundRef.current;

    const sound = new Audio.Sound();
    soundRef.current = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;

      setCurrentTime(status.positionMillis / 1000);
      setDuration((status.durationMillis || 0) / 1000);

      if (status.isPlaying) {
        setPlaybackState("playing");
      } else if (status.positionMillis > 0 && !status.didJustFinish) {
        setPlaybackState("paused");
      }

      if (
        singleVerseEndTimeRef.current !== null &&
        status.positionMillis >= singleVerseEndTimeRef.current
      ) {
        sound.pauseAsync();
        setPlaybackState("paused");
        setIsSingleVerseMode(false);
        singleVerseEndTimeRef.current = null;
      }

      if (status.isPlaying && verseTimings.length > 0) {
        const timing = findCurrentVerseTiming(status.positionMillis, verseTimings);
        if (timing && timing.verse_key !== currentVerseKey) {
          setCurrentVerseKey(timing.verse_key);
        }
      }
    });

    return sound;
  }, [currentVerseKey, verseTimings]);

  // Clear single-verse end boundary
  const clearVerseEndBoundary = useCallback(() => {
    singleVerseEndTimeRef.current = null;
  }, []);

  // Load surah audio and timings
  const loadSurahAudio = useCallback(
    async (surahId: number, reciterId?: ReciterId) => {
      const reciter = reciterId || selectedReciterId;

      // If already loaded for this surah and reciter, skip
      if (currentChapterId === surahId && audioUrl) {
        return;
      }

      if (loadingPromiseRef.current) {
        await loadingPromiseRef.current;
        return;
      }

      setPlaybackState("loading");
      clearVerseEndBoundary();

      const performLoad = async () => {
        const data = await fetchSurahAudio(surahId, reciter);

        setAudioUrl(data.audioUrl);
        setVerseTimings(data.verseTimings);
        setCurrentChapterId(surahId);
        setDuration(data.duration);

        const sound = await ensureSound();
        const status = await sound.getStatusAsync();
        if (status.isLoaded || status.isLoading) {
          await sound.unloadAsync();
        }
        await sound.loadAsync({ uri: data.audioUrl });

        if (pendingActionRef.current) {
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          setTimeout(action, 100);
        } else {
          setPlaybackState("idle");
        }
      };

      try {
        loadingPromiseRef.current = performLoad();
        await loadingPromiseRef.current;
      } catch (error) {
        console.error("Failed to load surah audio:", error);
        setPendingVerseNumber(null);
        setPlaybackState("idle");
      } finally {
        loadingPromiseRef.current = null;
      }
    },
    [selectedReciterId, currentChapterId, audioUrl, clearVerseEndBoundary, ensureSound]
  );

  // Play a specific verse
  const playVerse = useCallback(
    async (surahId: number, verseNumber: number) => {
      const sound = await ensureSound();

      setPendingVerseNumber(verseNumber);

      if (currentChapterId !== surahId || !audioUrl) {
        pendingActionRef.current = () => playVerse(surahId, verseNumber);
        await loadSurahAudio(surahId);
        return;
      }

      const timing = getVerseTimingByNumber(surahId, verseNumber, verseTimings);
      if (!timing) {
        setPendingVerseNumber(null);
        console.warn(`Could not find timing for verse ${verseNumber}`);
        return;
      }

      clearVerseEndBoundary();

      await sound.setPositionAsync(timing.timestamp_from);
      setCurrentVerseKey(timing.verse_key);
      setIsSingleVerseMode(true);
      singleVerseEndTimeRef.current = timing.timestamp_to;

      try {
        await sound.playAsync();
        setPlaybackState("playing");
      } catch (error) {
        console.error("Playback failed:", error);
        setPlaybackState("idle");
        singleVerseEndTimeRef.current = null;
      } finally {
        setPendingVerseNumber(null);
      }
    },
    [
      currentChapterId,
      audioUrl,
      verseTimings,
      loadSurahAudio,
      clearVerseEndBoundary,
    ]
  );

  // Play entire surah
  const playSurah = useCallback(
    async (surahId: number, fromVerse?: number) => {
      const sound = await ensureSound();

      if (currentChapterId !== surahId || !audioUrl) {
        pendingActionRef.current = () => playSurah(surahId, fromVerse);
        await loadSurahAudio(surahId);
        return;
      }

      clearVerseEndBoundary();
      setIsSingleVerseMode(false);

      if (fromVerse) {
        const timing = getVerseTimingByNumber(surahId, fromVerse, verseTimings);
        if (timing) {
          await sound.setPositionAsync(timing.timestamp_from);
          setCurrentVerseKey(timing.verse_key);
        }
      }

      try {
        await sound.playAsync();
        setPlaybackState("playing");
      } catch (error) {
        console.error("Playback failed:", error);
        setPlaybackState("idle");
      }
    },
    [currentChapterId, audioUrl, verseTimings, loadSurahAudio, clearVerseEndBoundary]
  );

  // Pause playback
  const pause = useCallback(() => {
    const sound = soundRef.current;
    if (sound) {
      sound.pauseAsync();
      setPlaybackState("paused");
      clearVerseEndBoundary();
    }
  }, [clearVerseEndBoundary]);

  // Resume playback
  const resume = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound || !audioUrl) return;

    setIsSingleVerseMode(false);
    clearVerseEndBoundary();

    try {
      await sound.playAsync();
      setPlaybackState("playing");
    } catch (error) {
      console.error("Resume failed:", error);
    }
  }, [audioUrl, clearVerseEndBoundary]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  // Stop playback and reset
  const stop = useCallback(() => {
    const sound = soundRef.current;
    if (sound) {
      sound.pauseAsync();
      sound.setPositionAsync(0);
    }
    setPlaybackState("idle");
    setCurrentVerseKey(null);
    setIsSingleVerseMode(false);
    clearVerseEndBoundary();
  }, [clearVerseEndBoundary]);

  // Seek to a specific time
  const seekTo = useCallback(
    (timeInSeconds: number) => {
      const sound = soundRef.current;
      if (!sound) return;
      sound.setPositionAsync(timeInSeconds * 1000);
      setCurrentTime(timeInSeconds);
      const timing = findCurrentVerseTiming(timeInSeconds * 1000, verseTimings);
      if (timing) {
        setCurrentVerseKey(timing.verse_key);
      }
    },
    [verseTimings]
  );

  // Set reciter
  const setReciter = useCallback(
    (reciterId: ReciterId) => {
      if (reciterId !== selectedReciterId) {
        setSelectedReciterId(reciterId);
        setAudioUrl(null);
        setCurrentChapterId(null);
        setVerseTimings([]);
      }
    },
    [selectedReciterId]
  );

  const value: QuranAudioContextType = {
    audioUrl,
    verseTimings,
    currentChapterId,
    currentVerseKey,
    playbackState,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    selectedReciterId,
    pendingVerseNumber,
    loadSurahAudio,
    playVerse,
    playSurah,
    pause,
    resume,
    togglePlayPause,
    stop,
    seekTo,
    setReciter,
  };

  return (
    <QuranAudioContext.Provider value={value}>
      {children}
    </QuranAudioContext.Provider>
  );
}

export function useQuranAudio() {
  const context = useContext(QuranAudioContext);
  if (context === undefined) {
    throw new Error("useQuranAudio must be used within a QuranAudioProvider");
  }
  return context;
}

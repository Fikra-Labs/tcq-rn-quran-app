// Quran Audio Service - Fetches audio files and verse timings via Edge Function proxy

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export interface VerseTiming {
  verse_key: string;
  timestamp_from: number; // milliseconds
  timestamp_to: number; // milliseconds
  segments: number[][]; // word-level timings [word_index, start_ms, end_ms]
}

export interface SurahAudioData {
  audioUrl: string;
  verseTimings: VerseTiming[];
  duration: number;
  chapterId: number;
}

interface ApiAudioFile {
  id: number;
  chapter_id: number;
  file_size: number;
  format: string;
  audio_url: string;
  verse_timings: VerseTiming[];
  duration?: number;
}

interface ApiResponse {
  audio_file?: ApiAudioFile;
  audio_files?: ApiAudioFile[];
}

// Popular reciter IDs from Quran CDN
export const RECITERS = {
  MISHARY_ALAFASY: 7,
  ABDUL_BASIT: 1,
  SUDAIS: 2,
  MINSHAWI: 5,
  HUSARY: 4,
} as const;

export type ReciterId = (typeof RECITERS)[keyof typeof RECITERS];

/**
 * Fetches surah audio URL and verse timings via Edge Function proxy
 * @param surahId - Surah number (1-114)
 * @param reciterId - Reciter ID (default: Mishary Rashid Alafasy)
 * @returns SurahAudioData with audio URL and verse timings
 */
export async function fetchSurahAudio(
  surahId: number,
  reciterId: ReciterId = RECITERS.MISHARY_ALAFASY
): Promise<SurahAudioData> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  if (surahId < 1 || surahId > 114) {
    throw new Error(`Invalid surah ID: ${surahId}. Must be between 1 and 114.`);
  }

  const url = `${SUPABASE_URL}/functions/v1/quran-audio-proxy?reciterId=${reciterId}&chapter=${surahId}`;

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch audio data: ${response.status} ${response.statusText}`
    );
  }

  const data: ApiResponse = await response.json();

  // API returns audio_files array, not audio_file
  const audioFile = data.audio_files?.[0] || data.audio_file;

  if (!audioFile) {
    throw new Error(`No audio file found for surah ${surahId}`);
  }

  const { audio_url, verse_timings, chapter_id, duration } = audioFile;

  return {
    audioUrl: audio_url,
    verseTimings: verse_timings || [],
    duration: duration || 0,
    chapterId: chapter_id,
  };
}

/**
 * Finds the verse timing that contains the given playback time
 * @param currentTimeMs - Current playback time in milliseconds
 * @param verseTimings - Array of verse timings
 * @returns The matching verse timing or null
 */
export function findCurrentVerseTiming(
  currentTimeMs: number,
  verseTimings: VerseTiming[]
): VerseTiming | null {
  for (const timing of verseTimings) {
    if (currentTimeMs >= timing.timestamp_from && currentTimeMs < timing.timestamp_to) {
      return timing;
    }
  }
  return null;
}

/**
 * Gets verse timing by verse number
 * @param surahId - Surah number
 * @param verseNumber - Verse number within the surah
 * @param verseTimings - Array of verse timings
 * @returns The matching verse timing or null
 */
export function getVerseTimingByNumber(
  surahId: number,
  verseNumber: number,
  verseTimings: VerseTiming[]
): VerseTiming | null {
  const verseKey = `${surahId}:${verseNumber}`;
  return verseTimings.find((t) => t.verse_key === verseKey) || null;
}

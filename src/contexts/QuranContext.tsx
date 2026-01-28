import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  executeQuranQuery,
  getSurah as fetchSurahVerses,
  fetchThemesBySurah,
  fetchVersesForThemes,
  fetchFootnotesByIds,
  getVerseText,
  getThemeName,
  getFootnoteText,
  ApiSurah,
  ApiVerse,
  ApiTheme,
  ApiThemeVerse,
} from "../services/quranApi";

const QURAN_LANG = process.env.EXPO_PUBLIC_QURAN_LANG || "english";

// Normalized Surah type for components (matching existing interface)
export interface Surah {
  number: number;
  name: string;
  transliteration: string;
  translation: string;
  type: "Meccan" | "Medinan";
  verses: number;
  description: string;
  nameArabic: string;
  introduction: string | null;
}

// Normalized Verse type for components
export interface Verse {
  surahNumber: number;
  verseNumber: number;
  arabic: string;
  translation: string;
  transliteration?: string;
  page: number;
}

// Arabic script type
export type ArabicScript = "uthmani" | "indopak";

// Normalized ThematicPassage type for components
export interface ThematicPassage {
  id: string;
  surahNumber: number;
  themeName: string;
  verseRange: {
    start: number;
    end: number;
  };
  arabicText: string;
  translation: string;
  verseTranslations?: {
    verseNumber: number;
    text: string;
    arabic: string;
    arabicIndopak: string;
  }[];
  footnotes?: {
    id: string;
    verseNumber: number;
    marker: string;
    text: string;
  }[];
  page: number;
}

interface QuranContextType {
  surahs: Surah[];
  isLoading: boolean;
  error: string | null;
  getSurahByNumber: (number: number) => Surah | undefined;
  getPopularSurahs: () => Surah[];
  // New verse/theme fetching methods
  fetchSurahWithVerses: (surahId: number) => Promise<Verse[]>;
  fetchThematicPassages: (surahId: number) => Promise<ThematicPassage[]>;
  // Cached data
  currentSurahVerses: Verse[];
  currentThematicPassages: ThematicPassage[];
  versesLoading: boolean;
  passagesLoading: boolean;
}

const QuranContext = createContext<QuranContextType | undefined>(undefined);

// Transform API surah to normalized format
const transformSurah = (apiSurah: ApiSurah): Surah => {
  return {
    number: apiSurah.id,
    name: apiSurah.name_arabic,
    transliteration: apiSurah.name_transliteration,
    translation:
      QURAN_LANG === "spanish"
        ? apiSurah.name_spanish
        : apiSurah.name_english,
    type: apiSurah.revelation_type === "Meccan" ? "Meccan" : "Medinan",
    verses: apiSurah.number_of_verses,
    description:
      (QURAN_LANG === "spanish"
        ? apiSurah.introduction_spanish
        : apiSurah.introduction_english) || "",
    nameArabic: apiSurah.name_arabic,
    introduction:
      QURAN_LANG === "spanish"
        ? apiSurah.introduction_spanish
        : apiSurah.introduction_english,
  };
};

// Transform API verse to normalized format
const transformVerse = (apiVerse: ApiVerse): Verse => {
  return {
    surahNumber: apiVerse.chapter_number,
    verseNumber: apiVerse.verse_number,
    arabic: apiVerse.text_uthmani,
    translation: getVerseText(apiVerse),
    page: apiVerse.page_number,
  };
};

// Parse footnote IDs from text
const parseFootnoteIds = (
  text: string,
  verseNumber: number
): { id: number; number: string; verseNumber: number }[] => {
  const footnoteRegex = /<footnote\\s+id=\\"(\\d+)\\"\\s+number=\\"(\\d+)\\">/g;
  const footnotes: { id: number; number: string; verseNumber: number }[] = [];
  let match;
  while ((match = footnoteRegex.exec(text)) !== null) {
    footnotes.push({
      id: parseInt(match[1], 10),
      number: match[2],
      verseNumber,
    });
  }
  return footnotes;
};

// Transform API themes + verses to ThematicPassage format with footnotes
const transformToThematicPassages = async (
  themes: ApiTheme[],
  themeVerses: ApiThemeVerse[]
): Promise<ThematicPassage[]> => {
  // Collect all footnote IDs from all verses
  const allFootnoteIds: {
    id: number;
    number: string;
    verseNumber: number;
    themeId: number;
  }[] = [];

  const passagesData = themes.map((theme) => {
    const verses = themeVerses.filter((v) => v.theme_id === theme.id);
    const arabicText = verses.map((v) => v.text_uthmani).join(" ۝ ");

    const verseTranslations = verses.map((v) => {
      const text = QURAN_LANG === "spanish" ? v.text_spanish : v.text_english;
      const footnoteIds = parseFootnoteIds(text, v.verse_number);
      footnoteIds.forEach((fn) => allFootnoteIds.push({ ...fn, themeId: theme.id }));
      return {
        verseNumber: v.verse_number,
        text,
        arabic: v.text_uthmani,
        arabicIndopak: v.text_indopak || v.text_uthmani,
      };
    });

    const translation = verseTranslations.map((v) => v.text).join(" ");
    const page = verses[0]?.page_number || 1;

    return { theme, arabicText, translation, verseTranslations, page };
  });

  // Fetch all footnotes in one batch
  const uniqueIds = [...new Set(allFootnoteIds.map((f) => f.id))];
  const footnoteTexts = new Map<number, string>();

  if (uniqueIds.length > 0) {
    const result = await fetchFootnotesByIds(uniqueIds);
    if (result.success && result.data) {
      result.data.forEach((fn) => {
        // Handle id that could be string or number from API
        const fnId = typeof fn.id === "string" ? parseInt(fn.id, 10) : fn.id;
        footnoteTexts.set(fnId, getFootnoteText(fn));
      });
    }
  }

  // Build passages with populated footnotes
  return passagesData.map((p) => {
    const themeFootnotes = allFootnoteIds
      .filter((fn) => fn.themeId === p.theme.id)
      .map((fn) => ({
        id: String(fn.id),
        verseNumber: fn.verseNumber,
        marker: fn.number,
        text: footnoteTexts.get(fn.id) || "",
      }));

    return {
      id: `${p.theme.chapter_number}-${p.theme.start_verse}-${p.theme.end_verse}`,
      surahNumber: p.theme.chapter_number,
      themeName: getThemeName(p.theme),
      verseRange: { start: p.theme.start_verse, end: p.theme.end_verse },
      arabicText: p.arabicText,
      translation: p.translation,
      verseTranslations: p.verseTranslations,
      footnotes: themeFootnotes,
      page: p.page,
    };
  });
};

const POPULAR_SURAH_NUMBERS = [1, 2, 3, 4, 18, 36, 55, 67, 112];

export const QuranProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cached current surah data
  const [currentSurahVerses, setCurrentSurahVerses] = useState<Verse[]>([]);
  const [currentThematicPassages, setCurrentThematicPassages] = useState<
    ThematicPassage[]
  >([]);
  const [versesLoading, setVersesLoading] = useState(false);
  const [passagesLoading, setPassagesLoading] = useState(false);

  // Load all surahs on mount
  useEffect(() => {
    const loadSurahs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await executeQuranQuery<ApiSurah[]>(
          "SELECT * FROM Chapters ORDER BY id",
          []
        );

        if (result.success && result.data) {
          const transformedSurahs = result.data.map(transformSurah);
          setSurahs(transformedSurahs);
        } else {
          throw new Error(result.error || "Failed to load surahs");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load surahs";
        setError(errorMessage);
        console.error("Failed to load surahs:", err);
      }

      setIsLoading(false);
    };

    loadSurahs();
  }, []);

  const getSurahByNumber = (number: number): Surah | undefined => {
    return surahs.find((s) => s.number === number);
  };

  const getPopularSurahs = (): Surah[] => {
    return surahs.filter((s) => POPULAR_SURAH_NUMBERS.includes(s.number));
  };

  // Fetch verses for a specific surah
  const fetchSurahWithVerses = useCallback(
    async (surahId: number): Promise<Verse[]> => {
      setVersesLoading(true);

      try {
        const result = await fetchSurahVerses(surahId);

        if (result.success && result.data) {
          const transformedVerses = result.data.map(transformVerse);
          setCurrentSurahVerses(transformedVerses);
          return transformedVerses;
        }
        console.error("Failed to fetch verses:", result.error);
        return [];
      } catch (err) {
        console.error("Error fetching surah verses:", err);
        return [];
      } finally {
        setVersesLoading(false);
      }
    },
    []
  );

  // Fetch thematic passages for a specific surah
  const fetchThematicPassages = useCallback(
    async (surahId: number): Promise<ThematicPassage[]> => {
      setPassagesLoading(true);

      try {
        // First fetch themes for this surah
        const themesResult = await fetchThemesBySurah(surahId);

        if (
          !themesResult.success ||
          !themesResult.data ||
          themesResult.data.length === 0
        ) {
          setCurrentThematicPassages([]);
          return [];
        }

        const themes = themesResult.data;
        const themeIds = themes.map((t) => t.id);

        // Fetch verses for all themes
        const versesResult = await fetchVersesForThemes(themeIds);

        if (!versesResult.success || !versesResult.data) {
          console.error("Failed to fetch theme verses:", versesResult.error);
          setCurrentThematicPassages([]);
          return [];
        }

        // Transform with async footnote fetching
        const passages = await transformToThematicPassages(
          themes,
          versesResult.data
        );
        setCurrentThematicPassages(passages);
        return passages;
      } catch (err) {
        console.error("Error fetching thematic passages:", err);
        setCurrentThematicPassages([]);
        return [];
      } finally {
        setPassagesLoading(false);
      }
    },
    []
  );

  return (
    <QuranContext.Provider
      value={{
        surahs,
        isLoading,
        error,
        getSurahByNumber,
        getPopularSurahs,
        fetchSurahWithVerses,
        fetchThematicPassages,
        currentSurahVerses,
        currentThematicPassages,
        versesLoading,
        passagesLoading,
      }}
    >
      {children}
    </QuranContext.Provider>
  );
};

export const useQuran = (): QuranContextType => {
  const context = useContext(QuranContext);
  if (!context) {
    throw new Error("useQuran must be used within a QuranProvider");
  }
  return context;
};

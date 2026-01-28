const API_BASE_URL = process.env.EXPO_PUBLIC_QURAN_API_BASE_URL;
const QURAN_LANG = process.env.EXPO_PUBLIC_QURAN_LANG || "english";

interface QueryResult<T> {
  success: boolean;
  data: T | null;
  count: number;
  error?: string;
}

export const executeQuranQuery = async <T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> => {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: "Missing EXPO_PUBLIC_QURAN_API_BASE_URL",
      data: null,
      count: 0,
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/quran/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data as T, count: data.count };
    }

    return {
      success: false,
      error: data.message || "Query failed",
      data: null,
      count: 0,
    };
  } catch (error) {
    console.error("Quran API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
      data: null,
      count: 0,
    };
  }
};

// ============= Surah/Chapter Types =============

export interface ApiSurah {
  id: number;
  name_english: string;
  name_spanish: string;
  name_arabic: string;
  name_transliteration: string;
  number_of_verses: number;
  revelation_type: string;
  bismillah_prefix: boolean;
  introduction_english: string | null;
  introduction_spanish: string | null;
  pages: string | null;
}

// Get localized surah name based on QURAN_LANG
export const getSurahName = (surah: ApiSurah): string => {
  return QURAN_LANG === "spanish" ? surah.name_spanish : surah.name_english;
};

// Get localized introduction based on QURAN_LANG
export const getSurahIntroduction = (surah: ApiSurah): string | null => {
  return QURAN_LANG === "spanish"
    ? surah.introduction_spanish
    : surah.introduction_english;
};

// Fetch all surahs
export const fetchAllSurahs = async (): Promise<QueryResult<ApiSurah[]>> => {
  return executeQuranQuery<ApiSurah[]>(
    "SELECT * FROM Chapters ORDER BY id",
    []
  );
};

// ============= Verse Types =============

export interface ApiVerse {
  verse_key: string;
  chapter_number: number;
  verse_number: number;
  page_number: number;
  text_english: string;
  text_spanish: string;
  text_uthmani: string;
  text_indopak: string;
  text_uthmani_tajweed?: string;
  // Joined chapter fields (when using getSurah query)
  name_english?: string;
  name_spanish?: string;
  name_transliteration?: string;
  name_arabic?: string;
  number_of_verses?: number;
  revelation_type?: string;
  bismillah_prefix?: boolean;
  introduction_english?: string | null;
  introduction_spanish?: string | null;
  pages?: string | null;
}

// Get localized verse text
export const getVerseText = (verse: ApiVerse): string => {
  return QURAN_LANG === "spanish" ? verse.text_spanish : verse.text_english;
};

// Fetch a single surah with all its verses (and chapter metadata joined)
export const getSurah = async (
  surahId: number
): Promise<QueryResult<ApiVerse[]>> => {
  return executeQuranQuery<ApiVerse[]>(
    `SELECT v.*, 
            c.name_english, c.name_spanish, c.name_transliteration, c.name_arabic,
            c.number_of_verses, c.revelation_type, c.bismillah_prefix,
            c.introduction_english, c.introduction_spanish, c.pages
     FROM Verses v
     JOIN Chapters c ON v.chapter_number = c.id
     WHERE v.chapter_number = ?
     ORDER BY v.page_number, v.verse_number`,
    [surahId]
  );
};

// Fetch verses for a specific page
export const getVersesByPage = async (
  pageNumber: number
): Promise<QueryResult<ApiVerse[]>> => {
  return executeQuranQuery<ApiVerse[]>(
    `SELECT v.*, 
            c.name_english, c.name_spanish, c.name_transliteration, c.name_arabic
     FROM Verses v
     JOIN Chapters c ON v.chapter_number = c.id
     WHERE v.page_number = ?
     ORDER BY v.chapter_number, v.verse_number`,
    [pageNumber]
  );
};

// ============= Theme Types =============

export interface ApiThemeCategory {
  id: number;
  name: string;
  name_spanish: string;
  icon_name: string;
  theme_count: number;
}

export interface ApiTheme {
  id: number;
  theme_name_english: string;
  theme_name_spanish: string;
  chapter_number: number;
  start_verse: number;
  end_verse: number;
}

export interface ApiThemeVerse {
  verse_key: string;
  text_english: string;
  text_spanish: string;
  text_uthmani: string;
  text_indopak: string;
  text_uthmani_tajweed?: string;
  chapter_number: number;
  verse_number: number;
  page_number: number;
  theme_id: number;
}

// Get localized theme name
export const getThemeName = (theme: ApiTheme): string => {
  return QURAN_LANG === "spanish"
    ? theme.theme_name_spanish
    : theme.theme_name_english;
};

// Fetch all theme categories with counts
export const fetchThemeCategories = async (): Promise<
  QueryResult<ApiThemeCategory[]>
> => {
  return executeQuranQuery<ApiThemeCategory[]>(
    `SELECT c.id, c.name, c.name_spanish, c.icon_name,
            COUNT(cm.theme_id) AS theme_count
     FROM ThemeCategories c
     LEFT JOIN ThemeCategoryMap cm ON c.id = cm.category_id
     GROUP BY c.id
     ORDER BY c.id`,
    []
  );
};

// Fetch themes in a specific category
export const fetchThemesByCategory = async (
  categoryId: number
): Promise<QueryResult<ApiTheme[]>> => {
  return executeQuranQuery<ApiTheme[]>(
    `SELECT t.id, t.theme_name_english, t.theme_name_spanish,
            t.chapter_number, t.start_verse, t.end_verse
     FROM Themes t
     JOIN ThemeCategoryMap tcm ON t.id = tcm.theme_id
     WHERE tcm.category_id = ?
     ORDER BY t.chapter_number, t.start_verse`,
    [categoryId]
  );
};

// Fetch themes for a specific surah
export const fetchThemesBySurah = async (
  surahNumber: number
): Promise<QueryResult<ApiTheme[]>> => {
  return executeQuranQuery<ApiTheme[]>(
    `SELECT id, theme_name_english, theme_name_spanish,
            chapter_number, start_verse, end_verse
     FROM Themes
     WHERE chapter_number = ?
     ORDER BY start_verse`,
    [surahNumber]
  );
};

// Fetch verses for multiple themes
export const fetchVersesForThemes = async (
  themeIds: number[]
): Promise<QueryResult<ApiThemeVerse[]>> => {
  if (themeIds.length === 0) {
    return { success: true, data: [], count: 0 };
  }

  const placeholders = themeIds.map(() => "?").join(", ");

  return executeQuranQuery<ApiThemeVerse[]>(
    `SELECT v.verse_key, v.text_english, v.text_spanish, v.text_uthmani, v.text_indopak,
            v.chapter_number, v.verse_number, v.page_number, tv.theme_id
     FROM Verses v
     JOIN ThemeVerses tv ON v.verse_key = tv.verse_key
     WHERE tv.theme_id IN (${placeholders})
     ORDER BY tv.theme_id, v.chapter_number, v.verse_number`,
    themeIds
  );
};

// Count verses per theme
export const countVersesInTheme = async (
  themeId: number
): Promise<QueryResult<{ count: number }[]>> => {
  return executeQuranQuery<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM ThemeVerses WHERE theme_id = ?",
    [themeId]
  );
};

// ============= Footnote Types =============

export interface ApiFootnote {
  id: number;
  text_english: string;
  text_spanish: string;
  verse_key: string;
}

// Fetch a single footnote by ID
export const fetchFootnote = async (
  footnoteId: number
): Promise<QueryResult<ApiFootnote[]>> => {
  return executeQuranQuery<ApiFootnote[]>(
    "SELECT * FROM Footnotes WHERE id = ?",
    [footnoteId]
  );
};

// Fetch multiple footnotes by IDs
export const fetchFootnotesByIds = async (
  footnoteIds: number[]
): Promise<QueryResult<ApiFootnote[]>> => {
  if (footnoteIds.length === 0) {
    return { success: true, data: [], count: 0 };
  }

  const placeholders = footnoteIds.map(() => "?").join(", ");

  return executeQuranQuery<ApiFootnote[]>(
    `SELECT * FROM Footnotes WHERE id IN (${placeholders})`,
    footnoteIds
  );
};

// Get localized footnote text with fallback
export const getFootnoteText = (footnote: ApiFootnote): string => {
  if (QURAN_LANG === "spanish") {
    return footnote.text_spanish || footnote.text_english || "";
  }
  return footnote.text_english || footnote.text_spanish || "";
};

// ============= Pagination Helpers =============

export const fetchSurahsPaginated = async (
  pageSize: number,
  pageIndex: number
): Promise<QueryResult<ApiSurah[]>> => {
  return executeQuranQuery<ApiSurah[]>(
    "SELECT * FROM Chapters ORDER BY id LIMIT ? OFFSET ?",
    [pageSize, pageIndex * pageSize]
  );
};

export const fetchVersesPaginated = async (
  surahId: number,
  pageSize: number,
  pageIndex: number
): Promise<QueryResult<ApiVerse[]>> => {
  return executeQuranQuery<ApiVerse[]>(
    `SELECT v.*, 
            c.name_english, c.name_spanish, c.name_transliteration, c.name_arabic,
            c.number_of_verses, c.revelation_type, c.bismillah_prefix,
            c.introduction_english, c.introduction_spanish, c.pages
     FROM Verses v
     JOIN Chapters c ON v.chapter_number = c.id
     WHERE v.chapter_number = ?
     ORDER BY v.page_number, v.verse_number
     LIMIT ? OFFSET ?`,
    [surahId, pageSize, pageIndex * pageSize]
  );
};

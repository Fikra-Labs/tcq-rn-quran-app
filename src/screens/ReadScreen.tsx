import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  InteractionManager,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../App";
import QuranHeader from "../components/quran/QuranHeader";
import QuranSidebar from "../components/quran/QuranSidebar";
import QuranReader from "../components/quran/QuranReader";
import ViewSettingsModal from "../components/quran/ViewSettingsModal";
import FloatingControlBar from "../components/quran/FloatingControlBar";
import SurahNavigation from "../components/quran/SurahNavigation";
import AuthModal from "../components/auth/AuthModal";
import { stripFootnoteTags } from "../utils/stripFootnoteTags";
import { useQuran, Verse } from "../contexts/QuranContext";
import { useQuranAudio } from "../contexts/QuranAudioContext";
import { useBookmarks } from "../hooks/useBookmarks";
import { useReadingProgress } from "../hooks/useReadingProgress";
import { usePremiumAccess } from "../hooks/usePremiumAccess";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../integrations/supabase/client";

type ReadScreenProps =
  | NativeStackScreenProps<RootStackParamList, "Read">
  | NativeStackScreenProps<RootStackParamList, "ReadTheme">;

interface ViewSettings {
  showArabic: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  showIntro: boolean;
}

const ReadScreen = ({ route, navigation }: ReadScreenProps) => {
  const { surahNumber } = route.params || {};
  const scrollRef = useRef<ScrollView>(null);
  const thematicSoundRef = useRef<Audio.Sound | null>(null);
  const passageVerseListRef = useRef<Verse[]>([]);
  const passageIndexRef = useRef(0);

  const {
    getSurahByNumber,
    isLoading: surahsLoading,
    fetchSurahWithVerses,
    fetchThematicPassages,
    currentSurahVerses,
    currentThematicPassages,
    versesLoading,
    passagesLoading,
  } = useQuran();
  const { pause: pauseQuranAudio, currentVerseKey } = useQuranAudio();
  const { colors } = useTheme();
  const {
    isBookmarked,
    toggleBookmark,
    isThematicPassageBookmarked,
    toggleThematicPassageBookmark,
    bookmarks,
    thematicBookmarks,
    updateVerseNote,
    updateThematicNote,
  } = useBookmarks();
  const { updateProgress, getCompletionPercentage, streak } = useReadingProgress();
  const { hasReadAccess, loading: premiumAccessLoading, canAccessFootnotes } =
    usePremiumAccess();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [englishFontSize, setEnglishFontSize] = useState(16);
  const [arabicFontSize, setArabicFontSize] = useState(24);
  const [floatingVisible, setFloatingVisible] = useState(true);
  const floatingVisibleRef = useRef(true);
  const [atBottom, setAtBottom] = useState(false);
  const lastScrollYRef = useRef(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const headerVisibleRef = useRef(true);
  const [chromeHidden, setChromeHidden] = useState(false);
  const chromeHiddenRef = useRef(false);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const [bootLoading, setBootLoading] = useState(true);
  const bootStartRef = useRef<number>(Date.now());
  const bootHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootMaxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasBootedRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const restoringRef = useRef(false);
  const initialScrollOffsetRef = useRef<number | null>(null);
  const initialScrollAppliedRef = useRef(false);
  const initialVerseRef = useRef<number | null>(null);
  const initialVerseAppliedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readerSectionOffsetRef = useRef(0);
  const verseOffsetsRef = useRef<Record<number, number>>({});
  const lastViewedVerseRef = useRef<number | null>(null);
  const contentReadyRef = useRef(false);
  const hasUserScrolledRef = useRef(false);
  const isRestoringScrollRef = useRef(false);
  const hasRestoreTargetRef = useRef(false);
  const restoreCheckedRef = useRef(false);
  const restoreAttemptsRef = useRef(0);
  const isUserDraggingRef = useRef(false);
  const shouldToggleOnReleaseRef = useRef(false);

  const [settings, setSettings] = useState<ViewSettings>({
    showArabic: true,
    showTranslation: true,
    showTransliteration: false,
    showIntro: true,
  });
  const [readingMode, setReadingMode] = useState<"regular" | "thematic">("regular");
  const [currentPlayingPassageId, setCurrentPlayingPassageId] = useState<string | null>(
    null
  );
  const [isPlayingThematicPassage, setIsPlayingThematicPassage] = useState(false);

  const currentSurahNumber = surahNumber || "1";
  const surahId = parseInt(currentSurahNumber, 10) || 1;
  const selectedSurah = getSurahByNumber(surahId);
  const contextVerseNumber = currentVerseKey
    ? parseInt(currentVerseKey.split(":")[1], 10)
    : 1;

  const tryRestoreScroll = () => {
    if (!contentReadyRef.current) return;
    if (initialScrollAppliedRef.current) return;
    if (initialScrollOffsetRef.current == null) return;
    const target = initialScrollOffsetRef.current || 0;
    const attempt = () => {
      isRestoringScrollRef.current = true;
      scrollRef.current?.scrollTo({ y: target, animated: false });
      restoreAttemptsRef.current += 1;
      if (restoreAttemptsRef.current >= 3) {
        initialScrollAppliedRef.current = true;
        hasUserScrolledRef.current = false;
        restoreAttemptsRef.current = 0;
        setTimeout(() => {
          isRestoringScrollRef.current = false;
        }, 200);
        return;
      }
      setTimeout(attempt, 120);
    };
    InteractionManager.runAfterInteractions(() => {
      setTimeout(attempt, 50);
    });
  };


  const getLastViewedVerse = (scrollY: number) => {
    const offsets = verseOffsetsRef.current;
    const verseNumbers = Object.keys(offsets)
      .map((key) => Number(key))
      .filter((value) => !Number.isNaN(value))
      .sort((a, b) => a - b);
    if (verseNumbers.length === 0) return null;
    const viewportTop = scrollY + insets.top + 56 + 12;
    let candidate = verseNumbers[0];
    for (const verseNumber of verseNumbers) {
      if (offsets[verseNumber] <= viewportTop) {
        candidate = verseNumber;
      } else {
        break;
      }
    }
    return candidate;
  };

  useEffect(() => {
    const loadMode = async () => {
      const savedMode = await AsyncStorage.getItem("preferredReadingMode");
      if (
        savedMode === "thematic" &&
        hasReadAccess &&
        currentThematicPassages.length > 0
      ) {
        setReadingMode("thematic");
      } else if (savedMode === "regular") {
        setReadingMode("regular");
      }
    };
    loadMode();
  }, [currentThematicPassages.length, hasReadAccess]);

  const handleReadingModeChange = async (mode: "regular" | "thematic") => {
    if (mode === "thematic" && !hasReadAccess) {
      Alert.alert("Premium required", "Subscribe to unlock Thematic Mode and footnotes.");
      return;
    }
    setReadingMode(mode);
    await AsyncStorage.setItem("preferredReadingMode", mode);
  };

  useEffect(() => {
    if (surahId > 0 && surahId <= 114) {
      fetchSurahWithVerses(surahId);
      fetchThematicPassages(surahId);
    }
  }, [surahId, fetchSurahWithVerses, fetchThematicPassages]);

  useEffect(() => {
    if (currentSurahVerses.length > 0 && contextVerseNumber > 0) {
      updateProgress(surahId, contextVerseNumber, currentSurahVerses.length);
      if (!hasUserScrolledRef.current) {
        return;
      }
      if (readingMode === "regular") {
        if (Object.keys(verseOffsetsRef.current).length === 0) {
          return;
        }
      }
      const lastViewedVerse =
        readingMode === "regular"
          ? getLastViewedVerse(lastScrollYRef.current) ?? contextVerseNumber
          : contextVerseNumber;
      AsyncStorage.setItem(
        "lastRead",
        JSON.stringify({
          surahNumber: surahId,
          verseNumber: lastViewedVerse,
          offsetY: lastScrollYRef.current,
        })
      ).catch((error) => console.warn("Failed to persist last read state:", error));
    }
  }, [contextVerseNumber, surahId, currentSurahVerses.length, updateProgress, readingMode]);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    const restoreLastRead = async () => {
      restoreCheckedRef.current = false;
      const raw = await AsyncStorage.getItem("lastRead");
      if (!raw) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          restoreCheckedRef.current = true;
          return;
        }
        const { data, error } = await supabase
          .from("reading_progress")
          .select("surah_number,last_verse_read,last_read_at")
          .eq("user_id", user.id)
          .order("last_read_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error || !data?.surah_number) {
          restoreCheckedRef.current = true;
          return;
        }
        hasRestoreTargetRef.current = true;
        restoreCheckedRef.current = true;
        if (route.params?.surahNumber) return;
        restoringRef.current = true;
        initialVerseRef.current = data.last_verse_read ?? 1;
        navigation.navigate("Read", {
          surahNumber: String(data.surah_number),
          verse: String(data.last_verse_read ?? 1),
        });
        return;
      }
      try {
        const data = JSON.parse(raw) as {
          surahNumber?: number;
          verseNumber?: number;
          offsetY?: number;
        };
        if (!data?.surahNumber) {
          restoreCheckedRef.current = true;
          return;
        }
        hasRestoredRef.current = true;
        hasRestoreTargetRef.current =
          typeof data.offsetY === "number" || typeof data.verseNumber === "number";
        restoreCheckedRef.current = true;
        if (route.params?.surahNumber) {
          if (
            String(data.surahNumber) === String(route.params.surahNumber) &&
            typeof data.offsetY === "number"
          ) {
            initialScrollOffsetRef.current = data.offsetY;
            tryRestoreScroll();
          } else if (typeof data.verseNumber === "number") {
            initialVerseRef.current = data.verseNumber;
          }
          return;
        }
        restoringRef.current = true;
        if (typeof data.offsetY === "number") {
          initialScrollOffsetRef.current = data.offsetY;
        } else if (typeof data.verseNumber === "number") {
          initialVerseRef.current = data.verseNumber;
        }
        navigation.navigate("Read", {
          surahNumber: String(data.surahNumber),
          verse:
            typeof data.offsetY === "number"
              ? undefined
              : data.verseNumber
                ? String(data.verseNumber)
                : undefined,
        });
      } catch (error) {
        console.warn("Failed to restore last read state:", error);
      }
    };
    void restoreLastRead();
  }, [navigation, route.params?.surahNumber, tryRestoreScroll]);

  useEffect(() => {
    if (restoringRef.current) {
      restoringRef.current = false;
      return;
    }
    setAtBottom(false);
    floatingVisibleRef.current = true;
    setFloatingVisible(true);
    if (!hasBootedRef.current) {
      setBootLoading(true);
      bootStartRef.current = Date.now();
      if (bootHideTimerRef.current) {
        clearTimeout(bootHideTimerRef.current);
        bootHideTimerRef.current = null;
      }
      if (bootMaxTimerRef.current) {
        clearTimeout(bootMaxTimerRef.current);
        bootMaxTimerRef.current = null;
      }
    }
    initialScrollOffsetRef.current = null;
    initialScrollAppliedRef.current = false;
    initialVerseRef.current = null;
    initialVerseAppliedRef.current = false;
    contentReadyRef.current = false;
    hasUserScrolledRef.current = false;
    isRestoringScrollRef.current = false;
    hasRestoreTargetRef.current = false;
    restoreCheckedRef.current = false;
    verseOffsetsRef.current = {};
    readerSectionOffsetRef.current = 0;
  }, [surahId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (bootHideTimerRef.current) {
        clearTimeout(bootHideTimerRef.current);
      }
      if (bootMaxTimerRef.current) {
        clearTimeout(bootMaxTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentSurahVerses.length) return;
    tryRestoreScroll();
  }, [currentSurahVerses.length]);

  useEffect(() => {
    if (initialVerseAppliedRef.current) return;
    if (!contentReadyRef.current) return;
    if (!currentSurahVerses.length) return;
    if (initialVerseRef.current == null) return;
    const offset = verseOffsetsRef.current[initialVerseRef.current];
    if (typeof offset !== "number") return;
    const target = Math.max(0, offset - (insets.top + 56 + 12));
    isRestoringScrollRef.current = true;
    scrollRef.current?.scrollTo({ y: target, animated: false });
    initialVerseAppliedRef.current = true;
    hasUserScrolledRef.current = false;
    setTimeout(() => {
      isRestoringScrollRef.current = false;
    }, 200);
  }, [currentSurahVerses.length, insets.top]);

  useEffect(() => {
    const hasRestoreTarget = hasRestoreTargetRef.current;
    const restoreComplete = hasRestoreTarget
      ? initialScrollAppliedRef.current || initialVerseAppliedRef.current
      : restoreCheckedRef.current;
    const dataLoaded = !surahsLoading && !versesLoading && !passagesLoading;
    if (contentReadyRef.current && restoreComplete && dataLoaded && !isRestoringScrollRef.current) {
      if (bootHideTimerRef.current) return;
      const elapsed = Date.now() - bootStartRef.current;
      const remaining = Math.max(0, 400 - elapsed);
      bootHideTimerRef.current = setTimeout(() => {
        setBootLoading(false);
        bootHideTimerRef.current = null;
      }, remaining);
    }
  }, [
    surahsLoading,
    versesLoading,
    passagesLoading,
    currentSurahVerses.length,
    currentThematicPassages.length,
  ]);

  useEffect(() => {
    if (!bootLoading) return;
    if (bootMaxTimerRef.current) return;
    bootMaxTimerRef.current = setTimeout(() => {
      setBootLoading(false);
      bootMaxTimerRef.current = null;
    }, 2500);
  }, [bootLoading]);

  useEffect(() => {
    if (!bootLoading) {
      hasBootedRef.current = true;
    }
  }, [bootLoading]);

  const ensureThematicSound = useCallback(async () => {
    if (thematicSoundRef.current) return thematicSoundRef.current;
    const sound = new Audio.Sound();
    thematicSoundRef.current = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        const passageVerses = passageVerseListRef.current;
        const nextIndex = passageIndexRef.current + 1;
        if (nextIndex < passageVerses.length) {
          passageIndexRef.current = nextIndex;
          void playPassageVerse(passageVerses, nextIndex);
        } else {
          setIsPlayingThematicPassage(false);
          setCurrentPlayingPassageId(null);
          passageIndexRef.current = 0;
        }
      }
    });

    return sound;
  }, []);

  const playPassageVerse = async (passageVerses: typeof currentSurahVerses, index: number) => {
    const sound = await ensureThematicSound();
    const verse = passageVerses[index];
    if (!verse) return;
    const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${verse.surahNumber}/${verse.verseNumber}.mp3`;
    await sound.unloadAsync();
    await sound.loadAsync({ uri: audioUrl }, { shouldPlay: true });
    setIsPlayingThematicPassage(true);
  };

  const handleThematicPassagePlay = async (passageId: string) => {
    const passage = currentThematicPassages.find((p) => p.id === passageId);
    if (!passage) return;

    if (currentPlayingPassageId === passageId && isPlayingThematicPassage) {
      const sound = await ensureThematicSound();
      await sound.pauseAsync();
      setIsPlayingThematicPassage(false);
      return;
    }

    pauseQuranAudio();

    const passageVerses = currentSurahVerses.filter(
      (v) => v.verseNumber >= passage.verseRange.start && v.verseNumber <= passage.verseRange.end
    );
    if (passageVerses.length === 0) return;

    passageVerseListRef.current = passageVerses;
    passageIndexRef.current = 0;
    setCurrentPlayingPassageId(passageId);
    await playPassageVerse(passageVerses, 0);
  };

  const handlePrevSurah = () => {
    if (surahId > 1) {
      navigation.navigate("Read", { surahNumber: String(surahId - 1) });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleNextSurah = () => {
    if (surahId < 114) {
      navigation.navigate("Read", { surahNumber: String(surahId + 1) });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const setHeader = (value: boolean) => {
    if (headerVisibleRef.current !== value) {
      headerVisibleRef.current = value;
      setHeaderVisible(value);
    }
  };

  const handleScroll = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const lastY = lastScrollYRef.current;
    const delta = currentY - lastY;
    const contentHeight = event.nativeEvent.contentSize?.height ?? 0;
    const layoutHeight = event.nativeEvent.layoutMeasurement?.height ?? 0;
    const isShortContent = contentHeight <= layoutHeight + 20;
    const isAtBottom = currentY + layoutHeight >= contentHeight - 80;
    if (atBottom !== isAtBottom) {
      setAtBottom(isAtBottom);
    }

    if (chromeHiddenRef.current) {
      lastScrollYRef.current = currentY;
      return;
    }
    if (isRestoringScrollRef.current) {
      lastScrollYRef.current = currentY;
      return;
    }

    hasUserScrolledRef.current = true;

    const setVisible = (value: boolean) => {
      if (floatingVisibleRef.current !== value) {
        floatingVisibleRef.current = value;
        setFloatingVisible(value);
      }
    };

    if (isShortContent) {
      setVisible(true);
    } else if (isAtBottom) {
      setVisible(false);
    } else if (currentY < 80) {
      setVisible(true);
    } else if (delta > 12) {
      setVisible(false);
    } else if (delta < -12) {
      setVisible(true);
    }

    if (isUserDraggingRef.current) {
      if (currentY < 40) {
        setHeader(true);
      } else if (delta > 12) {
        setHeader(false);
      } else if (delta < -12) {
        setHeader(true);
      }
    }

    lastScrollYRef.current = currentY;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (!initialScrollAppliedRef.current && !hasUserScrolledRef.current) {
        return;
      }
      if (readingMode === "regular") {
        if (Object.keys(verseOffsetsRef.current).length === 0) {
          return;
        }
      }
      const lastViewedVerse =
        readingMode === "regular"
          ? getLastViewedVerse(currentY) ?? contextVerseNumber ?? 1
          : contextVerseNumber ?? 1;
      lastViewedVerseRef.current = lastViewedVerse;
      AsyncStorage.setItem(
        "lastRead",
        JSON.stringify({
          surahNumber: surahId,
          verseNumber: lastViewedVerse,
          offsetY: currentY,
        })
      ).catch((error) => console.warn("Failed to persist last read state:", error));
    }, 400);
  };

  const handleScrollEnd = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize?.height ?? 0;
    const layoutHeight = event.nativeEvent.layoutMeasurement?.height ?? 0;
    const isAtBottom = currentY + layoutHeight >= contentHeight - 80;
    if (atBottom !== isAtBottom) {
      setAtBottom(isAtBottom);
    }
  };

  useEffect(() => {
    const target = headerVisible ? 0 : -(56 + insets.top);
    Animated.parallel([
      Animated.timing(headerTranslateY, {
        toValue: target,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: headerVisible ? 1 : 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerVisible, headerOpacity, headerTranslateY, insets.top]);

  const handleTapToggle = () => {
    setChromeHidden((prev) => {
      const next = !prev;
      chromeHiddenRef.current = next;
      if (next) {
        setHeader(false);
        if (floatingVisibleRef.current) {
          floatingVisibleRef.current = false;
          setFloatingVisible(false);
        }
      } else {
        setHeader(true);
        if (!atBottom && !floatingVisibleRef.current) {
          floatingVisibleRef.current = true;
          setFloatingVisible(true);
        }
      }
      return next;
    });
  };

  const handleSharePassage = async (passageId: string) => {
    const passage = currentThematicPassages.find((p) => p.id === passageId);
    if (!passage || !selectedSurah) return;
    const title = `${selectedSurah.transliteration}: ${passage.themeName}`;
    const description = stripFootnoteTags(passage.translation || "").substring(0, 180);
    const url = `https://theclearquran.org/read/${surahId}/${passage.verseRange.start}-${passage.verseRange.end}`;
    await Share.share({ message: `${title}\n\n${description}\n\n${url}` });
  };

  const handleShareVerse = async (verseNumber: number) => {
    const verse = currentSurahVerses.find((v) => v.verseNumber === verseNumber);
    if (!verse || !selectedSurah) return;
    const title = `${selectedSurah.transliteration} ${surahId}:${verseNumber}`;
    const description = stripFootnoteTags(verse.translation || "").substring(0, 180);
    const url = `https://theclearquran.org/read/${surahId}/${verseNumber}`;
    await Share.share({ message: `${title}\n\n${description}\n\n${url}` });
  };

  const isRTL = settings.showArabic && !settings.showTranslation;
  const isInitialPremiumLoading = premiumAccessLoading && currentSurahVerses.length === 0;
  const isPageLoading = surahsLoading || versesLoading || passagesLoading || isInitialPremiumLoading;

  const verseNotes = useMemo(() => {
    const notesMap: Record<string, string> = {};
    bookmarks.forEach((bookmark) => {
      if (bookmark.note) {
        notesMap[`${bookmark.surah_number}-${bookmark.verse_number}`] = bookmark.note;
      }
    });
    return notesMap;
  }, [bookmarks]);

  const passageNotes = useMemo(() => {
    const notesMap: Record<string, string> = {};
    thematicBookmarks.forEach((bookmark) => {
      if (bookmark.note) {
        notesMap[bookmark.passage_id] = bookmark.note;
      }
    });
    return notesMap;
  }, [thematicBookmarks]);

  const introContent = useMemo(() => {
    if (!selectedSurah?.description || !settings.showIntro) return null;
    return (
      <View
        style={[
          styles.introCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.introTitle,
            {
              color: colors.foreground,
              fontSize: Math.max(14, englishFontSize * 1.05),
            },
          ]}
        >
          Introduction
        </Text>
        <Text
          style={[
            styles.introText,
            {
              color: colors.textSecondary,
              fontSize: Math.max(12, englishFontSize * 0.95),
              lineHeight: Math.round(englishFontSize * 1.4),
            },
          ]}
        >
          {selectedSurah.description}
        </Text>
      </View>
    );
  }, [selectedSurah?.description, settings.showIntro, colors, englishFontSize]);

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      {bootLoading ? (
        <View style={styles.bootOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.bootTitle, { color: colors.foreground }]}>
            Loading reader...
          </Text>
        </View>
      ) : null}
      <Animated.View
        style={[
          styles.headerOverlay,
          {
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          },
        ]}
        pointerEvents={!chromeHidden && headerVisible ? "auto" : "none"}
      >
        <QuranHeader
          selectedSurah={selectedSurah}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onScrollToTop={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          onOpenAuth={() => setAuthOpen(true)}
          topInset={insets.top}
        />
      </Animated.View>

      <QuranSidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentSurahNumber={currentSurahNumber}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectSurah={(surah) => navigation.navigate("Read", { surahNumber: String(surah) })}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 56 + 12 }]}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          hasUserScrolledRef.current = true;
          isUserDraggingRef.current = true;
        }}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollBegin={() => {
          isUserDraggingRef.current = true;
        }}
        onMomentumScrollEnd={(event) => {
          isUserDraggingRef.current = false;
          handleScrollEnd(event);
        }}
        scrollEventThrottle={16}
        onStartShouldSetResponderCapture={(event) => {
          const nativeEvent = event.nativeEvent as any;
          shouldToggleOnReleaseRef.current =
            nativeEvent?.target === nativeEvent?.currentTarget;
          return shouldToggleOnReleaseRef.current;
        }}
        onResponderRelease={() => {
          if (shouldToggleOnReleaseRef.current) {
            handleTapToggle();
          }
        }}
        onContentSizeChange={() => {
          contentReadyRef.current = true;
          if (restoreCheckedRef.current && !hasRestoreTargetRef.current) {
            initialScrollAppliedRef.current = true;
          } else {
            tryRestoreScroll();
          }
        }}
      >
        {isPageLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading...
            </Text>
          </View>
        ) : selectedSurah ? (
          <>
            {introContent}
            {readingMode === "thematic" && currentThematicPassages.length === 0 ? (
              <View
                style={[
                  styles.introCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.introTitle, { color: colors.foreground }]}>
                  No thematic passages yet
                </Text>
                <Text style={[styles.introText, { color: colors.textSecondary }]}>
                  Content for this surah is being added progressively.
                </Text>
              </View>
            ) : null}
            <QuranReader
              verses={currentSurahVerses}
              thematicPassages={currentThematicPassages}
              viewMode={readingMode === "thematic" ? "thematic" : "verse"}
              englishFontSize={englishFontSize}
              arabicFontSize={arabicFontSize}
              showArabic={settings.showArabic}
              showTranslation={settings.showTranslation}
              showTransliteration={settings.showTransliteration}
              surahNumber={surahId}
              onSectionLayout={(y) => {
                readerSectionOffsetRef.current = y;
              }}
              onVerseLayout={(verseNumber, y) => {
                verseOffsetsRef.current[verseNumber] = readerSectionOffsetRef.current + y;
                if (
                  !initialVerseAppliedRef.current &&
                  initialVerseRef.current === verseNumber &&
                  contentReadyRef.current
                ) {
                  const target = Math.max(
                    0,
                    readerSectionOffsetRef.current + y - (insets.top + 56 + 12)
                  );
                  scrollRef.current?.scrollTo({ y: target, animated: false });
                  initialVerseAppliedRef.current = true;
                }
              }}
              onThematicPassagePlay={handleThematicPassagePlay}
              currentPlayingPassageId={currentPlayingPassageId}
              isPlayingThematicPassage={isPlayingThematicPassage}
              onBookmarkVerse={(verseNumber) => toggleBookmark(surahId, verseNumber)}
              isVerseBookmarked={(verseNumber) => isBookmarked(surahId, verseNumber)}
              onThematicPassageBookmark={toggleThematicPassageBookmark}
              isThematicPassageBookmarked={isThematicPassageBookmarked}
              verseNotes={verseNotes}
              passageNotes={passageNotes}
              onVerseNoteSave={updateVerseNote}
              onThematicNoteSave={updateThematicNote}
              onSharePassage={(passage) => handleSharePassage(passage.id)}
              onShareVerse={handleShareVerse}
              canAccessFootnotes={canAccessFootnotes}
              onRequestUpgrade={() =>
                Alert.alert("Premium required", "Subscribe to unlock footnotes and thematic mode.")
              }
            />
          </>
        ) : (
          <View style={styles.loadingWrap}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Surah not found.
            </Text>
          </View>
        )}
      </ScrollView>

      <FloatingControlBar
        surahId={surahId}
        totalVerses={currentSurahVerses.length}
        englishFontSize={englishFontSize}
        arabicFontSize={arabicFontSize}
        onEnglishFontSizeChange={setEnglishFontSize}
        onArabicFontSizeChange={setArabicFontSize}
        onResetFontSizes={() => {
          setEnglishFontSize(16);
          setArabicFontSize(24);
        }}
        showArabic={settings.showArabic}
        showTranslation={settings.showTranslation}
        showTransliteration={settings.showTransliteration}
        onDisplayToggle={(setting, value) =>
          setSettings((prev) => ({ ...prev, [setting]: value }))
        }
        onPrevSurah={handlePrevSurah}
        onNextSurah={handleNextSurah}
        currentSurah={`${selectedSurah?.transliteration || ""} - ${selectedSurah?.translation || ""}`}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isCurrentVerseBookmarked={isBookmarked(surahId, contextVerseNumber)}
        onToggleBookmark={() => toggleBookmark(surahId, contextVerseNumber)}
        currentStreak={streak?.current_streak || 0}
        completionPercentage={getCompletionPercentage()}
        hasPremiumAccess={hasReadAccess}
        readingMode={readingMode}
        onReadingModeChange={handleReadingModeChange}
        hasThematicContent={true}
        onRequestUpgrade={() =>
          Alert.alert("Premium required", "Subscribe to unlock Thematic Mode and footnotes.")
        }
        isVisible={!chromeHidden && floatingVisible}
      />

      <SurahNavigation
        currentSurah={surahId}
        totalSurahs={114}
        onNextSurah={handleNextSurah}
        onPrevSurah={handlePrevSurah}
        isRTL={isRTL}
        isVisible={atBottom && !chromeHidden}
      />

      <ViewSettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        englishFontSize={englishFontSize}
        arabicFontSize={arabicFontSize}
        onEnglishFontSizeChange={setEnglishFontSize}
        onArabicFontSizeChange={setArabicFontSize}
        onResetFontSizes={() => {
          setEnglishFontSize(16);
          setArabicFontSize(24);
        }}
      />
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </SafeAreaView>
  );
};

export default ReadScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0b0b",
  },
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0b0b0b",
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bootTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  bootSubtitle: {
    fontSize: 12,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 96,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#a1a1aa",
  },
  introCard: {
    marginHorizontal: 0,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

import React, { memo, useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from "react-native";
import { Verse, ThematicPassage } from "../../contexts/QuranContext";
import { stripFootnoteTags } from "../../utils/stripFootnoteTags";
import { useQuranAudio } from "../../contexts/QuranAudioContext";
import NoteModal from "./NoteModal";
import { TextWithFootnotes } from "./TextWithFootnotes";
import ThematicFootnotes from "./ThematicFootnotes";
import { useTheme } from "../../contexts/ThemeContext";

// Convert Western numerals to Arabic-Indic numerals
const toArabicNumeral = (num: number): string => {
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return num
    .toString()
    .split("")
    .map((digit) => arabicNumerals[parseInt(digit, 10)])
    .join("");
};

const AnimatedCard = ({
  children,
  delay,
  onLayout,
}: {
  children: React.ReactNode;
  delay: number;
  onLayout?: (event: { nativeEvent: { layout: { y: number } } }) => void;
}) => {
  const translateY = useRef(new Animated.Value(12)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      style={{ transform: [{ translateY }], opacity }}
      onLayout={onLayout}
      collapsable={false}
    >
      {children}
    </Animated.View>
  );
};

interface QuranReaderProps {
  verses?: Verse[];
  thematicPassages?: ThematicPassage[];
  viewMode?: "verse" | "thematic";
  englishFontSize?: number;
  arabicFontSize?: number;
  showArabic?: boolean;
  showTranslation?: boolean;
  showTransliteration?: boolean;
  surahNumber: number;
  onSectionLayout?: (y: number) => void;
  onVerseLayout?: (verseNumber: number, y: number) => void;
  onThematicPassagePlay?: (passageId: string) => void;
  currentPlayingPassageId?: string | null;
  isPlayingThematicPassage?: boolean;
  onBookmarkVerse?: (verseNumber: number) => void;
  isVerseBookmarked?: (verseNumber: number) => boolean;
  onThematicPassageBookmark?: (passageId: string, surahNumber: number, themeName: string) => void;
  isThematicPassageBookmarked?: (passageId: string) => boolean;
  verseNotes?: Record<string, string>;
  passageNotes?: Record<string, string>;
  onVerseNoteSave?: (surahNumber: number, verseNumber: number, note: string) => void;
  onThematicNoteSave?: (passageId: string, note: string) => void;
  onSharePassage?: (passage: ThematicPassage) => void;
  onShareVerse?: (verseNumber: number) => void;
  canAccessFootnotes?: (surahNumber: number, passageIndex: number) => boolean;
  onRequestUpgrade?: () => void;
}

const QuranReader = memo(function QuranReader({
  verses = [],
  thematicPassages = [],
  viewMode = "verse",
  englishFontSize = 16,
  arabicFontSize = 24,
  showArabic = true,
  showTranslation = true,
  showTransliteration = false,
  surahNumber,
  onThematicPassagePlay,
  currentPlayingPassageId,
  isPlayingThematicPassage = false,
  onBookmarkVerse,
  isVerseBookmarked,
  onThematicPassageBookmark,
  isThematicPassageBookmarked,
  verseNotes = {},
  passageNotes = {},
  onVerseNoteSave,
  onThematicNoteSave,
  onSharePassage,
  onShareVerse,
  canAccessFootnotes,
  onRequestUpgrade,
  onSectionLayout,
  onVerseLayout,
}: QuranReaderProps) {
  const { currentVerseKey, playbackState, pendingVerseNumber, playVerse, pause } =
    useQuranAudio();
  const { colors } = useTheme();
  const isPlaying = playbackState === "playing";
  const renderPageMarker = (page: number) => (
    <View style={styles.pageMarker}>
      <View style={[styles.pageLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.pageLabel, { color: colors.textSecondary }]}>
        Page {page}
      </Text>
      <View style={[styles.pageLine, { backgroundColor: colors.border }]} />
    </View>
  );
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{
    type: "verse" | "passage";
    passageId?: string;
    verseNumber?: number;
    themeName?: string;
  } | null>(null);
  const [activeFootnotes, setActiveFootnotes] = useState<
    Record<string, string | null>
  >({});
  if (viewMode === "thematic") {
    let lastPage: number | null = null;
    return (
      <View
        style={[styles.section, styles.sectionThematic]}
        onLayout={(event) => {
          onSectionLayout?.(event.nativeEvent.layout.y);
        }}
      >
        {thematicPassages.map((item, index) => {
          const hasFootnoteAccess = canAccessFootnotes
            ? canAccessFootnotes(item.surahNumber, index)
            : true;
          const showPageMarker =
            typeof item.page === "number" && item.page !== lastPage;
          if (showPageMarker) {
            lastPage = item.page ?? null;
          }
          const cardDelay = Math.min(index * 40, 160);
          return (
            <React.Fragment key={item.id}>
              {showPageMarker && typeof item.page === "number"
                ? renderPageMarker(item.page)
                : null}
              <AnimatedCard delay={cardDelay}>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.themeHeader}>
                    <Text style={[styles.themeTitle, { color: colors.foreground }]}>
                      {item.themeName}
                    </Text>
                    <View style={styles.actionRow}>
                      {onThematicPassagePlay ? (
                        <TouchableOpacity
                          style={[styles.playButton, { borderColor: colors.border }]}
                          onPress={() => onThematicPassagePlay(item.id)}
                        >
                          <Text style={[styles.playLabel, { color: colors.foreground }]}>
                            {currentPlayingPassageId === item.id && isPlayingThematicPassage
                              ? "Pause"
                              : "Play"}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {onThematicPassageBookmark && isThematicPassageBookmarked ? (
                        <TouchableOpacity
                          style={[styles.iconButton, { borderColor: colors.border }]}
                          onPress={() =>
                            onThematicPassageBookmark(
                              item.id,
                              item.surahNumber,
                              item.themeName
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.iconLabel,
                              {
                                color: isThematicPassageBookmarked(item.id)
                                  ? colors.primary
                                  : colors.foreground,
                              },
                            ]}
                          >
                            {isThematicPassageBookmarked(item.id) ? "★" : "☆"}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {onThematicNoteSave ? (
                        <TouchableOpacity
                          style={[styles.iconButton, { borderColor: colors.border }]}
                          onPress={() => {
                            setNoteTarget({
                              type: "passage",
                              passageId: item.id,
                              themeName: item.themeName,
                            });
                            setNoteModalOpen(true);
                          }}
                        >
                          <Text style={[styles.iconLabel, { color: colors.foreground }]}>
                            {passageNotes[item.id] ? "✎" : "+"}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {onSharePassage ? (
                        <TouchableOpacity
                          style={[styles.iconButton, { borderColor: colors.border }]}
                          onPress={() => onSharePassage(item)}
                        >
                          <Text style={[styles.iconLabel, { color: colors.foreground }]}>
                            ↗
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  {showArabic ? (
                    <Text
                      style={[
                        styles.arabicText,
                        {
                          fontSize: arabicFontSize,
                          color: colors.foreground,
                          fontFamily: "ScheherazadeNew_400Regular",
                          lineHeight: Math.ceil(arabicFontSize * 1.6),
                          paddingTop: 10,
                          paddingBottom: 4,
                        },
                      ]}
                    >
                      {item.verseTranslations?.length
                        ? item.verseTranslations.map((verse) => (
                            <Text key={verse.verseNumber}>
                              {verse.arabic}{" "}
                              <Text
                                style={[styles.verseMarker, { color: colors.textSecondary }]}
                              >
                                ﴿{toArabicNumeral(verse.verseNumber)}﴾
                              </Text>{" "}
                            </Text>
                          ))
                        : item.arabicText}
                    </Text>
                  ) : null}
                  {showTranslation ? (
                    <Text
                      style={[
                        styles.translationText,
                        { fontSize: englishFontSize, color: colors.foreground },
                      ]}
                    >
                      {item.verseTranslations?.length ? (
                        item.verseTranslations.map((verse, idx) => (
                          <Text key={verse.verseNumber}>
                            <Text style={[styles.verseNumber, { color: colors.primary }]}>
                              {verse.verseNumber}.
                            </Text>{" "}
                            <TextWithFootnotes
                              text={verse.text}
                              verseNumber={verse.verseNumber}
                              onFootnoteClick={(footnoteId) =>
                                setActiveFootnotes((prev) => ({
                                  ...prev,
                                  [item.id]: footnoteId,
                                }))
                              }
                              hasPremiumAccess={hasFootnoteAccess}
                              onPremiumClick={onRequestUpgrade}
                            />
                            {idx < item.verseTranslations.length - 1 ? " " : ""}
                          </Text>
                        ))
                      ) : (
                        <TextWithFootnotes
                          text={item.translation}
                          verseNumber={0}
                          onFootnoteClick={(footnoteId) =>
                            setActiveFootnotes((prev) => ({
                              ...prev,
                              [item.id]: footnoteId,
                            }))
                          }
                          hasPremiumAccess={hasFootnoteAccess}
                          onPremiumClick={onRequestUpgrade}
                        />
                      )}
                    </Text>
                  ) : null}
                  {item.footnotes && item.footnotes.length > 0 && hasFootnoteAccess ? (
                    <ThematicFootnotes
                      footnotes={item.footnotes}
                      fontSize={englishFontSize}
                      activeFootnoteId={activeFootnotes[item.id]}
                    />
                  ) : null}
                </View>
              </AnimatedCard>
            </React.Fragment>
          );
        })}
      </View>
    );
  }

  const renderVerseItem = ({ item, index }: { item: Verse; index: number }) => {
    const verseKey = `${item.surahNumber}:${item.verseNumber}`;
    const isActiveVerse = currentVerseKey === verseKey && isPlaying;
    const isLoadingThisVerse = pendingVerseNumber === item.verseNumber;
    const showPageMarker = index === 0 || item.page !== verses[index - 1]?.page;

    const handleVersePlayClick = async () => {
      if (isActiveVerse) {
        pause();
      } else {
        await playVerse(surahNumber, item.verseNumber);
      }
    };

    const cardDelay = Math.min(index * 30, 140);
    return (
      <View>
        {showPageMarker && typeof item.page === "number"
          ? renderPageMarker(item.page)
          : null}
        <AnimatedCard
          delay={cardDelay}
          onLayout={(event) => {
            onVerseLayout?.(item.verseNumber, event.nativeEvent.layout.y);
          }}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              isActiveVerse && [styles.cardActive, { borderColor: colors.primary }],
            ]}
          >
            <View style={styles.verseHeader}>
              <Text
                style={[
                  styles.verseBadge,
                  {
                    backgroundColor: `${colors.primary}1A`,
                    borderColor: `${colors.primary}33`,
                    color: colors.primary,
                  },
                ]}
              >
                {item.verseNumber}
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.playButton, { borderColor: colors.border }]}
                  onPress={handleVersePlayClick}
                  disabled={isLoadingThisVerse}
                >
                  <Text style={[styles.playLabel, { color: colors.foreground }]}>
                    {isLoadingThisVerse ? "..." : isActiveVerse ? "Pause" : "Play"}
                  </Text>
                </TouchableOpacity>
                {onBookmarkVerse && isVerseBookmarked ? (
                  <TouchableOpacity
                    style={[styles.iconButton, { borderColor: colors.border }]}
                    onPress={() => onBookmarkVerse(item.verseNumber)}
                  >
                    <Text
                      style={[
                        styles.iconLabel,
                        {
                          color: isVerseBookmarked(item.verseNumber)
                            ? colors.primary
                            : colors.foreground,
                        },
                      ]}
                    >
                      {isVerseBookmarked(item.verseNumber) ? "★" : "☆"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {onVerseNoteSave ? (
                  <TouchableOpacity
                    style={[styles.iconButton, { borderColor: colors.border }]}
                    onPress={() => {
                      setNoteTarget({
                        type: "verse",
                        verseNumber: item.verseNumber,
                      });
                      setNoteModalOpen(true);
                    }}
                  >
                    <Text style={[styles.iconLabel, { color: colors.foreground }]}>
                      {verseNotes[`${surahNumber}-${item.verseNumber}`] ? "✎" : "+"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {onShareVerse ? (
                  <TouchableOpacity
                    style={[styles.iconButton, { borderColor: colors.border }]}
                    onPress={() => onShareVerse(item.verseNumber)}
                  >
                    <Text style={[styles.iconLabel, { color: colors.foreground }]}>↗</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            {showArabic ? (
              <Text
                style={[
                  styles.arabicText,
                  {
                    fontSize: arabicFontSize,
                    color: colors.foreground,
                    fontFamily: "ScheherazadeNew_400Regular",
                    lineHeight: Math.ceil(arabicFontSize * 1.5),
                    paddingTop: 8,
                    paddingBottom: 4,
                  },
                ]}
              >
                {item.arabic}
              </Text>
            ) : null}
            {showTransliteration && item.transliteration ? (
              <Text
                style={[
                  styles.transliterationText,
                  { fontSize: englishFontSize * 0.9, color: colors.textSecondary },
                ]}
              >
                {item.transliteration}
              </Text>
            ) : null}
            {showTranslation ? (
              <Text
                style={[
                  styles.translationText,
                  { fontSize: englishFontSize, color: colors.foreground },
                ]}
              >
                {stripFootnoteTags(item.translation)}
              </Text>
            ) : null}
          </View>
        </AnimatedCard>
      </View>
    );
  };

  return (
    <View
      style={styles.section}
      onLayout={(event) => {
        onSectionLayout?.(event.nativeEvent.layout.y);
      }}
    >
      {verses.map((verse, index) => (
        <React.Fragment key={`${verse.surahNumber}-${verse.verseNumber}`}>
          {renderVerseItem({ item: verse, index })}
        </React.Fragment>
      ))}
      {noteTarget ? (
        <NoteModal
          visible={noteModalOpen}
          title={
            noteTarget.type === "verse"
              ? `Note for ${surahNumber}:${noteTarget.verseNumber}`
              : `Note for ${noteTarget.themeName}`
          }
          initialValue={
            noteTarget.type === "verse" && noteTarget.verseNumber
              ? verseNotes[`${surahNumber}-${noteTarget.verseNumber}`]
              : noteTarget.passageId
                ? passageNotes[noteTarget.passageId]
                : ""
          }
          onClose={() => {
            setNoteModalOpen(false);
            setNoteTarget(null);
          }}
          onSave={(value) => {
            if (noteTarget.type === "verse" && noteTarget.verseNumber) {
              onVerseNoteSave?.(surahNumber, noteTarget.verseNumber, value);
            }
            if (noteTarget.type === "passage" && noteTarget.passageId) {
              onThematicNoteSave?.(noteTarget.passageId, value);
            }
          }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: 16,
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionThematic: {
    gap: 24,
  },
  pageMarker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
  },
  pageLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  pageLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#121212",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  cardActive: {
    borderColor: "#60a5fa",
    shadowColor: "#60a5fa",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  verseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  verseBadge: {
    borderRadius: 999,
    borderWidth: 1,
    width: 28,
    height: 28,
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 26,
    includeFontPadding: false,
    fontSize: 12,
    fontWeight: "600",
  },
  playButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2b2b2b",
  },
  playLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  iconButton: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2b2b2b",
    alignItems: "center",
    justifyContent: "center",
  },
  iconLabel: {
    color: "#ffffff",
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  themeTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  themeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  arabicText: {
    color: "#ffffff",
    textAlign: "right",
    lineHeight: 34,
    marginBottom: 12,
    includeFontPadding: Platform.OS === "android",
    paddingTop: 6,
    paddingBottom: 2,
  },
  verseMarker: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  verseNumber: {
    color: "#60a5fa",
    fontWeight: "700",
  },
  transliterationText: {
    color: "#a1a1aa",
    fontStyle: "italic",
    marginBottom: 8,
  },
  translationText: {
    color: "#e5e7eb",
    lineHeight: 24,
  },
});

export default QuranReader;

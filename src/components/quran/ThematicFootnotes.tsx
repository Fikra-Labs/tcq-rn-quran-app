import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface Footnote {
  id: string;
  verseNumber: number;
  marker: string;
  text: string;
}

interface ThematicFootnotesProps {
  footnotes: Footnote[];
  fontSize?: number;
  activeFootnoteId?: string | null;
}

const ThematicFootnotes = ({
  footnotes,
  fontSize = 16,
  activeFootnoteId,
}: ThematicFootnotesProps) => {
  const { colors } = useTheme();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (activeFootnoteId) {
      setHighlightedId(activeFootnoteId);
      const timer = setTimeout(() => setHighlightedId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeFootnoteId]);

  if (footnotes.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        Footnotes ({footnotes.length})
      </Text>
      {footnotes.map((footnote) => (
        <View
          key={footnote.id}
          style={[
            styles.footnoteRow,
            highlightedId === footnote.id && styles.footnoteHighlight,
            { borderColor: colors.border },
          ]}
        >
          <Text style={[styles.marker, { color: colors.primary }]}>
            [{footnote.marker}]
          </Text>
          <Text
            style={[
              styles.text,
              { fontSize: fontSize * 0.875, color: colors.textSecondary },
            ]}
          >
            {footnote.text}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  title: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  footnoteRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  footnoteHighlight: {
    backgroundColor: "rgba(96, 165, 250, 0.15)",
  },
  marker: {
    fontWeight: "700",
    minWidth: 36,
  },
  text: {
    flex: 1,
  },
});

export default ThematicFootnotes;

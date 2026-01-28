import React from "react";
import { Text, StyleSheet, TextStyle } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface TextWithFootnotesProps {
  text: string;
  verseNumber: number;
  onFootnoteClick?: (footnoteId: string) => void;
  hasPremiumAccess?: boolean;
  onPremiumClick?: () => void;
  style?: TextStyle;
}

export const TextWithFootnotes = ({
  text,
  verseNumber,
  onFootnoteClick,
  hasPremiumAccess = true,
  onPremiumClick,
  style,
}: TextWithFootnotesProps) => {
  const { colors } = useTheme();
  const footnoteRegex = /<footnote\s+id="(\d+)"\s+number="(\d+)">/g;
  const elements: React.ReactNode[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  const handleFootnotePress = (id: number) => {
    if (!hasPremiumAccess) {
      onPremiumClick?.();
      return;
    }
    onFootnoteClick?.(String(id));
  };

  while ((match = footnoteRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(
        <Text key={`text-${keyIndex++}`}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }

    const id = parseInt(match[1], 10);
    const number = match[2];

    elements.push(
      <Text
        key={`fn-${id}-${keyIndex++}`}
        onPress={() => handleFootnotePress(id)}
        accessibilityLabel={`Footnote ${number}`}
        style={[
          styles.footnote,
          { color: hasPremiumAccess ? colors.primary : colors.textSecondary },
        ]}
      >
        [{number}]
      </Text>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(
      <Text key={`text-${keyIndex++}`}>{text.slice(lastIndex)}</Text>
    );
  }

  return <Text style={style}>{elements}</Text>;
};

const styles = StyleSheet.create({
  footnote: {
    fontSize: 11,
    fontWeight: "700",
  },
});

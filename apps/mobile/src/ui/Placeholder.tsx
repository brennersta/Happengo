import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export function Placeholder({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.fill}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.body}>{t(bodyKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    color: "#4b5563",
  },
});

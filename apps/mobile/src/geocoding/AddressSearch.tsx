import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { LngLat } from "@/map/types";
import { theme } from "@/theme/theme";
import { MIN_QUERY_LENGTH, moveHighlight, SEARCH_DEBOUNCE_MS, searchPlaces, type GeocodePlace, type GeocodeStatus } from "./photon";

export function AddressSearch({
  center,
  value,
  onChangeText,
  onSelect,
  placeholder,
  skipSearchValue,
}: {
  center: LngLat;
  value?: string;
  onChangeText?: (value: string) => void;
  onSelect: (place: GeocodePlace) => void;
  placeholder?: string;
  skipSearchValue?: string;
}) {
  const { t, i18n } = useTranslation();
  const [internal, setInternal] = useState("");
  const text = value ?? internal;
  const setText = onChangeText ?? setInternal;
  const [places, setPlaces] = useState<GeocodePlace[]>([]);
  const [status, setStatus] = useState<GeocodeStatus>("idle");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const centerRef = useRef(center);
  const chosenLabel = useRef<string | null>(null);
  const short = text.trim().length < MIN_QUERY_LENGTH;

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    const query = text.trim();
    if (query.length < MIN_QUERY_LENGTH || query === chosenLabel.current || query === skipSearchValue) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const here = centerRef.current;
      void searchPlaces({
        query,
        latitude: here.latitude,
        longitude: here.longitude,
        locale: i18n.language,
        signal: controller.signal,
      }).then((result) => {
        if (controller.signal.aborted || chosenLabel.current) return;
        setPlaces(result.places);
        setStatus(result.status);
        setHighlight(0);
        setOpen(true);
      }).catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        if (controller.signal.aborted || chosenLabel.current) return;
        setPlaces([]);
        setStatus("error");
        setOpen(true);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, i18n.language, skipSearchValue]);

  function changeText(next: string) {
    if (chosenLabel.current && next.trim() !== chosenLabel.current) chosenLabel.current = null;
    setText(next);
  }

  function choose(place: GeocodePlace) {
    chosenLabel.current = place.label;
    setText(place.label);
    setPlaces([]);
    setOpen(false);
    onSelect(place);
  }

  function onKeyPress(key: string | undefined) {
    if (!open) return;
    if (key === "ArrowDown" || key === "ArrowUp") {
      setHighlight((current) => moveHighlight(current, key, places.length));
    } else if (key === "Enter" && places[highlight]) {
      choose(places[highlight]);
    } else if (key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        accessibilityRole="combobox"
        accessibilityLabel={t("discover.searchLabel")}
        accessibilityState={{ expanded: open && !short }}
        value={text}
        onChangeText={changeText}
        placeholder={placeholder ?? t("discover.searchPlaceholder")}
        placeholderTextColor={theme.muted}
        onKeyPress={(event) => onKeyPress(event.nativeEvent.key)}
        onSubmitEditing={() => { if (places[highlight]) choose(places[highlight]); }}
        style={styles.input}
      />
      {open && !short ? (
        <View accessibilityRole="list" style={styles.results}>
          {status === "error" ? <Text accessibilityRole="alert" style={styles.message}>{t("discover.searchError")}</Text> : null}
          {status === "empty" ? <Text style={styles.message}>{t("discover.searchNoResults")}</Text> : null}
          {places.map((place, index) => (
            <Pressable
              key={place.id}
              accessibilityRole="button"
              accessibilityState={{ selected: index === highlight }}
              onPress={() => choose(place)}
              style={[styles.option, index === highlight && styles.optionActive]}
            >
              <Text style={styles.optionText}>{place.label}</Text>
            </Pressable>
          ))}
          <Text style={styles.attribution}>{t("discover.searchAttribution")}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: 180, zIndex: 5 },
  input: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "white",
    paddingHorizontal: 14,
    color: theme.ink,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E4E1EE",
  },
  results: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 6,
    ...theme.shadow,
    zIndex: 6,
  },
  option: { paddingHorizontal: 12, paddingVertical: 8 },
  optionActive: { backgroundColor: "#F4F2FB" },
  optionText: { color: theme.ink, fontSize: 14 },
  message: { color: theme.muted, fontSize: 13, paddingHorizontal: 12, paddingVertical: 8 },
  attribution: { color: theme.muted, fontSize: 11, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 },
});

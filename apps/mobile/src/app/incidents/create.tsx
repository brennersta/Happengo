import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { auth } from "@/auth";
import { fetchClient } from "@/api/client";
import { mocksEnabled } from "@/mocks/config";
import { AddressSearch } from "@/geocoding/AddressSearch";
import { Map } from "@/map/Map";
import { mapStyleUrl, TALLINN } from "@/map/config";
import type { LngLat, MapFocus } from "@/map/types";
import { theme } from "@/theme/theme";
import { GradientButton } from "@/theme/ui";
import type { components } from "@happengo/api-client";

type Category = components["schemas"]["IncidentCategory"];
const categories: Category[] = ["fire", "traffic_collision", "other"];

export default function CreateIncidentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<Category>("fire");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<LngLat | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [error, setError] = useState<"description" | "location" | "signIn" | "limit" | "save" | null>(null);
  const [saving, setSaving] = useState(false);
  const demo = mocksEnabled();

  async function submit() {
    setError(null);
    const cleanDescription = description.trim();
    if (!cleanDescription || cleanDescription.length > 500) { setError("description"); return; }
    if (!location || !address.trim()) { setError("location"); return; }
    const token = await auth.getAccessToken();
    if (!token && !demo) { setError("signIn"); return; }
    setSaving(true);
    try {
      const result = await fetchClient.POST("/v1/incidents", { body: {
        category,
        description: cleanDescription,
        address: address.trim(),
        longitude: location.longitude,
        latitude: location.latitude,
      } });
      if (result.error || !result.data) {
        setError(result.response.status === 429 ? "limit" : "save");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["discover-incidents"] });
      router.replace({ pathname: "/incidents/[id]" as never, params: { id: result.data.id } });
    } catch {
      setError("save");
    } finally {
      setSaving(false);
    }
  }

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ {t("eventDetail.back")}</Text></Pressable>
      <Text style={styles.heading}>{t("incidents.createTitle")}</Text>
      {demo ? <Text style={styles.demo}>{t("createEvent.demoNotice")}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.label}>{t("incidents.category")}</Text>
        <View style={styles.row}>{categories.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: category === item }} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categorySelected]}>
          <Text style={[styles.categoryText, category === item && styles.categoryTextSelected]}>{t(`incidents.categories.${item}`)}</Text>
        </Pressable>)}</View>
        <Text style={styles.label}>{t("incidents.description")}</Text>
        <TextInput value={description} onChangeText={setDescription} maxLength={500} multiline placeholder={t("incidents.descriptionPlaceholder")} style={[styles.input, styles.multiline]} />
        <Text style={styles.helper}>{t("incidents.descriptionCount", { count: description.length })}</Text>
        <Text style={styles.label}>{t("incidents.location")}</Text>
        <AddressSearch center={location ?? TALLINN} value={address} onChangeText={setAddress} onSelect={(place) => {
          setAddress(place.label);
          const next = { longitude: place.longitude, latitude: place.latitude };
          setLocation(next);
          setFocus({ ...next, key: Date.now() });
        }} />
        <Text style={styles.helper}>{t("incidents.mapHelp")}</Text>
        <View style={styles.map}><Map center={location ?? TALLINN} zoom={11} styleUrl={mapStyleUrl()} focus={focus} markers={location ? [{ id: "incident-draft", title: t(`incidents.categories.${category}`), coordinate: location, kind: "incident", incidentCategory: category }] : []} onMapPress={(next) => setLocation(next)} /></View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{t(`incidents.errors.${error}`)}</Text> : null}
        <GradientButton label={t("incidents.submit")} busy={saving} disabled={saving} onPress={() => void submit()} />
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.page },
  content: { padding: 20, gap: 14, width: "100%", maxWidth: 900, alignSelf: "center", paddingBottom: 40 },
  back: { color: theme.brand, fontSize: 15, fontWeight: "700" },
  heading: { color: theme.ink, fontSize: 28, fontWeight: "800" },
  demo: { color: "#624314", backgroundColor: "#fff4d6", borderRadius: 10, padding: 12, fontSize: 13 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 16, gap: 10, ...theme.shadow },
  label: { color: theme.ink, fontSize: 14, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: { borderWidth: 1, borderColor: "#fed7aa", backgroundColor: "#fff7ed", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18 },
  categorySelected: { backgroundColor: "#c2410c", borderColor: "#c2410c" },
  categoryText: { color: "#9a3412", fontWeight: "700" },
  categoryTextSelected: { color: "white" },
  input: { borderWidth: 1, borderColor: theme.line, borderRadius: 10, padding: 12, color: theme.ink, fontSize: 15 },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  helper: { color: theme.muted, fontSize: 12 },
  map: { height: 300, overflow: "hidden", borderRadius: 14 },
  error: { color: theme.danger, backgroundColor: "#fff0f0", borderRadius: 8, padding: 10, fontSize: 13 },
});

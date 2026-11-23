import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { auth } from "@/auth";
import { fetchClient } from "@/api/client";
import { mocksEnabled } from "@/mocks/config";
import { Map } from "@/map/Map";
import { mapStyleUrl, TALLINN } from "@/map/config";
import type { LngLat } from "@/map/types";
import {
  defaultLocalSlot,
  localTimeZone,
  validateCreateEventForm,
  type CreateEventFormValues,
} from "@/events/createEventForm";
import type { components } from "@happengo/api-client";
import { EVENT_TAGS, type EventTag } from "@/map/markerStyle";

type Visibility = components["schemas"]["EventVisibility"];
type ApprovalMode = components["schemas"]["ApprovalMode"];

export default function CreateEventScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const start = defaultLocalSlot(1);
  const end = defaultLocalSlot(3);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(start.date);
  const [startTime, setStartTime] = useState(start.time);
  const [endDate, setEndDate] = useState(end.date);
  const [endTime, setEndTime] = useState(end.time);
  const [timeZoneId, setTimeZoneId] = useState(localTimeZone());
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<LngLat | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("open");
  const [tags, setTags] = useState<EventTag[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<"signInRequired" | "createError" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isDemo = mocksEnabled();

  async function submit() {
    setValidationError(null);
    setSubmitError(null);
    if (!location) {
      setValidationError("location");
      return;
    }
    const values: CreateEventFormValues = {
      title,
      description,
      startDate,
      startTime,
      endDate,
      endTime,
      timeZoneId,
      address,
      location,
      visibility,
      approvalMode,
      tags,
    };
    const result = validateCreateEventForm(values);
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }

    const accessToken = await auth.getAccessToken();
    if (!accessToken && !isDemo) {
      setSubmitError("signInRequired");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await fetchClient.POST("/v1/events", { body: result.request });
      if (error || !data) {
        setSubmitError("createError");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["discover-events"] });
      await queryClient.invalidateQueries({ queryKey: ["my-events"] });
      router.replace({ pathname: "/events/[id]", params: { id: data.id } });
    } catch {
      setSubmitError("createError");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("createEvent.cancel")} onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.screenTitle}>{t("createEvent.title")}</Text>
        </View>
        <Text style={styles.subtitle}>{t("createEvent.subtitle")}</Text>

        {isDemo ? <Text accessibilityRole="text" style={styles.demoNotice}>{t("createEvent.demoNotice")}</Text> : null}

        <Field label={t("createEvent.titleLabel")} value={title} onChangeText={setTitle} maxLength={200} />
        <Field label={t("createEvent.descriptionLabel")} value={description} onChangeText={setDescription} multiline maxLength={4000} />

        <View style={styles.row}>
          <View style={styles.half}>
            <Field label={t("createEvent.startDate")} value={startDate} onChangeText={setStartDate} placeholder="2026-11-17" />
          </View>
          <View style={styles.half}>
            <Field label={t("createEvent.startTime")} value={startTime} onChangeText={setStartTime} placeholder="18:30" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <Field label={t("createEvent.endDate")} value={endDate} onChangeText={setEndDate} placeholder="2026-11-17" />
          </View>
          <View style={styles.half}>
            <Field label={t("createEvent.endTime")} value={endTime} onChangeText={setEndTime} placeholder="20:30" />
          </View>
        </View>
        <Field label={t("createEvent.timeZone")} value={timeZoneId} onChangeText={setTimeZoneId} autoCapitalize="none" editable={false} />
        <Field label={t("createEvent.address")} value={address} onChangeText={setAddress} maxLength={500} />

        <Text style={styles.label}>{t("createEvent.location")}</Text>
        <Text style={styles.helper}>{t("createEvent.locationHelp")}</Text>
        <View style={styles.map}>
          <Map
            center={location ?? TALLINN}
            zoom={location ? 14 : 11}
            styleUrl={mapStyleUrl()}
            markers={location ? [{ id: "draft-location", title: t("createEvent.location"), coordinate: location }] : []}
            onMapPress={setLocation}
          />
        </View>
        {location ? (
          <Text style={styles.coordinates}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text>
        ) : null}

        <Text style={styles.label}>{t("createEvent.tags")}</Text>
        <Text style={styles.helper}>{t("createEvent.tagsHelp")}</Text>
        <View style={styles.choiceRow}>
          {EVENT_TAGS.map((tag) => {
            const selected = tags.includes(tag);
            const main = tags[0] === tag;
            return (
              <Pressable key={tag} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}
                accessibilityLabel={main ? `${tag}, ${t("createEvent.mainType")}` : tag}
                onPress={() => setTags((current) => selected ? current.filter((item) => item !== tag) : [...current, tag])}
                style={[styles.choice, selected && styles.choiceSelected, main && styles.mainTagChoice]}>
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{tag}{main ? ` · ${t("createEvent.mainType")}` : ""}</Text>
              </Pressable>
            );
          })}
        </View>
        {validationError === "tags" ? <Text accessibilityRole="alert" style={styles.error}>{t("createEvent.errors.tags")}</Text> : null}

        <Text style={styles.label}>{t("createEvent.visibility")}</Text>
        <View style={styles.choiceRow}>
          <Choice label={t("createEvent.public")} selected={visibility === "public"} onPress={() => setVisibility("public")} />
          <Choice label={t("createEvent.unlisted")} selected={visibility === "unlisted"} onPress={() => setVisibility("unlisted")} />
          <Choice label={t("createEvent.friendsOnly")} selected={visibility === "friends_only"} onPress={() => setVisibility("friends_only")} />
        </View>

        <Text style={styles.label}>{t("createEvent.approval")}</Text>
        <View style={styles.choiceRow}>
          <Choice label={t("createEvent.open")} selected={approvalMode === "open"} onPress={() => setApprovalMode("open")} />
          <Choice label={t("createEvent.approvalRequired")} selected={approvalMode === "approval"} onPress={() => setApprovalMode("approval")} />
        </View>

        {validationError && validationError !== "tags" ? <Text accessibilityRole="alert" style={styles.error}>{t(`createEvent.errors.${validationError}`)}</Text> : null}
        {submitError ? <Text accessibilityRole="alert" style={styles.error}>{t(`createEvent.${submitError}`)}</Text> : null}
        {submitError === "signInRequired" ? (
          <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/profile")} style={styles.signInLink}>
            <Text style={styles.signInLinkText}>{t("auth.goToSignIn")}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => void submit()}
          style={[styles.submitButton, submitting && styles.disabled]}
        >
          {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>{t("createEvent.submit")}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences";
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        accessibilityLabel={props.label}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        multiline={props.multiline}
        maxLength={props.maxLength}
        autoCapitalize={props.autoCapitalize ?? "sentences"}
        editable={props.editable ?? true}
        style={[styles.input, props.multiline && styles.multiline]}
      />
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#f7f7fb" },
  content: { padding: 18, paddingBottom: 40, gap: 12, maxWidth: 760, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  backText: { color: "#312e81", fontSize: 28, lineHeight: 32 },
  screenTitle: { color: "#202038", fontSize: 23, fontWeight: "700" },
  subtitle: { color: "#66667b", fontSize: 14, lineHeight: 20, marginBottom: 4 },
  demoNotice: { color: "#624314", backgroundColor: "#fff4d6", borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 19 },
  field: { gap: 6, flex: 1 },
  label: { color: "#34344b", fontSize: 13, fontWeight: "600", marginTop: 4 },
  input: { backgroundColor: "white", borderColor: "#dedee9", borderWidth: 1, borderRadius: 10, minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, color: "#202038", fontSize: 15 },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  helper: { color: "#737389", fontSize: 12, marginTop: -7 },
  map: { height: 240, overflow: "hidden", borderRadius: 14, backgroundColor: "#e6e6ec" },
  coordinates: { color: "#66667b", fontSize: 12, fontVariant: ["tabular-nums"] },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderWidth: 1, borderColor: "#d7d7e2", borderRadius: 20, backgroundColor: "white", paddingHorizontal: 13, paddingVertical: 9 },
  choiceSelected: { borderColor: "#5b5bd6", backgroundColor: "#eeeeff" },
  mainTagChoice: { borderWidth: 2 },
  choiceText: { color: "#55556a", fontSize: 13, fontWeight: "500" },
  choiceTextSelected: { color: "#3730a3", fontWeight: "700" },
  error: { color: "#a33333", backgroundColor: "#fff0f0", borderRadius: 8, padding: 10, fontSize: 13, lineHeight: 18 },
  signInLink: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4 },
  signInLinkText: { color: "#3730a3", fontSize: 14, fontWeight: "700" },
  submitButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#5b5bd6", marginTop: 4 },
  submitText: { color: "white", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});

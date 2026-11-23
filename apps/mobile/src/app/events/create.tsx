import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { auth } from "@/auth";
import { fetchClient } from "@/api/client";
import { mocksEnabled } from "@/mocks/config";
import { AddressSearch } from "@/geocoding/AddressSearch";
import { Map } from "@/map/Map";
import { mapStyleUrl, TALLINN } from "@/map/config";
import type { LngLat, MapFocus } from "@/map/types";
import { defaultLocalSlot, localTimeZone, validateCreateEventForm, type CreateEventFormValues } from "@/events/createEventForm";
import { addMinutes, DURATION_PRESETS, startNowSlot } from "@/events/whenPreset";
import type { components } from "@happengo/api-client";
import { EVENT_TAGS, type EventTag } from "@/map/markerStyle";
import { theme, wideLayoutWidth } from "@/theme/theme";
import { Chip, GradientButton, GradientHeader } from "@/theme/ui";

type Visibility = components["schemas"]["EventVisibility"];
type ApprovalMode = components["schemas"]["ApprovalMode"];

export default function CreateEventScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const wide = width >= wideLayoutWidth;
  const start = defaultLocalSlot(1);
  const end = defaultLocalSlot(3);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(start.date);
  const [startTime, setStartTime] = useState(start.time);
  const [endDate, setEndDate] = useState(end.date);
  const [endTime, setEndTime] = useState(end.time);
  const [timeZoneId] = useState(localTimeZone());
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<LngLat | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("open");
  const [tags, setTags] = useState<EventTag[]>([]);
  const [whenOpen, setWhenOpen] = useState(false);
  const [startNow, setStartNow] = useState(false);
  const [duration, setDuration] = useState<number>(60);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<"signInRequired" | "createError" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isDemo = mocksEnabled();

  function applyWhen(nextStartNow: boolean, minutes: number) {
    const slot = nextStartNow ? startNowSlot() : { date: startDate, time: startTime };
    const nextEnd = addMinutes(slot, minutes);
    if (!nextEnd) return;
    setStartNow(nextStartNow);
    setDuration(minutes);
    setStartDate(slot.date);
    setStartTime(slot.time);
    setEndDate(nextEnd.date);
    setEndTime(nextEnd.time);
    setWhenOpen(false);
  }

  async function submit() {
    setValidationError(null);
    setSubmitError(null);
    if (!location) {
      setValidationError("location");
      return;
    }
    const values: CreateEventFormValues = {
      title, description, startDate, startTime, endDate, endTime, timeZoneId, address, location, visibility, approvalMode, tags,
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

  const whenLabel = startNow
    ? `${t("createEvent.startNow")} · ${durationLabel(t, duration)}`
    : `${startDate} ${startTime} – ${endDate} ${endTime}`;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ {t("eventDetail.back")}</Text>
        </Pressable>
        <Text style={styles.heading}>{t("createEvent.heading")}</Text>
        {isDemo ? <Text style={styles.demoNotice}>{t("createEvent.demoNotice")}</Text> : null}
        <View style={[styles.columns, wide && styles.columnsWide]}>
          <View style={styles.card}>
            <Field label={t("createEvent.titleLabel")} value={title} onChangeText={setTitle} maxLength={200} />
            <Field label={t("createEvent.descriptionLabel")} value={description} onChangeText={setDescription} multiline maxLength={4000} />
            <Text style={styles.label}>{t("createEvent.when")}</Text>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: whenOpen }} onPress={() => setWhenOpen(true)} style={styles.input}>
              <Text style={styles.inputText}>{whenLabel}</Text>
            </Pressable>
            <Text style={styles.helper}>{t("createEvent.whenHelp")}</Text>
            <Text style={styles.label}>{t("createEvent.tags")}</Text>
            <Text style={styles.helper}>{t("createEvent.tagsHelp")}</Text>
            <View style={styles.chips}>
              {EVENT_TAGS.map((tag) => {
                const selected = tags.includes(tag);
                const label = t(`tags.${tag}`);
                return (
                  <Chip
                    key={tag}
                    label={selected && tags[0] === tag ? `${label} · ${t("createEvent.mainType")}` : label}
                    selected={selected}
                    onPress={() => setTags((current) => selected ? current.filter((item) => item !== tag) : [...current, tag])}
                  />
                );
              })}
            </View>
            {validationError === "tags" ? <Text accessibilityRole="alert" style={styles.error}>{t("createEvent.errors.tags")}</Text> : null}
            <View style={[styles.columns, wide && styles.selects]}>
              <SelectField
                label={t("createEvent.visibility")}
                value={t(`createEvent.${visibility === "friends_only" ? "friendsOnly" : visibility}`)}
                helper={t(`createEvent.visibilityHelp.${visibility}`)}
                options={[
                  ["public", t("createEvent.public")],
                  ["unlisted", t("createEvent.unlisted")],
                  ["friends_only", t("createEvent.friendsOnly")],
                ]}
                onChange={(value) => setVisibility(value as Visibility)}
              />
              <SelectField
                label={t("createEvent.approval")}
                value={t(approvalMode === "open" ? "createEvent.open" : "createEvent.approvalRequired")}
                helper={t(`createEvent.approvalHelp.${approvalMode}`)}
                options={[
                  ["open", t("createEvent.open")],
                  ["approval", t("createEvent.approvalRequired")],
                ]}
                onChange={(value) => setApprovalMode(value as ApprovalMode)}
              />
            </View>
            {validationError && validationError !== "tags" ? <Text accessibilityRole="alert" style={styles.error}>{t(`createEvent.errors.${validationError}`)}</Text> : null}
            {submitError ? <Text accessibilityRole="alert" style={styles.error}>{t(`createEvent.${submitError}`)}</Text> : null}
            <GradientButton label={t("createEvent.submit")} onPress={() => void submit()} busy={submitting} />
          </View>
          <View style={styles.card}>
            <GradientHeader>
              <Text style={styles.locationTitle}>{t("createEvent.locationTitle")}</Text>
              <Text style={styles.locationHelp}>{t("createEvent.locationTap")}</Text>
            </GradientHeader>
            <View style={styles.locationBody}>
              <AddressSearch
                center={location ?? TALLINN}
                value={address}
                onChangeText={setAddress}
                onSelect={(place) => {
                  setAddress(place.label);
                  setLocation({ longitude: place.longitude, latitude: place.latitude });
                  setFocus({ longitude: place.longitude, latitude: place.latitude, key: Date.now() });
                }}
              />
              <View style={styles.map}>
                <Map
                  center={TALLINN}
                  zoom={11}
                  focus={focus}
                  styleUrl={mapStyleUrl()}
                  markers={location ? [{ id: "draft-location", title: address || t("createEvent.location"), coordinate: location }] : []}
                  onMapPress={setLocation}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      {whenOpen ? (
        <View style={styles.modalScrim}>
          <View accessibilityViewIsModal style={styles.modal}>
            <Text style={styles.modalTitle}>{t("createEvent.selectWhen")}</Text>
            <View style={styles.modeRow}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: !startNow }} onPress={() => setStartNow(false)} style={[styles.mode, !startNow && styles.modeOn]}>
                <Text style={[styles.modeText, !startNow && styles.modeTextOn]}>{t("createEvent.scheduleLater")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: startNow }} onPress={() => setStartNow(true)} style={[styles.mode, startNow && styles.modeOn]}>
                <Text style={[styles.modeText, startNow && styles.modeTextOn]}>{t("createEvent.startNow")}</Text>
              </Pressable>
            </View>
            {startNow ? <Text style={styles.helper}>{t("createEvent.startNowHelp")}</Text> : (
              <View style={styles.whenFields}>
                <Field label={t("createEvent.startDate")} value={startDate} onChangeText={setStartDate} />
                <Field label={t("createEvent.startTime")} value={startTime} onChangeText={setStartTime} />
                <Field label={t("createEvent.endDate")} value={endDate} onChangeText={setEndDate} />
                <Field label={t("createEvent.endTime")} value={endTime} onChangeText={setEndTime} />
              </View>
            )}
            <Text style={styles.label}>{t("createEvent.duration")}</Text>
            <View style={styles.chips}>
              {DURATION_PRESETS.map((minutes) => (
                <Chip key={minutes} label={durationLabel(t, minutes)} selected={duration === minutes} onPress={() => setDuration(minutes)} />
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setWhenOpen(false)}><Text style={styles.clear}>{t("createEvent.cancel")}</Text></Pressable>
              <GradientButton label={t("createEvent.applyWhen")} onPress={() => applyWhen(startNow, duration)} />
            </View>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function durationLabel(t: (key: string) => string, minutes: number): string {
  if (minutes === 30) return t("createEvent.minutes30");
  if (minutes === 60) return t("createEvent.hour1");
  if (minutes === 120) return t("createEvent.hours2");
  return t("createEvent.hours4");
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; maxLength?: number }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        accessibilityLabel={props.label}
        value={props.value}
        onChangeText={props.onChangeText}
        multiline={props.multiline}
        maxLength={props.maxLength}
        style={[styles.input, props.multiline && styles.multiline]}
      />
    </View>
  );
}

function SelectField({ label, value, helper, options, onChange }: {
  label: string;
  value: string;
  helper: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={label} onPress={() => setOpen((current) => !current)} style={styles.input}>
        <Text style={styles.inputText}>{value}</Text>
      </Pressable>
      {open ? options.map(([id, text]) => (
        <Pressable key={id} accessibilityRole="button" onPress={() => { onChange(id); setOpen(false); }} style={styles.option}>
          <Text style={styles.inputText}>{text}</Text>
        </Pressable>
      )) : null}
      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.page },
  content: { padding: 20, paddingBottom: 48, gap: 14, width: "100%", maxWidth: 1100, alignSelf: "center" },
  back: { alignSelf: "flex-start" },
  backText: { color: theme.brand, fontSize: 15, fontWeight: "700" },
  heading: { color: theme.brand, fontSize: 32, fontWeight: "800" },
  demoNotice: { color: "#624314", backgroundColor: "#fff4d6", borderRadius: 10, padding: 12, fontSize: 13 },
  columns: { gap: 16 },
  columnsWide: { flexDirection: "row", alignItems: "flex-start" },
  selects: { flexDirection: "row" },
  card: { flex: 1, backgroundColor: "white", borderRadius: 18, padding: 16, gap: 8, ...theme.shadow },
  field: { gap: 6, flex: 1 },
  label: { color: theme.ink, fontSize: 13, fontWeight: "700" },
  helper: { color: theme.muted, fontSize: 12 },
  input: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: theme.line, backgroundColor: "white", paddingHorizontal: 12, justifyContent: "center", color: theme.ink, fontSize: 15 },
  inputText: { color: theme.ink, fontSize: 15 },
  multiline: { minHeight: 90, textAlignVertical: "top", paddingTop: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  locationTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  locationHelp: { color: "white", fontSize: 13, marginTop: 4 },
  locationBody: { gap: 12, marginTop: 12 },
  map: { height: 280, borderRadius: 14, overflow: "hidden" },
  error: { color: theme.danger, backgroundColor: "#fff0f0", borderRadius: 8, padding: 10, fontSize: 13 },
  modalScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(31,27,46,0.35)", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { width: "100%", maxWidth: 460, backgroundColor: "white", borderRadius: 18, padding: 16, gap: 12, ...theme.shadow },
  modalTitle: { color: theme.ink, fontSize: 18, fontWeight: "700" },
  modeRow: { flexDirection: "row", gap: 8 },
  mode: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.chip },
  modeOn: { backgroundColor: theme.brand },
  modeText: { color: theme.chipText, fontWeight: "700" },
  modeTextOn: { color: "white" },
  whenFields: { gap: 8 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clear: { color: theme.brand, fontWeight: "700" },
  option: { paddingVertical: 8, paddingHorizontal: 8 },
});

import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { auth } from "@/auth";
import { fetchClient } from "@/api/client";
import { mocksEnabled } from "@/mocks/config";
import { AddressSearch } from "@/geocoding/AddressSearch";
import { reverseGeocode } from "@/geocoding/photon";
import { Map } from "@/map/Map";
import { mapStyleUrl, TALLINN } from "@/map/config";
import { requestDeviceLocation } from "@/map/deviceLocation";
import type { LngLat, MapFocus } from "@/map/types";
import { defaultLocalSlot, eventDateTimeFields, localTimeZone, validateCreateEventForm, type CreateEventFormValues } from "@/events/createEventForm";
import { uniqueFriendTags } from "@/friends/friendTags";
import { addMinutes, DURATION_PRESETS, startNowSlot } from "@/events/whenPreset";
import type { components } from "@happengo/api-client";
import { EVENT_TAGS, type EventTag } from "@/map/markerStyle";
import { theme, wideLayoutWidth } from "@/theme/theme";
import { Chip, GradientButton, GradientHeader } from "@/theme/ui";

type Visibility = components["schemas"]["EventVisibility"];
type ApprovalMode = components["schemas"]["ApprovalMode"];

export default function CreateEventScreen() {
  const { t } = useTranslation();
  const { id: eventId } = useLocalSearchParams<{ id?: string }>();
  const editEventQuery = useQuery({
    queryKey: ["event", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const { data, error, response } = await fetchClient.GET("/v1/events/{id}", { params: { path: { id: eventId! } } });
      if (error || !data) throw new Error(response.statusText || t("eventDetail.notFound"));
      return data;
    },
  });

  if (eventId && editEventQuery.isLoading) return <EditEventStatus message={t("createEvent.loadingEvent")} />;
  if (eventId && (editEventQuery.isError || !editEventQuery.data)) return <EditEventStatus message={t("eventDetail.notFound")} />;
  const event = eventId ? editEventQuery.data : null;
  if (event && (!eventDateTimeFields(event.startAt, event.timeZoneId) || !eventDateTimeFields(event.endAt, event.timeZoneId))) {
    return <EditEventStatus message={t("createEvent.createError")} />;
  }
  return <CreateEventForm key={event?.id ?? "new-event"} event={event ?? null} />;
}

function EditEventStatus({ message }: { message: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.fill}>
      <View style={styles.statusContent}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ {t("eventDetail.back")}</Text>
        </Pressable>
        <Text accessibilityRole="alert" style={styles.helper}>{message}</Text>
      </View>
    </View>
  );
}

function CreateEventForm({ event }: { event: components["schemas"]["EventResponse"] | null }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const editing = event !== null;
  const eventId = event?.id;
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const wide = width >= wideLayoutWidth;
  const start = event ? eventDateTimeFields(event.startAt, event.timeZoneId) ?? defaultLocalSlot(1) : defaultLocalSlot(1);
  const end = event ? eventDateTimeFields(event.endAt, event.timeZoneId) ?? defaultLocalSlot(3) : defaultLocalSlot(3);
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startDate, setStartDate] = useState(start.date);
  const [startTime, setStartTime] = useState(start.time);
  const [endDate, setEndDate] = useState(end.date);
  const [endTime, setEndTime] = useState(end.time);
  const [timeZoneId] = useState(() => event?.timeZoneId ?? localTimeZone());
  const [address, setAddress] = useState(event?.address ?? "");
  const [skipAddressSearch, setSkipAddressSearch] = useState<string | null>(null);
  const [location, setLocation] = useState<LngLat | null>(event ? { longitude: event.longitude, latitude: event.latitude } : null);
  const [focus, setFocus] = useState<MapFocus | null>(event ? { longitude: event.longitude, latitude: event.latitude, key: 0 } : null);
  const [locatingLocation, setLocatingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState<"denied" | "resolving" | null>(null);
  const locationSequence = useRef(0);
  const [visibility, setVisibility] = useState<Visibility>(event?.visibility ?? "public");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(event?.approvalMode ?? "open");
  const [tags, setTags] = useState<EventTag[]>((event?.tags ?? []) as EventTag[]);
  const [invitedFriendTags, setInvitedFriendTags] = useState<string[]>(event?.invitedFriendTags ?? []);
  const [whenOpen, setWhenOpen] = useState(false);
  const [startNow, setStartNow] = useState(false);
  const [duration, setDuration] = useState<number>(60);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<"signInRequired" | "createError" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isDemo = mocksEnabled();
  const friendsQuery = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const { data, error } = await fetchClient.GET("/v1/friends");
      if (error || !data) throw new Error(t("friends.loadError"));
      return data;
    },
  });
  const friendTags = uniqueFriendTags(friendsQuery.data ?? []);

  async function chooseMapLocation(next: LngLat) {
    const sequence = ++locationSequence.current;
    setLocation(next);
    setAddress("");
    setFocus({ ...next, key: Date.now() });
    setLocationNotice("resolving");
    try {
      const label = await reverseGeocode({ latitude: next.latitude, longitude: next.longitude, locale: i18n.language });
      if (locationSequence.current !== sequence) return;
      const addressLabel = label ?? `${next.latitude.toFixed(5)}, ${next.longitude.toFixed(5)}`;
      setAddress(addressLabel);
      setSkipAddressSearch(addressLabel);
    } finally {
      if (locationSequence.current === sequence) setLocationNotice(null);
    }
  }

  async function locateDevice() {
    setLocatingLocation(true);
    setLocationNotice(null);
    try {
      const current = await requestDeviceLocation();
      if (!current) {
        setLocationNotice("denied");
        return;
      }
      await chooseMapLocation(current);
    } catch {
      setLocationNotice("denied");
    } finally {
      setLocatingLocation(false);
    }
  }

  function applyWhen(nextStartNow: boolean, minutes: number) {
    const slot = nextStartNow
      ? eventDateTimeFields(new Date(Date.now() + 60 * 60_000).toISOString(), timeZoneId) ?? startNowSlot()
      : { date: startDate, time: startTime };
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
      invitedFriendTags: visibility === "friends_only" ? invitedFriendTags : undefined,
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
      const { data, error } = editing
        ? await fetchClient.PATCH("/v1/events/{eventId}", {
          params: { path: { eventId: eventId! } },
          body: {
            title: result.request.title,
            description: result.request.description,
            startAt: result.request.startAt,
            endAt: result.request.endAt,
            timeZoneId: result.request.timeZoneId,
            address: result.request.address,
            longitude: result.request.longitude,
            latitude: result.request.latitude,
            tags: result.request.tags,
            ...(result.request.invitedFriendTags !== undefined ? { invitedFriendTags: result.request.invitedFriendTags } : {}),
          },
        })
        : await fetchClient.POST("/v1/events", { body: result.request });
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
        <Text style={styles.heading}>{t(editing ? "createEvent.editHeading" : "createEvent.heading")}</Text>
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
            <Text style={styles.helper}>{t("createEvent.localTimeZoneHelp")}</Text>
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
            {!editing ? <View style={[styles.columns, wide && styles.selects]}>
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
            </View> : <Text style={styles.helper}>{t("createEvent.visibilityApprovalLocked")}</Text>}
            {visibility === "friends_only" ? (
              <View style={styles.inviteTags}>
                <Text style={styles.label}>{t("createEvent.inviteByTag")}</Text>
                <Text style={styles.helper}>{t("createEvent.inviteByTagHelp")}</Text>
                {friendTags.length === 0 ? <Text style={styles.helper}>{t("createEvent.noFriendTags")}</Text> : (
                  <View style={styles.chips}>
                    {friendTags.map((tag) => {
                      const selected = invitedFriendTags.includes(tag);
                      return (
                        <Chip
                          key={tag}
                          label={tag}
                          selected={selected}
                          onPress={() => setInvitedFriendTags((current) => selected ? current.filter((item) => item !== tag) : [...current, tag])}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}
            {validationError && validationError !== "tags" ? <Text accessibilityRole="alert" style={styles.error}>{t(`createEvent.errors.${validationError}`)}</Text> : null}
            {submitError ? <Text accessibilityRole="alert" style={styles.error}>{t(`createEvent.${submitError}`)}</Text> : null}
            <GradientButton
              label={t(editing ? "createEvent.saveChanges" : "createEvent.submit")}
              onPress={() => void submit()}
              busy={submitting}
              disabled={submitting}
            />
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
                skipSearchValue={skipAddressSearch ?? undefined}
                onChangeText={(value) => {
                  locationSequence.current++;
                  setLocationNotice(null);
                  setAddress(value);
                  setSkipAddressSearch(null);
                  setLocation(null);
                }}
                onSelect={(place) => {
                  locationSequence.current++;
                  setAddress(place.label);
                  setSkipAddressSearch(place.label);
                  const next = { longitude: place.longitude, latitude: place.latitude };
                  setLocation(next);
                  setFocus({ ...next, key: Date.now() });
                  setLocationNotice(null);
                }}
              />
              <Pressable accessibilityRole="button" disabled={locatingLocation} onPress={() => void locateDevice()} style={styles.locationButton}>
                <Text style={styles.locationButtonText}>{locatingLocation ? t("createEvent.locating") : t("createEvent.useCurrentLocation")}</Text>
              </Pressable>
              {locationNotice ? <Text accessibilityLiveRegion="polite" style={locationNotice === "denied" ? styles.locationNoticeError : styles.helper}>{t(`createEvent.locationStatus.${locationNotice}`)}</Text> : null}
              <View style={styles.map}>
                <Map
                  center={TALLINN}
                  zoom={11}
                  focus={focus}
                  styleUrl={mapStyleUrl()}
                  markers={location ? [{ id: "draft-location", title: address || t("createEvent.location"), coordinate: location }] : []}
                  onMapPress={(next) => void chooseMapLocation(next)}
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
    <View style={[styles.field, open && styles.dropdownFieldOpen]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dropdownAnchor}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={label} onPress={() => setOpen((current) => !current)} style={[styles.input, styles.selectInput]}>
          <Text style={styles.inputText}>{value}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={theme.muted} />
        </Pressable>
        {open ? (
          <View style={styles.optionsMenu}>
            {options.map(([id, text]) => (
              <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: text === value }} onPress={() => { onChange(id); setOpen(false); }} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
                <Text style={styles.inputText}>{text}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inviteTags: { gap: 8 },
  fill: { flex: 1, backgroundColor: theme.page },
  content: { padding: 20, paddingBottom: 48, gap: 14, width: "100%", maxWidth: 1100, alignSelf: "center" },
  statusContent: { padding: 20, gap: 16 },
  back: { alignSelf: "flex-start" },
  backText: { color: theme.brand, fontSize: 15, fontWeight: "700" },
  heading: { color: theme.brand, fontSize: 32, fontWeight: "800" },
  demoNotice: { color: "#624314", backgroundColor: "#fff4d6", borderRadius: 10, padding: 12, fontSize: 13 },
  columns: { gap: 16 },
  columnsWide: { flexDirection: "row", alignItems: "flex-start" },
  selects: { flexDirection: "row" },
  card: { flex: 1, backgroundColor: "white", borderRadius: 18, padding: 16, gap: 8, ...theme.shadow },
  field: { gap: 6, flex: 1 },
  dropdownFieldOpen: { zIndex: 12, elevation: 12 },
  label: { color: theme.ink, fontSize: 13, fontWeight: "700" },
  helper: { color: theme.muted, fontSize: 12 },
  input: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: theme.line, backgroundColor: "white", paddingHorizontal: 12, justifyContent: "center", color: theme.ink, fontSize: 15 },
  inputText: { color: theme.ink, fontSize: 15 },
  dropdownAnchor: { position: "relative" },
  selectInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionsMenu: { position: "absolute", top: 48, right: 0, left: 0, zIndex: 12, borderWidth: 1, borderColor: theme.line, borderRadius: 10, backgroundColor: "white", ...theme.shadow },
  option: { minHeight: 42, justifyContent: "center", paddingHorizontal: 12, backgroundColor: "white" },
  optionPressed: { backgroundColor: theme.chip },
  multiline: { minHeight: 90, textAlignVertical: "top", paddingTop: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  locationTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  locationHelp: { color: "white", fontSize: 13, marginTop: 4 },
  locationBody: { gap: 12, marginTop: 12 },
  locationButton: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center", paddingHorizontal: 13, borderRadius: 20, backgroundColor: "#f4f2fb", borderWidth: 1, borderColor: theme.line },
  locationButtonText: { color: theme.brand, fontSize: 13, fontWeight: "700" },
  locationNoticeError: { color: theme.danger, fontSize: 12 },
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
});

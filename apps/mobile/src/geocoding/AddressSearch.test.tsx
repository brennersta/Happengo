import "@/i18n";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Text, TextInput } from "react-native";
import { AddressSearch } from "./AddressSearch";
import { searchPlaces, type GeocodePlace } from "./photon";

jest.mock("./photon", () => {
  const actual = jest.requireActual<typeof import("./photon")>("./photon");
  return { ...actual, searchPlaces: jest.fn() };
});

const search = searchPlaces as jest.MockedFunction<typeof searchPlaces>;
const place: GeocodePlace = {
  id: "R:1:0",
  label: "Santa Luzia, Minas Gerais, Brazil",
  longitude: -43.85,
  latitude: -16.07,
};

test("a pick followed by a centre change sends no request and leaves the list closed", async () => {
  jest.useFakeTimers();
  search.mockResolvedValue({ status: "ok", places: [place] });
  let renderer!: ReactTestRenderer;
  const onSelect = jest.fn();
  await act(async () => {
    renderer = create(<AddressSearch center={{ latitude: 59.437, longitude: 24.7536 }} onSelect={onSelect} />);
  });

  await act(async () => {
    renderer.root.findByType(TextInput).props.onChangeText("santa");
  });
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
  expect(search).toHaveBeenCalledTimes(1);

  await act(async () => {
    let node = renderer.root.findAllByType(Text).find((item) => item.props.children === place.label) ?? null;
    while (node && typeof node.props?.onPress !== "function") node = node.parent;
    node?.props.onPress();
  });
  expect(onSelect).toHaveBeenCalledWith(place);
  expect(renderer.root.findAllByProps({ accessibilityRole: "list" })).toHaveLength(0);

  await act(async () => {
    renderer.update(<AddressSearch center={{ latitude: -16.07, longitude: -43.85 }} onSelect={onSelect} />);
    jest.advanceTimersByTime(300);
  });
  expect(search).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByProps({ accessibilityRole: "list" })).toHaveLength(0);
  jest.useRealTimers();
});

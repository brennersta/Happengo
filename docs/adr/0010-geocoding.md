# 0010. Geocoding

- Status: Accepted
- Date: 2026-11-23

## Context

Discover needs an address search so a person can move the map to a street, neighborhood, or city. Create event needs the same lookup to fill the address and the event pin. [ADR 0006](0006-geo-queries.md) left the provider open and allowed the adapter to live in the API or the client.

Nominatim's usage policy disallows autocomplete. MapTiler's free tier needs an account and a key. Brenner chose Photon, Komoot's public OpenStreetMap geocoder, on 2026-11-23. It needs no account and no key.

## Decision

The app calls Photon directly. There is no geocoding endpoint on the API. The default base URL is `https://photon.komoot.io`. `EXPO_PUBLIC_GEOCODER_URL` replaces it, including with a self-hosted Photon, and the vendor URL stays inside `src/geocoding`.

Queries go to that third party. The client is a fair-use caller: at least 3 characters, about 300 ms of debounce, stale requests are cancelled, at most 5 results, results are biased with the current map centre (`lat` and `lon`), and `lang` is sent only for `de`, `en`, and `fr`. Portuguese is not sent. The request carries no user identifier and no credentials. Suggestions show the name with region and country so similar places stay distinct. The attribution "Search by Photon, data © OpenStreetMap contributors" is shown next to the results in both languages.

On Discover, choosing a result moves the map. The viewport query then loads events. No search pin is added and no event is changed. On create, the same lookup fills the address and moves the event pin, because that screen is choosing the event location.

## Consequences

- The public demo can search without the API. A self-hosted Photon is a configuration change.
- Photon sees the query and the map centre. It does not see an account id.
- Reverse geocoding of a map tap is still open. A tap sets the coordinate; the typed address is what the event stores.
- The seven-day duration cap is unchanged. "Start now" is one minute ahead so it still passes the future-start rule.

## Alternatives considered

- Nominatim. Its usage policy disallows autocomplete.
- MapTiler's free geocoder. It needs an account and a key.

import { detailFacts } from "./detailFacts";

test("the host row appears only for the owner, because no other host name exists", () => {
  expect(detailFacts({ isOwner: false })).toEqual(["when", "where", "attendees", "access"]);
  expect(detailFacts({ isOwner: true })).toEqual(["when", "where", "host", "attendees", "access"]);
});

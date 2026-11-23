import { friendInviteUrl, normalizeFriendTags, uniqueFriendTags } from "./friendTags";

test("normalizes friend tags the same way the server compares them", () => {
  expect(normalizeFriendTags(["  Close   Friends ", "close friends", "Family"])).toEqual(["Close Friends", "Family"]);
  expect(normalizeFriendTags([new Array(31).fill("a").join(""), "Ok"])).toEqual(["Ok"]);
  expect(normalizeFriendTags(Array.from({ length: 25 }, (_, index) => `tag ${index}`))).toHaveLength(20);
});

test("builds an invite url without putting a user id in the path", () => {
  expect(friendInviteUrl("https://brennersta.github.io/Happengo/", "/friends/accept/EREREREREREREREREREREQ"))
    .toBe("https://brennersta.github.io/Happengo/friends/accept/EREREREREREREREREREREQ");
});

test("collects the tags a person has already used", () => {
  expect(uniqueFriendTags([{ tags: ["Family", "Close"] }, { tags: ["family", "Music"] }])).toEqual(["Family", "Close", "Music"]);
});

# Review 0018: Housekeeping

## Decisions

- Keep the current seven-day maximum event length.
- The friend list exposes display names and private tags, but no email addresses or other profile fields.
- Unfriending removes the friendship and the private tags set by both people for one another.
- Dependabot checks each configured ecosystem monthly, groups all ecosystem updates with `patterns: ["*"]`, and keeps at most two open update pull requests per ecosystem.

## Implementation

- Group GitHub Actions, npm, NuGet, and the Terraform roots/modules into one update configuration per ecosystem.
- Add a friend-list privacy regression test and verify unfriend removes both directions of friend tags.

## Validation

- `dotnet build Happengo.sln --disable-build-servers` — passed, 0 warnings and 0 errors.
- `dotnet format Happengo.sln --verify-no-changes --no-restore --include src/Happengo.Api/Friends/FriendRoutes.cs tests/Happengo.Api.Tests/Friends/FriendInviteTests.cs` — passed.
- `dotnet test tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --filter FullyQualifiedName~OpenApiDriftTests --disable-build-servers` — passed, 3 tests.

namespace Happengo.Api.Tests.Support;

/// <summary>
/// Base for tests that boot <see cref="ApiFactory"/> or PostGIS.
/// New database tests should extend this so they stay in the shared collection
/// and keep <c>Category=Integration</c>. The fixture is still injected into the
/// derived constructor.
/// </summary>
[Collection(ApiCollection.Name)]
[Trait("Category", "Integration")]
public abstract class IntegrationTest;

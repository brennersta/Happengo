using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace Happengo.Api.Tests.Architecture;

public sealed class FeatureBoundaryTests
{
    [Fact]
    public void Features_do_not_depend_on_another_features_non_public_types()
    {
        var failures = FeatureBoundaries.FindViolations(typeof(Program).Assembly);
        Assert.True(failures.Count == 0, string.Join(Environment.NewLine, failures));
    }

    [Fact]
    public void Boundary_rule_fails_when_a_feature_uses_another_features_internal_type()
    {
        var failures = FeatureBoundaries.FindViolations(typeof(Friends.Probe.BoundaryProbeViolation).Assembly);
        Assert.Contains(
            failures,
            failure => failure.Contains(nameof(Friends.Probe.BoundaryProbeViolation), StringComparison.Ordinal));
    }
}

internal static class FeatureBoundaries
{
    private static readonly string[] Features =
    [
        "Happengo.Api.Events",
        "Happengo.Api.Attendance",
        "Happengo.Api.Friends",
        "Happengo.Api.Media",
        "Happengo.Api.Identity",
    ];

    public static IReadOnlyList<string> FindViolations(System.Reflection.Assembly assembly)
    {
        var architecture = new ArchLoader().LoadAssemblies(assembly).Build();
        var failures = new List<string>();

        foreach (var source in Features)
        {
            foreach (var target in Features)
            {
                if (source == target)
                {
                    continue;
                }

                IArchRule rule = Types()
                    .That()
                    .ResideInNamespaceMatching($"^{source}($|\\.)")
                    .Should()
                    .NotDependOnAny(
                        Types()
                            .That()
                            .ResideInNamespaceMatching($"^{target}($|\\.)")
                            .And()
                            .AreNotPublic());

                foreach (var result in rule.Evaluate(architecture).Where(result => !result.Passed))
                {
                    failures.Add($"{source} -> {target}: {result.Description}");
                }
            }
        }

        return failures;
    }
}

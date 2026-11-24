using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace Happengo.Api.Tests.Architecture;

public sealed class FeatureBoundaryTests
{
    [Fact]
    public void Incidents_and_events_do_not_reference_each_other()
    {
        var failures = FeatureBoundaries.FindViolations(typeof(Program).Assembly);
        Assert.DoesNotContain(failures, failure =>
            failure.StartsWith("Happengo.Api.Incidents -> Happengo.Api.Events", StringComparison.Ordinal)
            || failure.StartsWith("Happengo.Api.Events -> Happengo.Api.Incidents", StringComparison.Ordinal));
    }

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
        "Happengo.Api.Incidents",
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

        AddNoDependency("Happengo.Api.Incidents", "Happengo.Api.Events");
        AddNoDependency("Happengo.Api.Events", "Happengo.Api.Incidents");

        return failures;

        void AddNoDependency(string source, string target)
        {
            IArchRule rule = Types()
                .That()
                .ResideInNamespaceMatching($"^{source}($|\\.)")
                .Should()
                .NotDependOnAny(Types().That().ResideInNamespaceMatching($"^{target}($|\\.)"));
            foreach (var result in rule.Evaluate(architecture).Where(result => !result.Passed))
            {
                failures.Add($"{source} -> {target}: {result.Description}");
            }
        }
    }
}

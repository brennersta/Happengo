using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace Happengo.Api.Tests.Architecture;

public sealed class FeatureBoundaryTests
{
    private static readonly string[] Features =
    [
        "Happengo.Api.Events",
        "Happengo.Api.Attendance",
        "Happengo.Api.Friends",
        "Happengo.Api.Media",
        "Happengo.Api.Identity",
    ];

    [Fact]
    public void Features_do_not_depend_on_another_features_non_public_types()
    {
        var architecture = new ArchLoader().LoadAssemblies(typeof(Program).Assembly).Build();
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

        Assert.True(failures.Count == 0, string.Join(Environment.NewLine, failures));
    }
}

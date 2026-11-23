using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace Happengo.Api.Friends;

/// <summary>
/// 128-bit opaque invite token. Only the SHA-256 is stored. The plaintext is returned once.
/// </summary>
internal static class InviteToken
{
    public const int ByteLength = 16;

    public static string New()
    {
        Span<byte> bytes = stackalloc byte[ByteLength];
        RandomNumberGenerator.Fill(bytes);
        return Base64Url.EncodeToString(bytes);
    }

    public static byte[] Hash(string canonicalToken) =>
        SHA256.HashData(Encoding.UTF8.GetBytes(canonicalToken));

    public static bool TryCanonicalize(string token, out string canonical)
    {
        canonical = "";
        if (token.Length != 22)
        {
            return false;
        }

        Span<byte> bytes = stackalloc byte[ByteLength];
        if (!Base64Url.TryDecodeFromChars(token, bytes, out var written) || written != ByteLength)
        {
            return false;
        }

        canonical = Base64Url.EncodeToString(bytes);
        return true;
    }
}

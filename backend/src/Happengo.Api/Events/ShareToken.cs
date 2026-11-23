using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace Happengo.Api.Events;

internal static class ShareToken
{
    public const int ByteLength = 16;

    public static string New()
    {
        Span<byte> bytes = stackalloc byte[ByteLength];
        RandomNumberGenerator.Fill(bytes);
        return Base64Url.EncodeToString(bytes);
    }

    /// <summary>
    /// SHA-256 of the canonical token's UTF-8 bytes. This is the value stored in
    /// <c>share_token_hash</c> and the only value the share-link read compares.
    /// pgcrypto <c>digest(token, 'sha256')</c> produces the same bytes on a UTF-8 database.
    /// </summary>
    // The plaintext is shown once at issue or rotation time and is not stored.
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

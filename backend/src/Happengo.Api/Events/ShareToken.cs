using System.Buffers.Text;
using System.Security.Cryptography;

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

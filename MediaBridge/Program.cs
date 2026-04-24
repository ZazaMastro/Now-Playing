using System.Net;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Text.Json;
using Windows.Media;
using Windows.Media.Control;

var port = 38947;

for (var i = 0; i < args.Length; i++)
{
    if (args[i] == "--port" && i + 1 < args.Length && int.TryParse(args[i + 1], out var parsed))
    {
        port = parsed;
        i++;
    }
}

var server = new MediaBridgeServer(port);
await server.RunAsync();

internal sealed class MediaBridgeServer
{
    private readonly int _port;
    private readonly HttpListener _listener;
    private readonly JsonSerializerOptions _jsonOptions;
    private volatile bool _stopping;
    private string _selectedPlayer = "";

    public MediaBridgeServer(int port)
    {
        _port = port;
        _listener = new HttpListener();
        _listener.Prefixes.Add($"http://127.0.0.1:{_port}/");
        _jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
    }

    public async Task RunAsync()
    {
        _listener.Start();

        try
        {
            while (!_stopping)
            {
                var context = await _listener.GetContextAsync();
                _ = Task.Run(() => HandleAsync(context));
            }
        }
        catch (HttpListenerException) when (_stopping)
        {
        }
        catch (ObjectDisposedException) when (_stopping)
        {
        }
        finally
        {
            _listener.Close();
        }
    }

    private async Task HandleAsync(HttpListenerContext context)
    {
        try
        {
            var path = (context.Request.Url?.AbsolutePath ?? "/").Trim('/').ToLowerInvariant();

            switch (path)
            {
                case "health":
                    await WriteJsonAsync(context, new
                    {
                        ok = true,
                        pid = Environment.ProcessId,
                        processPath = Environment.ProcessPath ?? "",
                        baseDirectory = AppContext.BaseDirectory
                    });
                    break;
                case "shutdown":
                    _stopping = true;
                    await WriteJsonAsync(context, new { ok = true });
                    _ = Task.Run(async () =>
                    {
                        await Task.Delay(100);
                        _listener.Stop();
                        Environment.Exit(0);
                    });
                    break;

                case "snapshot":
                    await WriteJsonAsync(context, await BuildSnapshotAsync());
                    break;

                case "select":
                    _selectedPlayer = context.Request.QueryString["player"] ?? "";
                    await WriteJsonAsync(context, new { ok = true, player = _selectedPlayer });
                    break;

                case "playpause":
                    await ExecuteTransportAsync(async session =>
                    {
                        var playback = session.GetPlaybackInfo();
                        var controls = playback.Controls;

                        if (controls.IsPlayPauseToggleEnabled)
                            await session.TryTogglePlayPauseAsync().AsTask();
                        else if (playback.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing && controls.IsPauseEnabled)
                            await session.TryPauseAsync().AsTask();
                        else if (controls.IsPlayEnabled)
                            await session.TryPlayAsync().AsTask();
                    });
                    await WriteJsonAsync(context, new { ok = true });
                    break;

                case "next":
                    await ExecuteTransportAsync(async session => await session.TrySkipNextAsync().AsTask());
                    await WriteJsonAsync(context, new { ok = true });
                    break;

                case "previous":
                    await ExecuteTransportAsync(async session => await session.TrySkipPreviousAsync().AsTask());
                    await WriteJsonAsync(context, new { ok = true });
                    break;
                case "shuffle":
                    await ExecuteTransportAsync(async session =>
                    {
                        var playback = session.GetPlaybackInfo();
                        await session.TryChangeShuffleActiveAsync(!(playback.IsShuffleActive == true)).AsTask();
                    });
                    await WriteJsonAsync(context, new { ok = true });
                    break;

                case "repeat":
                    await ExecuteTransportAsync(async session =>
                    {
                        var repeatMode = session.GetPlaybackInfo().AutoRepeatMode.ToString();
                        var nextMode = repeatMode switch
                        {
                            "None" => MediaPlaybackAutoRepeatMode.List,
                            "List" => MediaPlaybackAutoRepeatMode.Track,
                            "Track" => MediaPlaybackAutoRepeatMode.None,
                            _ => MediaPlaybackAutoRepeatMode.List
                        };
                        await session.TryChangeAutoRepeatModeAsync(nextMode).AsTask();
                    });
                    await WriteJsonAsync(context, new { ok = true });
                    break;

                default:
                    await WriteJsonAsync(context, new { ok = false, error = "not_found" }, 404);
                    break;
            }
        }
        catch (Exception ex)
        {
            await WriteJsonAsync(context, new { ok = false, error = ex.Message }, 500);
        }
        finally
        {
            context.Response.Close();
        }
    }

    private async Task ExecuteTransportAsync(Func<GlobalSystemMediaTransportControlsSession, Task> action)
    {
        var session = await GetSelectedSessionAsync();
        if (session is null)
            throw new InvalidOperationException("Nessuna sessione attiva");

        await action(session);
    }

    private async Task<SnapshotPayload> BuildSnapshotAsync()
    {
        var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync().AsTask();
        var sessions = manager.GetSessions().ToList();
        var current = manager.GetCurrentSession();
        var selected = ResolveSelectedSession(sessions, current);

        var players = new List<PlayerPayload>();

        foreach (var session in sessions)
        {
            players.Add(await BuildPlayerPayloadAsync(
                session,
                selected is not null && session.SourceAppUserModelId == selected.SourceAppUserModelId,
                current is not null && session.SourceAppUserModelId == current.SourceAppUserModelId
            ));
        }

        var selectedPayload = selected is null
            ? null
            : players.FirstOrDefault(p => p.Id == selected.SourceAppUserModelId);

        return new SnapshotPayload
        {
            SelectedPlayer = selected?.SourceAppUserModelId ?? "",
            CurrentPlayer = current?.SourceAppUserModelId ?? "",
            Selected = selectedPayload,
            Players = players
        };
    }

    private GlobalSystemMediaTransportControlsSession? ResolveSelectedSession(
        List<GlobalSystemMediaTransportControlsSession> sessions,
        GlobalSystemMediaTransportControlsSession? current)
    {
        if (!string.IsNullOrWhiteSpace(_selectedPlayer))
        {
            var explicitSession = sessions.FirstOrDefault(s => s.SourceAppUserModelId == _selectedPlayer);
            if (explicitSession is not null)
                return explicitSession;
        }

        if (current is not null)
            return current;

        return sessions.FirstOrDefault();
    }

    private async Task<GlobalSystemMediaTransportControlsSession?> GetSelectedSessionAsync()
    {
        var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync().AsTask();
        var sessions = manager.GetSessions().ToList();
        return ResolveSelectedSession(sessions, manager.GetCurrentSession());
    }

    private async Task<PlayerPayload> BuildPlayerPayloadAsync(
        GlobalSystemMediaTransportControlsSession session,
        bool isSelected,
        bool isCurrent)
    {
        GlobalSystemMediaTransportControlsSessionMediaProperties? props = null;
        try
        {
            props = await session.TryGetMediaPropertiesAsync().AsTask();
        }
        catch
        {
        }

        var playback = session.GetPlaybackInfo();
        var controls = playback.Controls;
        var timeline = session.GetTimelineProperties();

        var title = props?.Title ?? "";
        var artist = !string.IsNullOrWhiteSpace(props?.Artist) ? props!.Artist : (props?.AlbumArtist ?? "");
        var album = props?.AlbumTitle ?? "";
        var start = timeline.StartTime;
        var end = timeline.EndTime;
        var rawPosition = timeline.Position;

        if (playback.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
        {
            var elapsed = DateTimeOffset.Now - timeline.LastUpdatedTime;
            if (elapsed > TimeSpan.Zero && elapsed < TimeSpan.FromHours(12))
                rawPosition += elapsed;
        }

        var duration = end > start ? end - start : end;
        var relativePosition = rawPosition > start ? rawPosition - start : rawPosition;
        var length = Math.Max(1, (long)Math.Round(duration.TotalMilliseconds));
        var position = Math.Min(length, Math.Max(0, (long)Math.Round(relativePosition.TotalMilliseconds)));
        var repeatMode = playback.AutoRepeatMode.ToString();
        if (string.IsNullOrWhiteSpace(repeatMode))
            repeatMode = "None";

        return new PlayerPayload
        {
            Id = session.SourceAppUserModelId,
            Name = FriendlyName(session.SourceAppUserModelId),
            Title = title,
            Artist = artist,
            Album = album,
            Status = playback.PlaybackStatus.ToString(),
            Length = length,
            Position = position,
            CanNext = controls.IsNextEnabled,
            CanPrevious = controls.IsPreviousEnabled,
            CanPlay = controls.IsPlayEnabled,
            CanPause = controls.IsPauseEnabled,
            CanTogglePlayPause = controls.IsPlayPauseToggleEnabled,
            CanShuffle = controls.IsShuffleEnabled,
            CanRepeat = controls.IsRepeatEnabled,
            ShuffleActive = playback.IsShuffleActive == true,
            RepeatMode = repeatMode,
            IsSelected = isSelected,
            IsCurrent = isCurrent
        };
    }

    private static string FriendlyName(string? appId)
    {
        if (string.IsNullOrWhiteSpace(appId))
            return "Player sconosciuto";

        var value = appId.Replace("\\", "/");
        if (value.Contains('!'))
            value = value.Split('!').Last();

        value = value.Split('/').Last();
        value = value.Replace(".exe", "", StringComparison.OrdinalIgnoreCase);
        value = value.Replace("_", " ").Replace("-", " ").Trim();

        if (string.IsNullOrWhiteSpace(value))
            return appId;

        return char.ToUpperInvariant(value[0]) + value[1..];
    }

    private async Task WriteJsonAsync(HttpListenerContext context, object payload, int statusCode = 200)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json; charset=utf-8";

        var json = JsonSerializer.Serialize(payload, _jsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        await context.Response.OutputStream.WriteAsync(bytes);
    }

    private sealed class SnapshotPayload
    {
        public string SelectedPlayer { get; set; } = "";
        public string CurrentPlayer { get; set; } = "";
        public PlayerPayload? Selected { get; set; }
        public List<PlayerPayload> Players { get; set; } = new();
    }

    private sealed class PlayerPayload
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Title { get; set; } = "";
        public string Artist { get; set; } = "";
        public string Album { get; set; } = "";
        public string Status { get; set; } = "Closed";
        public long Length { get; set; } = 1;
        public long Position { get; set; } = 0;
        public bool CanNext { get; set; }
        public bool CanPrevious { get; set; }
        public bool CanPlay { get; set; }
        public bool CanPause { get; set; }
        public bool CanTogglePlayPause { get; set; }
        public bool CanShuffle { get; set; }
        public bool CanRepeat { get; set; }
        public bool ShuffleActive { get; set; }
        public string RepeatMode { get; set; } = "None";
        public bool IsSelected { get; set; }
        public bool IsCurrent { get; set; }
    }
}

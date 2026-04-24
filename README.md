# Now playing

A console-style music companion for Windows inside Decky Loader.

Now playing reads the active Windows media session, shows album art, track metadata, and progress, and gives you compact controls built for a seamless Quick Access Menu experience. Choose your favorite music apps, keep only the shortcuts you need, and enjoy a cleaner console-like music flow with Spotify, Tidal, Apple Music, Deezer, Amazon Music, SoundCloud, or any compatible Windows media player.

<img height="500" alt="immagine" src="https://github.com/user-attachments/assets/b543f4bf-84ff-416d-b0ab-283b61c47085" /> <img height="500" alt="immagine" src="https://github.com/user-attachments/assets/3bd6894b-3530-4a62-b1e4-12b093897992" />



## Features

- Shows the current track title, artist, album, and album artwork.
- Provides previous, play/pause, next, shuffle, and repeat controls when supported by the active player.
- Displays a read-only track progress bar.
- Supports any player that exposes a Windows media session, including Spotify and many other desktop music apps.
- Lets you enable quick shortcuts for Spotify, Tidal, Apple Music, Deezer, Amazon Music, and SoundCloud.
- Opens music apps with a best-effort background/minimized launch.
- Uses a resident C# bridge for fast media control on Windows.
- Includes automatic UI localization for common system languages.

## Requirements

- Windows.
- Decky Loader running on Windows.
- A media player that exposes playback through Windows media sessions.

## Installation

1. Download the latest `in-riproduzione-Decky.zip` from the Releases page.
2. Install the ZIP through Decky Loader.
3. Restart Decky Loader or Steam if the plugin does not appear immediately.
4. Open **Now playing** from the Decky Quick Access Menu.
5. Use the gear button at the bottom of the plugin to choose which music app shortcuts you want to show.

## Updating From Older Versions

Older builds launched `MediaBridge.exe` directly from the plugin folder, which could keep the plugin locked during updates or uninstall.

Current builds run the bridge from a temporary runtime copy instead. If you are updating from an older version and Decky still cannot replace the plugin, close Decky/Steam or stop the old bridge once:

```powershell
taskkill /IM MediaBridge.exe /F
```

After installing a current build, this should no longer be needed during normal updates.

## Building From Source

Install frontend dependencies:

```powershell
pnpm install
```

Build the frontend:

```powershell
pnpm run build
```

Publish the Windows media bridge:

```powershell
dotnet publish MediaBridge\MediaBridge.csproj -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o bin
```

Create the Decky ZIP package:

```powershell
pnpm run package:win
```

The package will be created as:

```text
in-riproduzione-Decky.zip
```

## FAQ

### Is this only for Spotify?

No. Now playing controls the active Windows media session, so it can work with any compatible player. Spotify is supported, but the plugin is not limited to Spotify.

### Do I need Spotify Premium?

No, not for the current plugin features. Playback controls come from Windows media sessions, not from the Spotify Web API.

### Why does opening an app in the background not always behave perfectly?

Background launch is best effort. Desktop apps, Microsoft Store apps, and protocol links all behave differently on Windows. Spotify gets extra minimization handling, but the final window/tray behavior can still depend on the app itself.

### Why do shuffle and repeat sometimes do nothing?

Those buttons depend on what the active player exposes through Windows media controls. Some apps support them fully, some expose partial support, and some ignore them.

### Does the plugin collect data?

No. The plugin reads local Windows media session metadata. Album art lookup may query the public iTunes Search API using the current track metadata, and artwork URLs are cached locally in the system temporary folder.

### Why is the ZIP/package still called `in-riproduzione`?

The visible plugin name is **Now playing**. The technical package name is kept stable to avoid breaking existing Decky installs and update paths.

## Known Limitations

- Windows only.
- App shortcuts are best-effort and depend on installed app paths or URI protocol support.
- Album art lookup depends on external search results and may not always match perfectly.
- Volume control is intentionally not included in the current version.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

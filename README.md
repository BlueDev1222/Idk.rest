# CraftNode website

The public CraftNode download website, served by GitHub Pages at **https://idk.rest**.

The website is plain HTML/CSS with bundled images. It has no analytics, external fonts, or browser JavaScript. The Windows installer is hosted in this repository's GitHub Releases, not committed to Git history.

## Download

[CraftNode 0.3.0 for Windows x64](https://github.com/BlueDev1222/Idk.rest/releases/download/craftnode-v0.3.0/CraftNode-Setup-0.3.0.exe)

[Release notes](https://github.com/BlueDev1222/Idk.rest/releases/tag/craftnode-v0.3.0) · [SHA-256 checksum](https://github.com/BlueDev1222/Idk.rest/releases/download/craftnode-v0.3.0/SHA256SUMS.txt)

This is an **unsigned preview**. Minecraft requires Java; Terraria requires Microsoft XNA Framework 4.0 Refresh. Both are separate prerequisites. Clean-machine installation and full gameplay validation, including real Terraria world generation/saving, remain pending. Keep independent backups and use test worlds when evaluating the preview.

## Website deployment

GitHub Pages publishes the root of the `main` branch. `CNAME` retains the existing `idk.rest` custom domain. `index.html`, `style.css`, and `assets/craftnode-*` make up the download page. Existing unrelated assets are preserved.

To update a download, upload the new installer and its checksum to a GitHub Release, then update the version, release notes, and download links in `index.html` and this file. Do not commit installers, local server data, credentials, or personal paths.

CraftNode is independent software and is not approved by or associated with Mojang or Microsoft.

## Version 0.3.0

Multi-game nodes for Minecraft Java and Terraria, an eight-step creation wizard, live PC and node resource monitoring, storage breakdowns, memory reserve controls, console improvements, and safe migration of existing Minecraft metadata. Minecraft retains its opt-in public-access setup and update notifications. Users with preview update checks enabled will be offered this release; installation remains manual.

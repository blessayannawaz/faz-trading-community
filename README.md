# FAZ Trading Community

[Open the website](https://blessayannawaz.github.io/faz-trading-community/)

[Download the Windows offline ZIP](https://blessayannawaz.github.io/faz-trading-community/downloads/FAZ-Trading-Community-Advanced-v1.1.zip)

# FAZ Trading Community

A charcoal-and-gold Pine Script library for a Windows laptop. One indicator is
one project, with a separate Pine source file and chart gallery for every version.

## Start in three steps

1. Download and extract the offline ZIP.
2. Double-click **START-FAZ.cmd** and keep the launcher open.
3. In **Edge or Chrome**, choose **Connect folder**, then **New indicator**.

No Python, Node, build step, account or internet connection is needed to run locally.
See [READ-ME-FIRST.txt](READ-ME-FIRST.txt) for Urdu/English instructions and recovery.

## Features

- Named versions with Stable / Testing / Draft stages and release notes
- Upload `.pine` source or paste code; copy and download any saved version
- Screenshot galleries with a full-size viewer
- Search, sorting, favorites, editable project details and archive/restore
- One-click reconnect to the last folder, subject to browser permission
- Previous catalogue backup and stale-write checks
- Application caching for offline reopening after the first successful load

## Your library stays on your laptop

The browser writes directly into the folder you select. GitHub hosts application
code only. Scripts, notes and screenshots are never uploaded by the application.
Choose a non-synced folder and keep it outside this source repository. Do not
commit your library files. The included ignore rules are an additional safeguard.

Desktop Edge/Chrome's File System Access API is required. Firefox, Safari and
embedded browser previews are not supported for saving. Work in one tab at a time.
Keep a full copy of the library folder as your backup. Archived projects retain
their original files. Browser cache removal never deletes the library folder.

## GitHub Pages

This repository publishes `docs/` from `main` through GitHub Pages. The `docs/` application assets mirror `dist/`; keep both in sync when changing the website. Private library files are not published.

See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
The first hosted visit requires internet; later offline reopening depends on the
browser retaining its application cache. The ZIP launcher remains available for
reliable local use. Reconnect your existing folder after changing the site URL.

## Maintenance

Plain HTML, CSS and JavaScript; no third-party runtime dependencies. All URLs are
relative, supporting a repository subpath on GitHub Pages. When changing app files,
bump the cache version in `dist/sw.js`, then close all tabs to activate the update.
The Windows server binds to IPv4 loopback and allows only application asset paths.

This stores Pine source; it does not compile scripts, display live market data,
execute trades or supply trading signals.

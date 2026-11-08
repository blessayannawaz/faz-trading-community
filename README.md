# FAZ Trading Community — GitHub edition

[Open website](https://blessayannawaz.github.io/faz-trading-community/)

All indicators, versions, Pine source and screenshots are stored in the private repository **blessayannawaz/faz-trading-library-data**. No local folder or Windows launcher is used. Internet is required.

Connect GitHub on the website using a fine-grained token restricted to that data repository, with Contents read/write permission. The token is held only in page memory and must be re-entered after refresh. GitHub.com login does not authenticate a separate GitHub Pages application. No client secret or token is embedded in this public code.

The interface includes token setup instructions. Do not commit tokens or private library data here. All API calls go directly to api.github.com.

Save creates blobs, a tree, a commit, then a non-forced branch update. A version is published atomically and stale writes are rejected. Reconnect or Refresh library before retrying an uncertain save. GitHub history keeps previous versions; Archive is reversible.

The static website is deployed from main /docs. This replaces the previous local-folder edition. Existing local data is not automatically migrated.

API references: [Git database](https://docs.github.com/en/rest/guides/using-the-rest-api-to-interact-with-your-git-database), [repository contents](https://docs.github.com/en/rest/repos/contents).

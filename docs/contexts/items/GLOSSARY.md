# Items

What Users save into Resonory and how Resonory makes sense of it.

## Language

### Items

**Item**:
A link a User saved into Resonory, together with what Resonory learned about it.
_Avoid_: Bookmark, save, entry, note

**Source URL**:
The address of the page an Item was saved from.
_Avoid_: Link, original URL

**Library**:
Every Item a User has saved, newest first.
_Avoid_: Feed, list, inbox

**Item deletion**:
A User removing an Item from their Library for good. Its Thumbnail and Text go with it, and its Tags come off it. It can't be undone.
_Avoid_: Archive, trash, remove

**Thumbnail**:
The picture Resonory keeps for an Item, copied from what its page or provider offers as its preview; for an Image, the image itself. It comes from that User's own save, never from another User's save of the same page. Some Items have none.
_Avoid_: Cover, preview image, OG image

### Tags

**Tag**:
A short topic name a User organises their Items by. Every User has their own Tags, and a Tag can go on any of their Items, never on a Cue. A User makes one by naming it while tagging an Item, and it stays theirs even when it's on no Items. Resonory's AI can also make one during AI tagging; a Tag only the AI ever used goes away once it's on no Items.
_Avoid_: Label, category, folder, collection

**Tag name**:
The one written form of a Tag's name: lowercase words joined by hyphens, so "Machine Learning" and "machine learning" name the same Tag, `machine-learning`.
_Avoid_: Display name, label

**Tag source**:
Who put a Tag on a particular Item: Resonory's AI or the User. The same Tag can come from the AI on one Item and from the User on another.
_Avoid_: AI-generated flag, origin

**AI tagging**:
Resonory's AI putting up to three Tags on an Item once it's Ready, chosen from what the Item is about. It reuses the User's own Tags where one fits and makes a new Tag only when none does. It isn't part of Processing: an Item is Ready whether or not AI tagging works.
_Avoid_: Auto-tagging, tag suggestions, smart tags

**Rejected tag**:
A Tag the User took off an Item, whoever put it there. Resonory's AI never puts it back on that Item, even if the Tag is later deleted and made again.
_Avoid_: Dismissed tag, removed tag, blocked tag

### Item types

**Item type**:
What form an Item's content takes: Article, Post, Video, Image, Audio, PDF, Code, File, or Link.
_Avoid_: Category, kind

**Article**:
The Item type for a written piece: a page that declares itself an article, or a page on a known publishing site such as Medium, Substack or dev.to. Documentation pages and Wikipedia entries are Articles; a docs landing page and Wikipedia's Main Page are Links.
_Avoid_: Page, blog, blog post

**Post**:
The Item type for something a person published on a social network: X, Threads, Bluesky, Mastodon, LinkedIn, Facebook, Reddit threads, Instagram posts, GitHub issues, pull requests and discussions, and Stack Overflow questions. Instagram reels and TikToks are Videos.
_Avoid_: Tweet, X post, status

**Video**:
The Item type for something to watch, including YouTube videos, Instagram reels and TikToks.
_Avoid_: Clip, reel

**Image**:
The Item type for a picture, including image files.
_Avoid_: Photo, picture

**Audio**:
The Item type for something to listen to: music, podcasts and audio files, including Spotify, SoundCloud, Apple Podcasts and Bandcamp.
_Avoid_: Podcast, track, song

**PDF**:
The Item type for a PDF document.
_Avoid_: Document, file

**Code**:
The Item type for source code: repositories, files, folders, gists, snippets and sandboxes (GitHub, GitLab, Bitbucket, Gist, CodePen, CodeSandbox, Replit), and package pages on npm or PyPI. Documentation about code is an Article.
_Avoid_: Repo, snippet, project

**File**:
The Item type for a download that isn't a PDF, Image, Video or Audio, such as a `.zip`, `.docx`, `.xlsx` or `.dmg`.
_Avoid_: Download, attachment, document

**Link**:
The Item type for everything else, including homepages, product pages and docs landing pages: anything that isn't recognisably one of the other types.
_Avoid_: Other, generic, unknown

### Processing

**Processing**:
The work Resonory does after an Item is saved to learn its type, title, description, Thumbnail, and Text.
_Avoid_: Ingestion, enrichment, parsing

**Text**:
The readable words of an Item: an Article's body, a Post's own words, a Video's captions, an Audio's transcript or show notes. It comes from what that User's own browser captured, never from another User's save of the same page. Some Items have none.
_Avoid_: Extracted text, content, body, full text

**Ready**:
An Item whose processing finished, so its content is available.
_Avoid_: Success, done, processed

**Failed**:
An Item whose processing gave up. The User can retry it.
_Avoid_: Error, broken

### Queues

**Item processing queue**:
Where saved Items wait for Processing, kept apart from AI tagging.
_Avoid_: Items queue, the queue, ingestion queue

**Item tagging queue**:
Where Ready Items wait for AI tagging. A backlog or failure here never holds up Processing or changes an Item's state.
_Avoid_: Items queue, the queue, AI queue

### Resurfacing

**Resurfacing**:
Bringing a forgotten Item back to the User at a moment it's likely to be useful. Cues, Related Items, the Rediscover digest and Reminders are its four forms.
_Avoid_: Recommendation, feed

**Cue**:
A Resurfacing triggered by what the User is doing outside Resonory, such as a search they typed or a page they're reading.
_Avoid_: Nudge, suggestion, notification, reminder

**Related Items**:
Items similar in meaning to the one the User is looking at inside Resonory.
_Avoid_: Recommendations, similar posts

**Rediscover digest**:
A periodic email that brings back a few Items the User hasn't looked at in a while.
_Avoid_: Newsletter, summary, recap

**Reminder**:
A Resurfacing at a moment the User chose for an Item.
_Avoid_: Cue, alarm, alert

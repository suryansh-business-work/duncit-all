import type { CatalogueFlow } from './catalogue.types';

/** Customer-app journeys for social, engagement, wallet, commerce and earn — mWeb (app/mweb) and the native app (app/mobile-app), documented once. */
export const APP_SOCIAL_COMMERCE_FLOWS: readonly CatalogueFlow[] = [
  {
    name: 'App: Posts',
    description:
      'Permanent photo posts on a member profile in the customer app (mWeb + native app): creating, liking, commenting, deleting and sharing. Posts are image posts only; stories are a separate 24h kind.',
    sub_flows: [
      {
        name: 'Create a photo post with a caption (mWeb)',
        description:
          'mWeb opens a "New post" dialog: pick an image through the media picker, add a caption, then share. The server only accepts an http(s) ImageKit URL.',
        steps: [
          ['Sign in and open /profile', 'Your profile loads with the header (name, posts/followers/following counts) and the Posts tab'],
          ['Tap "New Post" in the profile header', 'The "New post" dialog opens with "Pick an image to share." and a "Choose image" button'],
          ['Tap "Choose image" and pick or upload an image in the media picker', 'The picker (title "Choose image for your post") closes and the dialog shows the image preview'],
          ['Type a caption in "Write a caption…"', 'The helper counter updates (e.g. "12/2200"); input stops at 2200 characters'],
          ['Tap "Change photo" and pick a different image', 'The preview is replaced by the newly picked image and the caption is kept'],
          ['Tap "Share"', 'The button shows a spinner, the dialog closes and a snackbar says "Post shared."'],
          ['Look at the Posts grid', 'The new post is the first tile; hovering/focusing it shows 0 likes and 0 comments'],
        ],
      },
      {
        name: 'Create a post from the native app',
        description:
          'Native differs from mWeb: "Add post" asks for photo-library access, then publishes the picked image immediately as a POST with no caption step.',
        steps: [
          ['Open the Profile screen in the native app and tap the "Add post" tile', 'The OS photo-library permission prompt appears the first time'],
          ['Deny the photo-library permission', 'Nothing is uploaded and the screen reports "Photo access is needed to add a post."'],
          ['Tap "Add post" again, grant access and pick an image', 'The grid shows upload progress while the image is sent to ImageKit'],
          ['Wait for the upload to finish', 'The profile refetches and the new image is the first tile in the Posts grid'],
        ],
      },
      {
        name: 'Share your first photo from an empty profile',
        description: 'A member with no posts sees the empty-state call to action, and /profile?newPost=1 opens the composer directly.',
        steps: [
          ['Open /profile as a member with no posts', 'The Posts tab shows "Share Photos" and a "Share your first photo" button'],
          ['Tap "Share your first photo"', 'The "New post" dialog opens'],
          ['Close the dialog and navigate to /profile?newPost=1', 'The "New post" dialog opens automatically and the newPost param is removed from the URL'],
        ],
      },
      {
        name: 'Cancel post creation',
        description: 'Closing the composer discards the picked image and caption.',
        steps: [
          ['Open "New post", pick an image and type a caption', 'Preview and caption are visible'],
          ['Tap the close (X) button', 'The dialog closes and no post is created'],
          ['Open "New post" again', 'The dialog is reset to "Pick an image to share." with an empty caption'],
        ],
      },
      {
        name: 'Like and unlike a post',
        description: 'The post dialog toggles a like; double-tapping the image only ever likes. The owner is notified on like, never on unlike or their own like.',
        steps: [
          ['Open another member\'s post from their profile grid', 'The post dialog opens with the media, author header, comments and "0 likes"'],
          ['Tap the heart ("Like post")', 'The heart turns filled red and the count reads "1 like"'],
          ['Tap the heart again', 'The heart is outlined again and the count reads "0 likes"'],
          ['Double-tap the image', 'The post becomes liked; double-tapping again does not unlike it'],
          ['Sign in as the post owner and open the notifications inbox', 'A "New like on your post" row reads "<name> liked your post" and links to /post/:postId'],
        ],
      },
      {
        name: 'Comment on a post',
        description: 'Comments are trimmed, 1–1000 characters, listed oldest first, and notify the post owner.',
        steps: [
          ['Open a post with no comments', 'The comment list shows "No comments yet. Be the first to comment."'],
          ['Look at the send button with an empty "Add a comment…" field', 'The send button is disabled'],
          ['Type a comment and press Enter', 'The comment appears with your name and timestamp and the input clears'],
          ['Tap the comment icon', 'Focus moves to the "Add a comment…" input'],
          ['Paste a comment longer than 1000 characters and send', 'The server refuses it ("Comment too long (max 1000 chars)"); the text stays in the input and no comment is added'],
          ['Sign in as the post owner and open notifications', 'A "New comment on your post" row reads "<name> commented on your post"'],
        ],
      },
      {
        name: 'Delete a comment',
        description: 'The comment author or the post author may delete a comment; others see no delete control.',
        steps: [
          ['Open a post where you wrote a comment', 'Your comment shows a "Delete comment" icon'],
          ['Tap "Delete comment" on your comment', 'The comment disappears from the list and comments_count drops by one'],
          ['Open a post by someone else that has a comment by a third member', 'That comment has no delete icon'],
          ['As the post author, open your own post with another member\'s comment', 'Their comment shows "Delete comment" and deleting it removes it'],
        ],
      },
      {
        name: 'Delete your own post',
        description: 'Only the author sees Delete post; it asks for confirmation and removes the post and all its comments.',
        steps: [
          ['Open one of your own posts', 'The header shows "Share post", "Delete post" and close'],
          ['Tap "Delete post"', 'A confirm dialog "Delete this post?" says "This will permanently remove the post and all its comments."'],
          ['Tap "Delete"', 'The dialog shows busy, closes, and the post is gone from your grid after refetch'],
          ['Open another member\'s post', 'No "Delete post" control is shown'],
        ],
      },
      {
        name: 'Share a post',
        description: 'Share hands out a tracked duncit.com short link (campaign POST) through the native share sheet, falling back to copying the link.',
        steps: [
          ['Open a post and tap "Share post"', 'The server mints (or reuses) a short link for POST:<postId>'],
          ['On a device with a share sheet', 'The share sheet opens with the author name as title and the short link'],
          ['On a browser without navigator.share', 'The link is copied and a toast says "Link copied to clipboard"'],
          ['Open the shared link in another signed-in session', 'It resolves to /post/:postId and the post dialog opens'],
        ],
      },
      {
        name: 'Open a post from a deep link',
        description: '/post/:postId (native post/:postId) is the deep-link target of post notifications; closing returns to the previous screen.',
        steps: [
          ['Tap a "New like on your post" notification', 'The app navigates to /post/:postId and the post dialog opens'],
          ['Close the post dialog', 'The app goes back to the previous screen'],
          ['Open /post/<id of a deleted post>', 'The dialog shows "Post not found."'],
          ['Open /post/:postId while signed out', 'The app redirects to login and returns to the post after sign-in'],
        ],
      },
    ],
  },
  {
    name: 'App: Stories',
    description:
      '24-hour stories (statuses) in the customer app (mWeb + native app): uploading from Home, viewing followed people and clubs, likes, viewers, deleting, club stories, reporting and expiry.',
    sub_flows: [
      {
        name: 'Upload a photo story from Home',
        description: 'The "My status" tile opens a photo/video picker; images go through a crop step, then upload with progress.',
        steps: [
          ['Open Home as a member with no active story', 'The story rail starts with a "My status" tile showing an add badge'],
          ['Tap "My status" and choose an image file', 'The crop dialog opens with the admin crop presets and No Crop selected by default'],
          ['Tap "Upload"', 'A progress banner shows "Preparing status upload..." then "Saving status..." with a percentage; the tile label reads "Uploading…"'],
          ['Wait for the upload to finish', 'A snackbar says "Status uploaded." with an "OK" action and the tile shows your story with a ring'],
          ['Check the server', 'A Post of kind STORY exists with expires_at 24 hours after creation'],
        ],
      },
      {
        name: 'Upload a video story that needs trimming',
        description: 'Story videos preview first; clips over 15 seconds must be trimmed to a 15s window.',
        steps: [
          ['Tap "My status" (or "Add another") and choose a 40-second video', 'The "Preview your video story" dialog opens with the video and file details'],
          ['Read the notice under the video', 'It says "Videos can be up to 15 seconds long. Slide to pick the 15s you want to post." and a "Trim start" slider is shown'],
          ['Drag the slider to 10 seconds', 'The caption reads "Posting 0:10 – 0:25 of 0:40"'],
          ['Tap "Trim & Post"', 'The trimmed clip uploads with progress and "Status uploaded." appears'],
          ['Choose a 10-second video instead', 'No slider is shown and the button reads "Post story"'],
          ['Tap "Cancel" in the preview', 'The dialog closes and nothing is uploaded'],
        ],
      },
      {
        name: 'Story upload guard rails',
        description: 'Uploads validate against the admin upload caps and only one story upload runs at a time.',
        steps: [
          ['Pick a file larger than the admin image/video cap', 'A snackbar explains the file is too large and no upload starts'],
          ['Start an upload and, while it is running, tap "Add another"', 'A notice says "Please wait, status upload is in progress."'],
          ['Force the upload request to fail (e.g. offline)', 'A snackbar shows the error (or "Could not upload status") and the tile returns to its previous state'],
        ],
      },
      {
        name: 'View stories from people and clubs you follow',
        description: 'The Home rail shows your story, a sponsored tile when an ad is live, then followed members, clubs and pods; unseen rings sort first.',
        steps: [
          ['Open Home as a member who follows people with active stories', 'Their tiles appear after "My status" with a gradient ring while unseen'],
          ['Tap a followed member\'s tile', 'The full-screen viewer opens with one progress bar per story, name and "<time> ago · <N>h remaining"'],
          ['Wait on an image slide', 'The bar fills over 15 seconds and advances to the next slide, then to the next person'],
          ['Tap the right side, then the left side of the media', 'Right goes to the next slide; left goes back one slide (or to the previous person on slide 1)'],
          ['Swipe left on the viewer', 'The viewer jumps to the next person\'s stories'],
          ['Tap the author name in the header', 'The viewer closes and /u/:authorId opens'],
          ['Close the viewer ("Close status") and look at the rail', 'The viewed tile has lost its ring and moved to the end; the server recorded one view'],
        ],
      },
      {
        name: 'Video story sound',
        description: 'Video stories play with sound; if autoplay with sound is blocked the speaker shows muted.',
        steps: [
          ['Open a video story', 'The clip plays and a "Mute video" button is shown'],
          ['Tap "Mute video"', 'Sound stops and the button becomes "Unmute video"'],
          ['Open a video story whose URL fails to load', 'The viewer skips to the next slide instead of freezing on a black frame'],
        ],
      },
      {
        name: 'Like a story',
        description: 'Followers\' stories can be liked from the viewer; your own and club/pod stories have no like control.',
        steps: [
          ['Open a followed member\'s story', 'A heart button "Like story" is shown in the header'],
          ['Tap the heart', 'It fills, the label becomes "Unlike story" and a like count appears'],
          ['Tap it again', 'The like is removed and the count drops'],
          ['Open your own story', 'No like button is shown'],
        ],
      },
      {
        name: 'See who viewed your story',
        description: 'Only the author can list viewers; the author\'s own views are never counted.',
        steps: [
          ['Tap "My status" when you have an active story', 'Your story opens with an eye button "See who viewed this story" and a "Story options" menu'],
          ['Tap the eye button on a story nobody has opened', 'The viewers dialog says "No one has viewed this story yet."'],
          ['Have a follower open the story, then open viewers again', 'The follower is listed with the time they viewed it, newest first'],
        ],
      },
      {
        name: 'Delete your story from Home',
        description: 'Your own story has a "Story options" menu with Delete behind a confirmation.',
        steps: [
          ['Open your story and tap "Story options"', 'A menu with "Delete" opens'],
          ['Tap "Delete"', 'A confirm dialog "Delete story?" says "This story will be removed for everyone. This can\'t be undone."'],
          ['Tap "Delete"', 'The viewer closes, the Home feed refetches and the story is gone from the rail'],
        ],
      },
      {
        name: 'Stories on a public profile',
        description: 'A member profile shows their active stories when the viewer may see content.',
        steps: [
          ['Open /u/:handle of a public member with active stories', 'Their stories appear above the profile tabs'],
          ['Tap one of their stories', 'The story viewer opens on the tapped story'],
          ['Open /u/:handle of a private member you do not follow', 'Stories and posts are hidden behind "This account is private"'],
        ],
      },
      {
        name: 'Post a story to a club as a club admin',
        description: 'Only the club\'s admins get the add tile on the club page, and the server rejects anyone else.',
        steps: [
          ['As a club admin open /club/:clubSlug and scroll to "Stories"', 'The rail starts with an add tile labelled "Add a story to this club"'],
          ['Tap the add tile and upload an image', 'The same crop and progress steps run and "Status uploaded." appears'],
          ['Look at the club Stories rail', 'The new story appears with the author\'s first name and an unseen ring'],
          ['Open the same club page as a regular member', 'No add tile is shown'],
          ['Call createPost with kind STORY and this club_id as a non-admin', 'The server returns FORBIDDEN "Only this club’s admins can post a story to it"'],
        ],
      },
      {
        name: 'View club stories',
        description: 'Club story rings are gradient while unseen and grey once viewed; the rail polls every minute so expiry is honest.',
        steps: [
          ['Open a club page with active stories', 'The Stories section shows circular tiles with gradient rings'],
          ['Tap a tile', 'The lightbox opens on that story and a view is recorded'],
          ['Close the lightbox', 'That tile\'s ring is grey'],
        ],
      },
      {
        name: 'Report a club story',
        description: 'Any signed-in viewer can report a club story to the Legal team; a repeat report edits the reporter\'s existing report.',
        steps: [
          ['Open a club story and tap the 3-dot "Story options" button', 'The menu shows "Report story" (and "Delete story" only if you may delete it)'],
          ['Tap "Report story"', 'The "Report this story" dialog opens with "What is wrong?" and eight reasons starting with "Spam or misleading"'],
          ['Tap "Submit report" without choosing a reason', 'An error says "Pick a reason first"'],
          ['Choose "Harassment or bullying" and tap "Submit report"', 'A toast says "Thanks — our Legal team will review this" and the dialog closes'],
          ['Check the Legal portal "Report By User" queue', 'A report RPT-###### with target Story, status Received and a copy of the media and caption is listed'],
          ['Report the same story again with a different reason', 'The existing report is updated; no second row is created'],
        ],
      },
      {
        name: 'Report with "Something else" requires details',
        description: 'OTHER carries no meaning, so details are mandatory on both client and server.',
        steps: [
          ['Open "Report this story" and choose "Something else"', 'The "Anything else we should know?" field becomes required'],
          ['Tap "Submit report" with the details empty', 'An error says "Tell us what is wrong with this content"'],
          ['Type details and submit', 'The report is filed and the success toast appears'],
        ],
      },
      {
        name: 'Delete a club story as a club admin',
        description: 'A club story can be deleted by its author or any admin of that club.',
        steps: [
          ['As a club admin open a co-admin\'s club story and tap "Story options"', '"Delete story" is shown'],
          ['Tap "Delete story"', 'A confirm dialog "Delete this story?" says "It disappears for everyone straight away, and it cannot be brought back."'],
          ['Tap "Keep it"', 'The dialog closes and the story remains'],
          ['Tap "Delete story" again, then "Delete"', 'The lightbox closes, the rail refetches and a toast says "Story deleted"'],
          ['As a regular member open a club story menu', 'Only "Report story" is shown'],
        ],
      },
      {
        name: 'Story expires after 24 hours',
        description: 'An expired story disappears from every rail and is unreachable by id even before the TTL sweep removes it.',
        steps: [
          ['Create a story and move the clock (or wait) past its expires_at', 'Home, profile and club rails no longer show it'],
          ['Keep a club page open across the expiry boundary', 'The story drops off the rail within a minute without a reload'],
          ['Try to view, like or comment on the expired story id through the API', 'The server answers "Post not found"'],
        ],
      },
    ],
  },
  {
    name: 'App: Follow & public profiles',
    description:
      'Member profiles at /u/:handle and the follow relationship in the customer app (mWeb + native app): public follows, private follow requests, follow back, follower lists and following clubs and hosts.',
    sub_flows: [
      {
        name: 'Open a public profile',
        description: '/u/:handle accepts the @username or a legacy raw user id (native u/:userId).',
        steps: [
          ['Open /u/<username> of an active member', 'The "Profile" page shows avatar, name, @username, zone/city, bio, followers and following counts'],
          ['Open /u/<raw user id> of the same member', 'The same profile loads'],
          ['Open /u/<unknown handle>', 'A warning says "User not found."'],
          ['Tap the back arrow ("Go back")', 'The app returns to the previous screen'],
        ],
      },
      {
        name: 'Follow and unfollow a public profile',
        description: 'Following a PUBLIC profile creates the follow edge immediately, moves both counters and notifies the followed member.',
        steps: [
          ['Open a public member you do not follow', 'The button reads "Follow"'],
          ['Tap "Follow"', 'The button shows a spinner, then "Following"; their followers count increases by one'],
          ['Sign in as that member and open notifications', 'A "New follower" row reads "<name> started following you" with a "Follow Back" button'],
          ['Back as the follower, tap "Following"', 'The button returns to "Follow" and the followers count decreases by one'],
          ['Check the Following feed People tab', 'Their posts no longer appear'],
        ],
      },
      {
        name: 'Request to follow a private profile',
        description: 'Following a PRIVATE profile only opens a pending request; content stays hidden until accepted.',
        steps: [
          ['Open a private member you do not follow', 'Posts are replaced by a lock card "This account is private" / "Follow this account to see their posts and status."'],
          ['Tap "Follow"', 'The button reads "Requested" and no follow edge or counter change is made'],
          ['Tap "Follow" twice quickly (or retry)', 'Only one pending FollowRequest exists; no error is shown'],
          ['Sign in as the private member and open notifications', 'A "Follow request" row reads "<name> wants to follow you" with Accept and Deny'],
        ],
      },
      {
        name: 'Withdraw a pending follow request',
        description: 'Tapping Requested cancels the ask rather than unfollowing.',
        steps: [
          ['Open a private profile you have requested', 'The button reads "Requested"'],
          ['Tap "Requested"', 'The button returns to "Follow"'],
          ['Sign in as the private member and open notifications', 'The follow request row about you is gone'],
        ],
      },
      {
        name: 'Answer a follow request from the profile',
        description: 'The requester\'s profile shows "Wants to follow you" with Accept/Deny, acting on the same request as the inbox.',
        steps: [
          ['As a private member open the profile of someone who requested to follow you', '"Wants to follow you" is shown with "Accept" and "Deny" above the follow button'],
          ['Tap "Accept"', 'The prompt disappears; the requester now follows you and your followers count increases'],
          ['Open notifications', 'The request row now reads "Accepted" with "Follow Back"; no extra "New follower" row was added'],
          ['Repeat with another requester and tap "Deny"', 'The prompt disappears, no follow is created and the requester is not notified'],
        ],
      },
      {
        name: 'Follow back from a profile',
        description: 'When the other person follows you and you do not follow them, the button reads Follow Back.',
        steps: [
          ['Open the profile of a public member who follows you', 'The button reads "Follow Back"'],
          ['Tap "Follow Back"', 'The button reads "Following"'],
          ['Open the profile of a private member who follows you and tap "Follow Back"', 'The button reads "Requested" until they accept'],
        ],
      },
      {
        name: 'Cannot follow yourself',
        description: 'The owner sees owner actions instead of a follow button; the server also refuses a self-follow.',
        steps: [
          ['Open /u/<your own username>', 'Buttons "Edit", "Settings" and "New" are shown instead of Follow'],
          ['Tap "Edit" or "Settings"', 'The app opens /account'],
          ['Tap "New"', 'The app opens /pod-ideas'],
          ['Call followUser with your own user id', 'The server returns "You cannot follow yourself"'],
        ],
      },
      {
        name: 'View followers and following lists',
        description: 'Tapping the counts opens a "Connections" sheet with Followers and Following tabs.',
        steps: [
          ['On a profile tap the followers count', 'The "Connections" dialog opens on the "Followers" tab listing their followers'],
          ['Switch to the "Following" tab', 'The people they follow are listed'],
          ['Open the lists of a new member', 'The tabs say "No followers yet." and "Not following anyone yet."'],
          ['Tap a person in the list', 'Their public profile opens'],
        ],
      },
      {
        name: 'Share your profile',
        description: 'A profile is shared as its readable /u/:handle URL, deliberately not as a tracked short link.',
        steps: [
          ['Open /profile and tap the share button ("Share profile")', 'The share sheet opens with "<name> on Duncit" and <origin>/u/<username>'],
          ['On a browser without a share sheet', 'The /u/<username> URL is copied and "Link copied to clipboard" is shown'],
        ],
      },
      {
        name: 'Follow a club',
        description: 'The club page Follow button follows the club, which feeds the Following feed Clubs tab.',
        steps: [
          ['Open /club/:clubSlug of a club you do not follow', 'The hero shows a "Follow" button'],
          ['Tap "Follow"', 'The button becomes "Following" with a check and following_club_ids includes the club'],
          ['Tap "Following"', 'The club is unfollowed and the button reads "Follow" again'],
          ['Follow an inactive club through the API', 'The server returns "Club not found"'],
        ],
      },
      {
        name: 'Follow hosts from the Hosts & Venues directory',
        description: '/hosts-venues lists hosts and venues in two tabs with counts; host rows carry the three-state follow button.',
        steps: [
          ['Open /hosts-venues', 'Tabs "Hosts" and "Venues" show live counts; Hosts is selected'],
          ['Tap Follow on a public host', 'The button shows a spinner then "Following"'],
          ['Tap Follow on a private host', 'The button reads "Requested"'],
          ['Switch to "Venues"', 'The venue list is shown and the URL carries ?selectedtab'],
        ],
      },
    ],
  },
  {
    name: 'App: Following feed',
    description:
      'The Following screen (/follow on mWeb, following on native) reached from the account menu tile "Following": permanent posts from followed clubs and people, with likes and comments. Stories are excluded.',
    sub_flows: [
      {
        name: 'Open the Following feed',
        description: 'The menu tile opens the feed on the Clubs tab; the tab is kept in the URL.',
        steps: [
          ['Open the account menu and tap the "Following" tile ("People and clubs you follow")', 'The "Following" screen opens with tabs "Clubs" and "People"; Clubs is selected'],
          ['Tap "People"', 'The feed reloads with posts from people you follow and the URL gets ?selectedtab'],
          ['Reload the page', 'The People tab is still selected'],
        ],
      },
      {
        name: 'Browse posts from people you follow',
        description: 'People tab: newest-first permanent posts by followed members (not club-scoped), up to 60.',
        steps: [
          ['Follow two members who have posts and open the People tab', 'Their posts appear as cards, newest first, with avatar, name and relative time'],
          ['Tap a card header', 'The author\'s /u/:id profile opens'],
          ['Look at a video post card', 'The video renders with player controls'],
          ['Have one of them add a story', 'The story does not appear in this feed'],
        ],
      },
      {
        name: 'Browse posts from followed clubs',
        description: 'Clubs tab: posts attached to followed clubs; the header super-category filter narrows the list.',
        steps: [
          ['Open the Clubs tab while following clubs with posts', 'Cards show the club name and cover image; tapping the header opens /club/:clubSlug'],
          ['Pick a super category in the app header', 'Only posts from clubs in that super category remain'],
        ],
      },
      {
        name: 'Empty Following feed',
        description: 'Each tab explains how to fill it.',
        steps: [
          ['Open the Clubs tab without following any club', 'The empty state says "Follow clubs to see their posts here"'],
          ['Open the People tab without following anyone', 'The empty state says "Follow people to see their posts here"'],
        ],
      },
      {
        name: 'Like and comment from the feed',
        description: 'Likes are optimistic and roll back on failure; comments open the shared post dialog.',
        steps: [
          ['Tap the heart on a feed card', 'The heart fills and the count increases immediately'],
          ['Tap the heart again', 'The like is removed and the count decreases'],
          ['Make the like request fail (offline) and tap the heart', 'The count briefly changes and then reverts'],
          ['Tap the comment icon', 'The post dialog opens with the comment thread'],
          ['Delete your own post from that dialog', 'The dialog closes and the feed refetches without the post'],
        ],
      },
    ],
  },
  {
    name: 'App: Explore reels',
    description:
      'The Explore tab (/explore) as a vertical reels feed of pods in the selected city (mWeb + native app). mWeb adds a filter sheet; the native Explore tab is the reels feed without a filter sheet.',
    sub_flows: [
      {
        name: 'Browse reels',
        description: 'Each reel shows the pod video, overlay details, a right-side action rail and a join bar.',
        steps: [
          ['Tap "Explore" in the bottom navigation', 'A full-height reel of the first pod plays with its title, club and location overlay'],
          ['Swipe up', 'The next pod reel snaps into view and starts playing'],
          ['Look at the action rail', 'Buttons for sound, Join (seats taken/spots), Like, Comments, Save, Share and Open are shown; extras move into a "More" menu on short screens'],
          ['Tap "Refresh feed" in the header (mWeb)', 'The feed refetches'],
        ],
      },
      {
        name: 'Reel sound',
        description: 'One sound choice applies to the reel on screen; reels without audio keep a dimmed button that explains.',
        steps: [
          ['Tap the sound button on a reel with audio', 'Sound toggles between "Mute video" and "Unmute video"'],
          ['Tap the sound button on a reel that has no audio track', 'A hint says "This video has no audio"'],
        ],
      },
      {
        name: 'Like a reel and see who liked it',
        description: 'Reel likes are optimistic and reconcile with the server.',
        steps: [
          ['Tap "Like" on a reel', 'The heart fills and the count increases'],
          ['Tap the like count', 'A "Liked by" list opens and includes you'],
          ['Tap a person in the list', 'The list closes and their /u/:id profile opens'],
        ],
      },
      {
        name: 'Comment on a reel',
        description: 'Comments open the pod comments sheet; the count updates in place.',
        steps: [
          ['Tap "Comments" on a reel', 'The pod comments sheet opens'],
          ['Post a comment', 'The comment appears and the reel\'s comment count increases by one'],
          ['Close the sheet', 'The reel is shown with the updated count'],
        ],
      },
      {
        name: 'Save and share a reel',
        description: 'Save toggles the pod bookmark; Share mints a tracked POD short link.',
        steps: [
          ['Tap "Save"', 'The bookmark fills and the pod is added to Saved Items'],
          ['Tap "Save" again', 'The bookmark empties and the pod is removed from Saved Items'],
          ['Tap "Share"', 'The share sheet opens with the pod title and a duncit.com short link (or the link is copied)'],
        ],
      },
      {
        name: 'Open the pod from a reel',
        description: 'Go, Join, Open and double-tapping the reel all open the pod details page.',
        steps: [
          ['Read the join bar on a paid pod', 'It shows "<price> · Confirm with UPI" and a "Go" button'],
          ['Read the join bar on a free pod', 'It shows "Free spot" and "Go"'],
          ['Tap "Go"', 'The app opens /club/:clubSlug/pod/:podSlug'],
          ['Go back and double-tap the reel', 'The pod details page opens again'],
        ],
      },
      {
        name: 'Expired pod reel',
        description: 'A pod that has already run cannot be joined from Explore.',
        steps: [
          ['Scroll to a reel of a past pod', 'The Join action reads "Expired" and the join bar says "This pod is expired" / "You can still view the pod details."'],
          ['Look for the "Go" button on that reel', 'No "Go" button is shown'],
          ['Tap "Open"', 'The pod details page opens in read-only state'],
        ],
      },
      {
        name: 'Filter reels (mWeb only)',
        description: 'The mWeb filter sheet combines presets, sort, vibe, price and date; the native app has no filter sheet.',
        steps: [
          ['Tap "Open filters" in the Explore header', 'The "Filters" sheet opens with "Quick presets", "Sort by", "Vibe", "Price" and "When"'],
          ['Choose "Tonight", price "Free" and "This week"', 'The summary reads "<N> active - <M> pods match"'],
          ['Tap "Show <M> pods"', 'The sheet closes, the feed shows only matching pods and the filter button shows the active count'],
          ['Choose filters that match nothing and apply', 'The feed shows "No pods match these filters."'],
          ['Open filters and tap "Reset"', 'All filters return to defaults and every pod is shown again'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod chats',
    description:
      'Group chat rooms for the pods a member hosts or attends (mWeb /chats and /chats/:id, native chats and chats/:podId). There is no 1:1 direct messaging in the app.',
    sub_flows: [
      {
        name: 'Open the chats list',
        description: 'Chats lists every active pod the member hosts or attends, with search and upcoming/previous filters.',
        steps: [
          ['Open the account menu and tap "Chats" ("Your pod conversations")', 'The "Chats" screen shows a search box, filter chips All / Upcoming Pods / Previous Pods and an "ACTIVE PODS · N" strip'],
          ['Look at a chat row', 'It shows the pod cover, title, date and time, a status chip and "<joined>/<spots> members"'],
          ['Type part of a pod title in "Search chats by pod name"', 'Only rooms whose title matches remain'],
          ['Tap "Previous Pods"', 'Only rooms of pods that have ended remain; the active strip is hidden'],
          ['Search for a title that matches nothing', 'An info message says "No chats match your filters."'],
        ],
      },
      {
        name: 'No chats yet',
        description: 'A member with no joined or hosted pods sees guidance instead of an empty list.',
        steps: [
          ['Open Chats as a member who has not joined or hosted any pod', 'An info message says "You haven\'t joined any pods yet. Join or host a pod to start chatting with attendees."'],
        ],
      },
      {
        name: 'Send a text message',
        description: 'Members of a live pod exchange messages in real time over the pod socket.',
        steps: [
          ['Tap a room in the chats list', 'The room opens with the pod title, "<N> messages", the participants panel and the message log'],
          ['Look at the send button with an empty "Type a message" field', 'The send button is disabled'],
          ['Type a message and press Enter (or tap "Send message")', 'The message appears on the right in your bubble with the time, and the input clears'],
          ['Watch the room from another member\'s session', 'The new message arrives without a reload, showing the sender\'s name and avatar'],
          ['Send only spaces through the API', 'The server refuses with "Message text required"'],
        ],
      },
      {
        name: 'Send emoji and images',
        description: 'The composer inserts emoji into the text and sends pictures picked through the media picker as IMAGE messages.',
        steps: [
          ['Tap the "Emoji" button in the composer', 'The emoji popover opens'],
          ['Pick an emoji', 'It is appended to the message text and the popover closes'],
          ['Tap the "Image" button and pick a picture ("Send image")', 'An image message is posted to the room'],
          ['On the native app deny photo access when sending an image', 'The room reports "Photo access is needed to send an image."'],
        ],
      },
      {
        name: 'React to a message',
        description: 'Reactions toggle per member and emoji: double-click or Enter on mWeb, long-press on native.',
        steps: [
          ['Double-click a message bubble (long-press on native)', 'The reaction emoji picker opens'],
          ['Pick an emoji', 'A reaction chip "<emoji> 1" appears under the message for everyone in the room'],
          ['React again with the same emoji', 'Your reaction is removed and the chip disappears'],
        ],
      },
      {
        name: 'Open pod details and participant profiles from a room',
        description: 'The room header links to the pod and the participants panel links to profiles.',
        steps: [
          ['Tap the pod title in the room header', 'The pod details page /club/:clubSlug/pod/:podSlug opens'],
          ['Open a room whose pod has no club slug and tap the title', 'An error says "Pod details are unavailable for this chat."'],
          ['Tap a host or participant in the participants panel', 'Their /u/:userId profile opens'],
          ['Tap the back arrow', 'The app returns to /chats'],
        ],
      },
      {
        name: 'Chat closes when the pod ends',
        description: 'A pod past its end time (or 4 hours after start with no end time) becomes read-only.',
        steps: [
          ['Open the room of a pod that has ended', 'The log starts with an "Ended" notice and history is still readable'],
          ['Look at the bottom of the room', 'The composer is replaced by "This pod has ended — chat is closed."'],
          ['Send a message to that pod through the API', 'The server refuses with "This pod has ended — chat is closed."'],
        ],
      },
      {
        name: 'Non-members cannot read a room',
        description: 'Messages and participants are gated to the pod hosts, attendees and joined members.',
        steps: [
          ['Open /chats/<pod id> for a pod you did not join', 'The messages query fails with "Not a pod member" and no messages are shown'],
          ['Call chatParticipants for that pod', 'The server returns FORBIDDEN "Not a pod member"'],
        ],
      },
    ],
  },
  {
    name: 'App: Your Contacts on Duncit',
    description:
      'The contacts radar (/contacts, menu "Your Contacts on Duncit"): syncing the phone book, seeing which contacts are on Duncit, following them and removing the sync (mWeb + native app).',
    sub_flows: [
      {
        name: 'Allow contact access and sync (native app)',
        description: 'Native reads the device phone book a page at a time after the OS permission; only comparable phone keys are sent and only matches are kept.',
        steps: [
          ['Open "Your Contacts on Duncit" from the menu', 'The "Allow contact access" card explains the privacy promise and says "Allow contact access to see who from your phone is already here."'],
          ['Tap "Allow contacts"', 'The OS contacts permission prompt appears'],
          ['Grant permission', 'A progress bar shows "Finding your contacts…" then "Syncing <sent> of <total> contacts…"'],
          ['Wait for the sync to finish', 'The card reads "<N> contacts are on Duncit · Last synced <date time>" and "<M> contacts are not on Duncit yet."'],
          ['Look at the button', 'It now reads "Refresh contacts"'],
        ],
      },
      {
        name: 'Sync contacts on mWeb with the Contact Picker',
        description: 'mWeb uses the browser Contact Picker; browsers without it are told to use the app.',
        steps: [
          ['Open /contacts in a browser that supports the Contact Picker and tap "Allow contacts"', 'The browser contact picker opens for multiple selection'],
          ['Select contacts and confirm', 'A progress bar shows "Syncing <sent> of <total> contacts…" and then the matched summary'],
          ['Close the picker without selecting anyone', 'Nothing is synced and no error is shown'],
          ['Open /contacts in a browser without the Contact Picker', 'Instead of the button an info message says "This browser cannot read contacts. Open the Duncit app to sync them — matches synced from the app show here too."'],
        ],
      },
      {
        name: 'Contact access denied or sync failure',
        description: 'A refusal and a technical failure are reported differently.',
        steps: [
          ['Tap "Allow contacts" and deny the permission', 'An error says "Contact access was not allowed. You can enable it from your phone settings."'],
          ['Tap "Allow contacts" while the sync request fails', 'An error says "Your contacts could not be synced. Please try again."'],
        ],
      },
      {
        name: 'Browse matched contacts on the radar',
        description: 'The All tab shows a radar and a windowed list of matched members with their saved phone-book name.',
        steps: [
          ['Open the "All" tab after a sync with matches', 'A radar "Radar of your contacts on Duncit" shows "You" in the centre with matched avatars around it'],
          ['Look at a contact row', 'It shows name, a "Nearby" chip when in your city, "@handle · Saved as <label>" and a follow button'],
          ['Tap the avatar on the radar or a row', 'Their /u/:userId profile opens'],
          ['Tap "Follow" on a public contact', 'The row button becomes "Following"'],
          ['Tap "Follow" on a private contact', 'The row button becomes "Requested"'],
        ],
      },
      {
        name: 'Filter and search contacts',
        description: 'Nearby narrows to contacts in your city; search matches name or @handle.',
        steps: [
          ['Tap the "Nearby" tab', 'Only contacts marked Nearby remain; the URL keeps ?selectedtab'],
          ['Open Nearby when no contact is in your city', 'The empty state says "None of your contacts are in your city yet."'],
          ['Type a name in "Search by name or @handle"', 'After a short pause only matching contacts remain'],
          ['Search for a name that matches nobody', 'The empty state says "No contacts match your search."'],
        ],
      },
      {
        name: 'No contacts on Duncit yet',
        description: 'A synced phone book with zero matches points the member at invites.',
        steps: [
          ['Sync a phone book in which nobody has a Duncit account', 'The All tab says "None of your contacts are on Duncit yet. Invite them and check back."'],
        ],
      },
      {
        name: 'Large phone book loads in pages',
        description: 'Thousands of contacts stream in page by page with progress and a retry.',
        steps: [
          ['Open /contacts for an account with thousands of synced matches', 'A progress line reads "Loading your contacts — <loaded> of <total>" while rows keep scrolling smoothly'],
          ['Make a later page request fail', 'A message says "Some of your contacts could not be loaded." with "Try again"'],
          ['Tap "Try again"', 'Loading resumes and the list completes'],
        ],
      },
      {
        name: 'Remove synced contacts',
        description: 'The member can make Duncit forget the sync at any time.',
        steps: [
          ['Scroll to the bottom of /contacts after a sync and tap "Remove synced contacts"', 'A confirm dialog "Remove synced contacts?" says Duncit will forget which contacts are here'],
          ['Confirm', 'The toast says "Synced contacts removed." and the card returns to "Allow contacts"'],
          ['Open the All tab', 'No matched contacts are listed'],
        ],
      },
    ],
  },
  {
    name: 'App: Contacts invite',
    description:
      'The Invite tab of Your Contacts on Duncit: inviting phone contacts who are not on Duncit over WhatsApp, one row or in bulk (mWeb + native app). Server caps 100 invites per call and 200 per day; one invite per number.',
    sub_flows: [
      {
        name: 'Invite one contact',
        description: 'Each not-yet-joined contact row has its own Invite button.',
        steps: [
          ['Open /contacts and tap the "Invite" tab', 'The bar explains "These contacts are not on Duncit yet. Invite them on WhatsApp — when they join with your link you both earn Duncit Coins."'],
          ['Look at a row', 'It shows a checkbox "Select <name>", the saved name, "Not on Duncit yet" and an "Invite" button'],
          ['Tap "Invite" on one row', 'The button spins, a toast says "1 invite sent on WhatsApp." and the row now shows an "Invited" chip'],
          ['Look at the invited row', 'Its checkbox is disabled and it has no Invite button'],
        ],
      },
      {
        name: 'Invite selected contacts in bulk',
        description: 'Ticked rows are invited together; the button counts the selection.',
        steps: [
          ['On the Invite tab, look at "Invite selected (0)"', 'The bulk button is disabled'],
          ['Tick three rows', 'The button reads "Invite selected (3)" and is enabled'],
          ['Tap "Invite selected (3)"', 'A toast says "3 invites sent on WhatsApp." and those rows show "Invited"'],
        ],
      },
      {
        name: 'Invites skipped or failed',
        description: 'When nothing is sent the toast says why.',
        steps: [
          ['Invite contacts that were all already invited (or with invites switched off by admin)', 'A toast says "Nobody was invited — they have all been invited already, or invites are switched off."'],
          ['Invite while the delivery fails', 'A toast says "Those invites could not be sent. Please try again."'],
          ['Exceed the daily invite allowance', 'Only the remaining allowance is sent; the rest stay un-invited'],
        ],
      },
      {
        name: 'Everyone is already on Duncit',
        description: 'The Invite tab has nothing to offer when every synced number matched.',
        steps: [
          ['Open the Invite tab for a phone book where every contact has an account', 'The empty state says "Everyone in your contacts is already on Duncit."'],
        ],
      },
    ],
  },
  {
    name: 'App: Share links & deep links',
    description:
      'How shared content travels: every member share except a profile is a tracked duncit.com short link; opening it lands on the same path in mWeb or the installed native app (native linking mirrors mWeb paths).',
    sub_flows: [
      {
        name: 'Share a pod, club, post, gift card or referral',
        description: 'The client asks the server for a link by target (POD, CLUB, POST, POD_IDEA, GIFT_CARD, REFERRAL); one link is reused per thing shared.',
        steps: [
          ['Share a pod from Explore or pod details', 'A duncit.com/<8-character code> link is handed to the share sheet (or copied)'],
          ['Share the same pod again', 'The same short link is returned'],
          ['Check Marketing > Short Links', 'The link is listed under the pod shares campaign with its click count'],
          ['Make the share-link request fail and share again', 'The share sheet still opens with the plain in-app URL'],
        ],
      },
      {
        name: 'Open a shared link while signed in',
        description: 'The website resolves the code and forwards to the in-app destination; share links do not sign the visitor out.',
        steps: [
          ['Open a friend\'s shared pod short link in a signed-in mobile browser', 'duncit.com redirects to the mWeb pod page and the visitor stays signed in'],
          ['Open the pod page reached this way', 'The click is attributed (LANDED, then VIEWED_POD recorded for the link)'],
        ],
      },
      {
        name: 'Open a shared link while signed out',
        description: 'Protected pages park the destination in ?redirect and open it after sign-in.',
        steps: [
          ['Open a shared post link in a signed-out browser', 'The app shows /login?redirect=/post/<id>'],
          ['Sign in', 'The app opens /post/<id> with the post dialog'],
        ],
      },
      {
        name: 'Marketing short link forces sign-in on mWeb',
        description: 'A marketing (non-share) short link clears an existing mWeb session so the click is bound to the account that signs in; the native app does not sign out.',
        steps: [
          ['Open a marketing campaign short link in a signed-in mobile browser', 'The session is cleared and the URL becomes /login?redirect=<destination> without the dl/dlc markers'],
          ['Sign in', 'The destination opens and the click is bound to this account'],
          ['Open the same link on a device with the native app signed in', 'The app opens the destination without signing out'],
        ],
      },
      {
        name: 'Open-in-app banner on a mobile browser',
        description: 'Mobile browsers get a bar offering the app; dismissal lasts for the current visit only.',
        steps: [
          ['Open any mWeb page on a phone browser', 'A bar says "Duncit is better in the app" / "Open this page in the app, or get it free." with "Open", "Get app" and "Dismiss"'],
          ['Tap "Open" with the app installed', 'The native app opens on the same path (for example club/<slug>/pod/<slug>)'],
          ['Tap "Get app" on Android', 'The Play Store listing configured in Admin opens'],
          ['Tap "Dismiss" and reload the page', 'The bar hides, then comes back after the reload'],
          ['Open mWeb on a desktop browser', 'No banner is shown'],
        ],
      },
      {
        name: 'Deep link opens the native app screen',
        description: 'Native linking maps mWeb paths to screens, including shop and gift-card paths.',
        steps: [
          ['Open https://mweb.duncit.com/u/<username> on a phone with the app', 'The PublicProfile screen opens'],
          ['Open /gift-card/<code>', 'The GiftCardClaim screen opens for that code'],
          ['Open /product/<id>', 'The ProductDetail screen opens'],
          ['Open an unknown path', 'The NotFound screen opens'],
        ],
      },
    ],
  },
  {
    name: 'App: Notifications inbox',
    description:
      'The notifications screen opened from the header bell (mWeb + native app): unread counts, opening deep links, mark read, category chips, inline follow request actions and the push notification switch.',
    sub_flows: [
      {
        name: 'Open the inbox and read a notification',
        description: 'Opening a row marks it read and follows its link.',
        steps: [
          ['Look at the header bell with unread notifications', 'The bell badge shows the unread count and its name is "Notifications (<N> unread)"'],
          ['Tap the bell', 'The full-screen "Notifications" opens with subtitle "<N> unread updates" and rows newest first'],
          ['Look at an unread row', 'It shows a type icon, title, relative time, an unread dot and the body preview with a chevron when it has a link'],
          ['Tap an unread row that links to /post/<id>', 'The row shows busy, is marked read, the inbox closes and /post/<id> opens'],
          ['Open the inbox again', 'That row has no unread dot and the count dropped by one'],
        ],
      },
      {
        name: 'Mark all as read',
        description: 'The header action clears every unread row; it is disabled when nothing is unread.',
        steps: [
          ['Open the inbox with unread rows and tap "Mark all as read"', 'The button spins, then every unread dot disappears'],
          ['Look at the subtitle and the button', 'The subtitle reads "All caught up" and "Mark all as read" is disabled'],
          ['Close the inbox', 'The bell badge is cleared'],
        ],
      },
      {
        name: 'Filter notifications by category',
        description: 'Categories are derived from titles; a chip exists only for categories present, and the row hides with two or fewer chips.',
        steps: [
          ['Open the inbox with notifications of several kinds', 'Chips like "All 12", "Posts 3", "Account 2", "Payments 1" are shown'],
          ['Tap "Posts 3"', 'Only post notifications remain and the chip is selected'],
          ['Open an inbox that only has one category', 'No chip row is shown'],
          ['Select a chip that has no rows left', 'The list shows "Nothing in this category." or falls back to All'],
        ],
      },
      {
        name: 'Empty inbox',
        description: 'A new account has no notifications.',
        steps: [
          ['Open the inbox as a brand-new member', 'The list says "No notifications yet." and the subtitle reads "All caught up"'],
        ],
      },
      {
        name: 'Accept a follow request from a notification',
        description: 'A FOLLOW_REQUEST row answers the request inline; accepting then offers Follow Back.',
        steps: [
          ['As a private member open a "Follow request" row ("<name> wants to follow you")', 'The row shows "Accept" and "Deny" and no chevron'],
          ['Tap "Accept"', 'The row now reads "Accepted" and offers "Follow Back"; the requester follows you'],
          ['Tap "Follow Back" on a requester with a public profile', 'The button disappears as you now follow them'],
          ['Tap "Follow Back" on a requester with a private profile', 'The button reads "Requested" and no longer takes taps'],
        ],
      },
      {
        name: 'Deny a follow request from a notification',
        description: 'Denying is silent for the requester and offers no Follow Back.',
        steps: [
          ['Tap "Deny" on a follow request row', 'The row reads "Denied" with no buttons'],
          ['As the requester open the private profile', 'The button reads "Follow" again and no notification was received'],
          ['Have the requester withdraw a request that is still open', 'The row about them disappears from the owner\'s inbox after it re-reads'],
        ],
      },
      {
        name: 'Follow back from "started following you"',
        description: 'A NEW_FOLLOWER row renders Follow Back alone until the viewer follows them.',
        steps: [
          ['Open a "New follower" row ("<name> started following you")', 'A "Follow Back" button is shown'],
          ['Tap "Follow Back"', 'The follow is created and the button disappears; the row keeps its chevron to the profile'],
          ['Tap the row', 'The follower\'s profile opens'],
        ],
      },
      {
        name: 'Real-time notification arrival',
        description: 'The inbox listens to the server event stream and refetches when a new notification lands.',
        steps: [
          ['Keep Home open and have another member like your post', 'The bell badge count increases without a reload'],
          ['Open the inbox', 'The "New like on your post" row is at the top'],
        ],
      },
      {
        name: 'Enable or disable push notifications',
        description: 'The "Allow notifications" switch asks for confirmation before subscribing or unsubscribing this device; unsupported browsers hide it.',
        steps: [
          ['Open the inbox on a browser that supports push and turn on "Allow notifications"', 'A confirm dialog "Enable notifications?" says "Get pod, club, chat and account updates on this device."'],
          ['Tap "Enable" and allow the browser/OS prompt', 'The switch is on and a push subscription (or Expo token on native) is saved for this device'],
          ['Turn the switch off', 'A confirm dialog "Disable notifications?" says "You won\'t receive push notifications until you turn them back on."'],
          ['Tap "Disable"', 'The device is unsubscribed and the switch is off'],
          ['Open the inbox on a browser without push support', 'The "Allow notifications" card is not shown'],
        ],
      },
    ],
  },
  {
    name: 'App: App popups & Something for you',
    description:
      'Admin-authored marketing surfaces in the customer app (mWeb + native app): the app-open popup and the "We\'ve got something for you" rail at the bottom of Home.',
    sub_flows: [
      {
        name: 'App popup with an in-app call to action',
        description: 'The server returns at most one eligible popup for the signed-in user and platform (date window, audience, not yet dismissed).',
        steps: [
          ['Configure an active popup with a CTA path /referral and open the app', 'A dialog "App popup" shows the image at its natural ratio with the CTA button and a close button'],
          ['Tap the CTA', 'The popup closes, is recorded as dismissed and /referral opens'],
          ['Reload the app', 'The popup does not show again'],
        ],
      },
      {
        name: 'App popup with an external link',
        description: 'A CTA URL starting with http opens outside the app.',
        steps: [
          ['Configure the popup CTA as an https URL and open the app', 'The popup shows the CTA label'],
          ['Tap the CTA', 'The popup closes and the URL opens in a new tab (external browser on native)'],
        ],
      },
      {
        name: 'Dismiss a popup',
        description: 'Closing writes the dismissal locally and to the server, so it stays dismissed on other devices; the backdrop always closes it.',
        steps: [
          ['Open the app with an active popup and tap the close button', 'The popup closes immediately'],
          ['Sign in on another device', 'The same popup is not shown there'],
          ['Configure a popup with the close button disabled', 'No close button is shown and the hint "Tap anywhere to close" is displayed'],
          ['Tap outside the image', 'The popup closes and is recorded as dismissed'],
          ['Publish a new popup campaign', 'The new popup shows once even though the previous one was dismissed'],
        ],
      },
      {
        name: 'Something for you rail on Home',
        description: 'Active admin cards in admin order; ROUTE cards navigate in-app, URL cards open externally, cards with no action are inert.',
        steps: [
          ['Scroll to the bottom of Home with active cards', 'A section "We\'ve got something for you" shows fixed-size image cards with a clamped title and bottom text'],
          ['Tap a card whose action is a route (e.g. /gift-cards)', 'The app navigates to /gift-cards keeping Home in history'],
          ['Tap a card whose action is a URL', 'The address opens in a new tab / external browser'],
          ['Tap a card with no action', 'Nothing happens and the card shows no pointer'],
          ['Deactivate every card in admin and reload Home', 'The section is not rendered'],
        ],
      },
    ],
  },
  {
    name: 'App: Leaderboard',
    description:
      'The Leaderboard (/leaderboard, menu "View Rankings" when the leaderboard flag is on) in the customer app (mWeb + native app): five boards, three windows, your rank, how to earn points and rewards.',
    sub_flows: [
      {
        name: 'Open the leaderboard',
        description: 'The menu entry is flag-gated; the page defaults to the Users board for This month.',
        steps: [
          ['Turn the leaderboard feature flag off and open the account menu', 'No "View Rankings" entry is shown'],
          ['Turn the flag on and tap "View Rankings"', 'The "Leaderboard" page opens with tabs Users, Hosts, Club Admins, Venues, Brands and "This month" selected'],
          ['Look at the "Your points" card', 'It shows your points, "Rank #<n>" and "<N> participants in this window"'],
          ['Look at the board', 'The top three stand on a podium (rank 1 in the middle) and the rest are rows with "#rank", name and "<points> pts"; your own row is highlighted'],
        ],
      },
      {
        name: 'Switch boards and time windows',
        description: 'Each board ranks a different activity; the window changes the ranking period.',
        steps: [
          ['Tap the "Hosts" tab', 'The board and your points reload for hosts and the URL keeps ?selectedtab'],
          ['Tap "This year", then "All time"', 'The ranking reloads for each window'],
        ],
      },
      {
        name: 'Not ranked and empty board',
        description: 'Members without points and boards without entries get explicit states.',
        steps: [
          ['Open a board where you have no points', 'The card reads "Not ranked yet" and "Earn your first points to appear on this board."'],
          ['Open a board with no entries in the window', 'The board says "No points on this board yet — be the first!"'],
          ['Make the leaderboard query fail', 'An error says "The leaderboard could not be loaded. Please try again."'],
        ],
      },
      {
        name: 'How to earn points and rewards',
        description: 'Point values and rewards come from the admin leaderboard config, never from copy.',
        steps: [
          ['Scroll below the board', '"How to increase your points" lists actions such as "Join a pod successfully" with "+<points> pts"'],
          ['Look at the "Rewards" card on a board with rewards', 'It says "Finish the window inside a rank range to win." with "End of month"/"End of year" rows like "Rank #1" or "Ranks #2–#10"'],
          ['Open a board with no rewards configured', 'The card says "Rewards for this board will be announced soon."'],
          ['Join a pod successfully and reopen the Users board', 'Your points increase by the configured value'],
        ],
      },
    ],
  },
  {
    name: 'App: Badges',
    description:
      'Badges in the customer app (mWeb + native app): the catalogue at /badges with goal, window and progress, and the achieved badges strip on profiles.',
    sub_flows: [
      {
        name: 'View the badge catalogue',
        description: 'Every published badge states its goal, unlock window and the member\'s progress; achieved badges sort first.',
        steps: [
          ['Open the account menu and tap "Badges"', 'The "Badges" page shows "<unlocked> of <total> unlocked" and a grid of badge cards'],
          ['Look at a locked badge', 'It shows a dimmed image, a "Locked" chip, a goal like "Join 5 pods", a progress bar "2 / 5" and a window like "Counts everything since you joined Duncit"'],
          ['Look at an achieved badge', 'It shows an "Achieved" chip, a full bar and "Achieved on <date>"'],
          ['Unpublish every badge in admin and reload', 'The page says "No badges have been published yet. Check back soon."'],
          ['Make the badges query fail', 'An error says "Your badges could not be loaded. Please try again."'],
        ],
      },
      {
        name: 'Unlock a badge and see it on your profile',
        description: 'Reaching a goal unlocks the badge and it appears under the followers row.',
        steps: [
          ['Open /profile before earning any badge', 'The "Badges" strip says "No badges yet — join pods, bring a friend along and explore new categories to start unlocking them."'],
          ['Complete the goal of a badge (e.g. attend the target number of pods)', 'The badge progress reaches its target'],
          ['Open /profile again', 'The badge appears in the strip'],
          ['Tap "View all badges"', 'The /badges page opens with that badge marked "Achieved"'],
          ['Open your public profile from another account', 'The achieved badge is shown there too'],
        ],
      },
    ],
  },
  {
    name: 'App: Membership (coming soon)',
    description:
      'The Membership page (/membership, menu "See the plans" with a "Coming soon" badge when the membership flag is on) in the customer app (mWeb + native app): provisional tiers and the notify-me list.',
    sub_flows: [
      {
        name: 'View upcoming membership plans',
        description: 'Tiers, prices and benefits come from Admin > Membership; plans are not purchasable yet.',
        steps: [
          ['Open the account menu with the membership flag on and tap "See the plans"', 'The "Membership" page shows "Membership is on its way" with a "Coming soon" chip'],
          ['Scroll the plan cards rail', 'Each tier card shows its price note, tagline and a disabled CTA'],
          ['Hover or focus a plan CTA', 'A tooltip says "Plans are not on sale yet."'],
          ['Scroll to "Compare the plans"', 'A table with a "Benefit" column shows Included / Not included per tier and the provisional footnote'],
          ['Remove all plans in admin and reload', 'An info message says "Membership plans will be announced soon."'],
        ],
      },
      {
        name: 'Join the notify-me list',
        description: 'The member\'s profile email is used read-only; subscribing is remembered.',
        steps: [
          ['Scroll to "Want to know the moment it opens?"', '"Your email" shows your profile email read-only with "Taken from your profile. Change it in Manage Account."'],
          ['Tap "Notify me"', 'The button reads "Signing you up…", then the card changes to "You are on the list" / "We will email you as soon as membership opens."'],
          ['Reload the page', 'The card still shows "You are on the list"'],
          ['Make the subscribe request fail', 'An error says "We could not sign you up. Please try again."'],
        ],
      },
      {
        name: 'Notify me without an email on the profile',
        description: 'Without an email the button is disabled and the field explains why.',
        steps: [
          ['Open /membership as a member with no email', 'The email field is in error with "Add an email address to your profile first." and "Notify me" is disabled'],
        ],
      },
    ],
  },
  {
    name: 'App: Refer & Earn',
    description:
      'Referrals in the customer app (mWeb + native app): the member\'s DUN-XXXXXX code and tracked link at /referral, referred friends, applying a code after Google signup, and the referral coins both sides earn.',
    sub_flows: [
      {
        name: 'View and share your referral code',
        description: 'Every member gets a code on first visit; the link is a tracked REFERRAL short link to /register?ref=CODE.',
        steps: [
          ['Tap the "Refer & Earn" card in the account menu', 'The /referral page shows "Refer & Earn", "You and your friend each earn <coins> Duncit Coins" and "YOUR CODE" DUN-XXXXXX'],
          ['Tap "Copy code"', 'The code is copied and a toast says "Code copied"'],
          ['Tap "Copy link"', 'The tracked link is copied and a toast says "Link copied"'],
          ['Tap "Share"', 'The share sheet opens with the Finance share message containing the code and link (or the message is copied with "Link copied")'],
          ['Set the referral reward to 0 in Finance and reload', 'The "each earn" line is not shown'],
        ],
      },
      {
        name: 'See friends you referred',
        description: 'Referred members are listed newest first with a count.',
        steps: [
          ['Open /referral before referring anyone', '"Friends you referred" shows a 0 chip and "No referrals yet — share your code to get started."'],
          ['Have a friend sign up with your link', 'The friend appears with their name (or "New member") and "<time> ago", and the count increases'],
          ['Open /referral as the referred friend', 'The card shows "You were referred by <your name>"'],
        ],
      },
      {
        name: 'Referral coins are credited to both members',
        description: 'Linking a referral credits the configured coins to the referrer and the new member.',
        steps: [
          ['Sign up a new account through /register?ref=DUN-XXXXXX', 'The referral is linked to the code owner'],
          ['Open /duncit-coin as the new member', 'A credit row "Signed up with referral code DUN-XXXXXX" adds the configured coins'],
          ['Open /duncit-coin as the referrer', 'A credit row "Referral: DUN-XXXXXX" adds the same number of coins'],
        ],
      },
      {
        name: 'Apply a referral code after Google signup',
        description: 'Google signup lands on /signup-referral, the one place besides the signup form where a code can be entered, once.',
        steps: [
          ['Sign up with Google', 'The "Got a referral code?" step says "Enter it now and you both earn Duncit Coins. You can only do this once."'],
          ['Type "abc" in "Referral code"', 'The input upper-cases, shows "Enter a code like DUN-XXXXXX" and "Apply code" is disabled'],
          ['Type a valid DUN-XXXXXX code and tap "Apply code"', 'The button reads "Applying…", a toast says "Referral code applied" and /signup-survey opens'],
          ['Tap "Skip for now" instead', '/signup-survey opens without applying a code'],
        ],
      },
      {
        name: 'Referral code rejected',
        description: 'The server refuses unknown, own and repeat codes.',
        steps: [
          ['Apply a well-formed code that belongs to nobody', 'An error says "That referral code does not exist"'],
          ['Apply your own code', 'An error says "You cannot redeem your own code"'],
          ['Apply a code on an account that already has a referral', 'An error says "A referral code was already applied to this account"'],
        ],
      },
    ],
  },
  {
    name: 'App: Duncit Coins wallet',
    description:
      'Duncit Coins in the customer app (mWeb + native app): balance, lifetime earned, transaction history, per-grant expiry, earning on shop orders and redeeming at product checkout. 1 coin = 1 rupee.',
    sub_flows: [
      {
        name: 'View coin balance and history',
        description: '/duncit-coin shows the balance card and every ledger row.',
        steps: [
          ['Tap the Duncit Coin card in the account menu (User mode)', 'The "Duncit Coin" page shows "Coin balance", "Lifetime earned" and the rate note "You earn <pct>% back as Duncit Coins when you join a pod, and <shopPct>% on shop orders. 1 coin = ₹1."'],
          ['Look at "Transaction history"', 'Rows show the reason, "Earned · <date time>" or "Redeemed · <date time>", and +amount in gold or −amount'],
          ['Look at an earned row from a payment', 'It also shows "Valid till <date>"'],
          ['Open the page as a member with no coin activity', 'History says "No coin activity yet. Rewards from your payments will show up here."'],
          ['Make the coins query fail', 'An error says "Could not load your Duncit Coins. Please try again."'],
        ],
      },
      {
        name: 'Pod feedback coin note',
        description: 'The feedback reward line is shown only when Finance pays it.',
        steps: [
          ['Set the attended-pod feedback reward to 20 coins in Finance', 'The balance card shows "You earn 20 Duncit Coins on your Attended Pod Feedback."'],
          ['Set the reward to 0', 'The line is hidden'],
        ],
      },
      {
        name: 'Coins expire',
        description: 'Each grant carries its own expiry (Finance coin expiry days, 0 = never); spends use the soonest-expiring coins first; a sweep runs every 10 minutes. Gift-card coins never expire.',
        steps: [
          ['Earn coins with a 30-day expiry configured', 'The balance card shows "<coins> coins expire on <date>" for the soonest batch'],
          ['Move past that date and wait for the sweep', 'The balance drops by the unspent coins of that batch and a row labelled "Expired" is added'],
          ['Redeem a gift card into coins', 'The credited row shows no "Valid till" date'],
          ['Set coin expiry to 0 days and earn coins', 'The new earned row has no expiry and no expiry note appears'],
        ],
      },
      {
        name: 'Earn coins on a shop order',
        description: 'A successful product payment credits coins at the shop earn rate on the amount actually charged.',
        steps: [
          ['At product checkout look at the coin rows under the total', '"Coins you will earn" previews coins at the shop rate'],
          ['Complete the product payment', 'The payment succeeds'],
          ['Open /duncit-coin', 'A new earned row credits coins for the order and the balance increases'],
        ],
      },
      {
        name: 'Redeem coins at product checkout',
        description: 'Coins apply all-or-nothing at the maximum the bill can absorb, leaving at least ₹1 for the gateway unless coins cover it entirely.',
        steps: [
          ['Open product checkout with a coin balance', 'The gold "Duncit Coins" row says "<coins> coins available" with "Use coins"'],
          ['Tap "Use coins"', 'The row reads "<coins> coins applied" with "Remove"; "Coins used" and "Coins remaining" rows appear; the pay button shows the reduced amount'],
          ['Look under the pay button', 'The old total is struck through with "you save <amount>"'],
          ['Tap "Remove"', 'Coins are removed and the pay amount returns to the full total'],
          ['Open checkout with a zero balance', 'The row says "You have no Duncit Coins to redeem yet." with no button'],
        ],
      },
      {
        name: 'Coin balance changed before paying',
        description: 'The debit is guarded; if the balance moved after pricing, the sale is not recorded as paid with coins.',
        steps: [
          ['Apply coins at checkout in one tab and spend them in another tab first', 'The second checkout is priced with coins the account no longer holds'],
          ['Pay in the first tab', 'The server refuses the coin redemption, the discount is rolled back and no negative balance is created'],
        ],
      },
    ],
  },
  {
    name: 'App: Gift cards',
    description:
      'Gift cards in the customer app (mWeb + native app, menu "Buy a gift card" and "Redeem a gift card" when the gift_cards flag is on): buying for yourself or as a gift, My cards, redeeming a code or a shared link into Duncit Coins.',
    sub_flows: [
      {
        name: 'Buy a Pod Shop gift card for yourself',
        description: 'Theme, amount and recipient are chosen on the Buy tab, then paid at face value on the checkout page.',
        steps: [
          ['Tap "Buy a gift card" in the menu', '/gift-cards opens on the "Buy" tab with "Pick a theme" (Pod Shop selected), "Choose an amount" and "Who is it for?"'],
          ['Tap a denomination chip', 'The chip is selected and the card preview shows that amount'],
          ['Keep "For myself" and tap "Continue to payment"', '/gift-cards/checkout shows Theme "Pod Shop", "Gift card value", Recipient "Yourself" and "Total to pay"'],
          ['Read the note and contact block', '"Gift cards are charged at face value — no fees on top." and your read-only contact details are shown'],
          ['Tap "Pay <amount>" and complete payment', '"Gift card purchased!" says the card and code were emailed to you, with Amount paid and Payment ID'],
          ['Tap "View my cards"', 'The "My cards" tab lists the new card as "Active" with "Valid until <date>"'],
        ],
      },
      {
        name: 'Send a category gift card to someone',
        description: 'A category-themed card is emailed to the recipient with its code and claim link.',
        steps: [
          ['On the Buy tab tap "Categories" and pick a category theme', 'The theme tile is highlighted and the preview uses its artwork'],
          ['Enter a custom amount within the range', 'The helper "Between <min> and <max>" stays neutral'],
          ['Tap "Send as a gift"', '"Recipient email", "Recipient name" (max 160) and "Personal message" (max 300) fields appear'],
          ['Enter the recipient details and tap "Continue to payment"', 'Checkout shows the category theme and the recipient name'],
          ['Pay', 'Success says "The card and its code have been emailed to <email>. You can also share the link yourself."'],
          ['Open "My cards"', 'The card is listed under "Gifted by you" with the recipient name'],
        ],
      },
      {
        name: 'Gift card buy form validation',
        description: 'Continue stays disabled until the theme, amount and gift email are valid.',
        steps: [
          ['Pick "Sub categories" without choosing a theme tile', '"Continue to payment" is disabled'],
          ['Enter an amount below the minimum', 'The amount field is in error and Continue is disabled'],
          ['Choose "Send as a gift" and type an invalid email', 'The email field shows the invalid email message and Continue is disabled'],
          ['Open /gift-cards/checkout directly without a selection', 'The app redirects to /gift-cards'],
          ['Buy with an amount outside the range through the API', 'The server says "Gift card amount must be between <min> and <max>"'],
        ],
      },
      {
        name: 'Gift card checkout blocked or failed',
        description: 'Checkout needs a phone and a verified email; payment failures are explained.',
        steps: [
          ['Open gift card checkout as a member without a verified email', '"Finish setting up your account" lists "A verified email address" with "Go to profile" and the pay button is disabled'],
          ['Close the Razorpay sheet without paying', 'The failure dialog says "Payment cancelled" / "You closed the payment before it went through. Nothing has been charged." with "Retry payment"'],
          ['Switch off the gift_cards flag and try to pay', 'The server refuses with "Gift cards are not available right now"'],
        ],
      },
      {
        name: 'Copy and share a gift card',
        description: 'Owned cards can be copied or shared as a tracked GIFT_CARD link to /gift-card/<code>.',
        steps: [
          ['On "My cards" tap "Copy code"', 'The code is copied and a toast says "Code copied"'],
          ['Tap "Share"', 'The share sheet opens with "<sender> sent you a Duncit gift card of <amount>! Redeem it here:" and the link'],
          ['Open "My cards" with no cards', 'The empty state says "No gift cards yet. Buy one, or redeem a code someone sent you."'],
        ],
      },
      {
        name: 'Redeem a gift card by code',
        description: 'Redeeming moves the full value into Duncit Coins once.',
        steps: [
          ['Tap "Redeem a gift card" in the menu', '/gift-cards/redeem shows "Gift card code" with hint "Looks like XXXX-XXXX-XXXX-XXXX" and "Check card" disabled'],
          ['Enter a valid active code and tap "Check card"', 'The card preview shows sender ("From <sender>"), message, "Valid until <date>" and "Redeem into coins"'],
          ['Tap "Redeem into coins"', '"Coins added!" says "<coins> coins were added to your balance. You now hold <balance> coins."'],
          ['Tap "See my coins"', '/duncit-coin shows the new balance and a gift card credit row'],
          ['Redeem the same card again as the same member', 'The success card says "This card was already redeemed into your coins." and no coins are added'],
        ],
      },
      {
        name: 'Claim a gift card from a shared link',
        description: '/gift-card/:code is auth-gated; an unread link opens after sign-in.',
        steps: [
          ['Open a shared gift card link while signed out', 'The app shows login with the redirect kept'],
          ['Sign in', '/gift-card/<code> shows the "Gift Cards" claim page with the card and "Redeem into coins"'],
          ['Tap "Redeem into coins"', 'Coins are added and the success card is shown'],
        ],
      },
      {
        name: 'Expired, already redeemed or invalid gift card',
        description: 'Unredeemable cards explain why and hide the redeem button.',
        steps: [
          ['Check a card past its expiry date', 'A warning says "This gift card expired before it was redeemed." and no redeem button is shown'],
          ['Check a card another member already redeemed', 'A warning says "This gift card has already been redeemed."'],
          ['Check a code that does not exist', 'An error says "This code could not be redeemed. Check it and try again."'],
          ['Switch off the gift_cards flag and redeem an active code', 'Redemption still succeeds — only purchases are gated'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Shop browsing',
    description:
      'The Pod Shop (/shop, menu "Pod Shop", only while the is_product_visible flag is on) and each pod\'s own shop on the pod page, in the customer app (mWeb + native app): search, filters, stock and adding to cart.',
    sub_flows: [
      {
        name: 'Browse the Pod Shop',
        description: 'The shop lists products available through live pods with the admin slider on top.',
        steps: [
          ['Open the account menu Shop section and tap "Pod Shop"', 'The "Pod Shop" page shows the promo slider, a search box, a filter button and "Featured Products"'],
          ['Look at a product card', 'It shows image, name, brand, star rating with count when reviewed, price and a round add button'],
          ['Tap a slider slide with a CTA', 'The CTA destination opens'],
          ['Tap a product card', '/product/:productId opens'],
        ],
      },
      {
        name: 'Search and filter products',
        description: 'Search matches product or brand; filters narrow by category chain, rating, stock and sort.',
        steps: [
          ['Type a brand name in "Search products or brands…"', 'After a short pause only that brand\'s products remain'],
          ['Tap the filter button', 'Sections SUPER CATEGORY, CATEGORY, SUB-CATEGORY, RATING, "Include out of stock" and "Sort" expand'],
          ['Pick a super category, then a category', 'Only matching products remain and the filter badge counts the active filters'],
          ['Choose rating "4★+" and sort "Price: low to high"', 'Products rated 4 or more are listed cheapest first'],
          ['Apply filters that match nothing', 'The empty state says "No products match your filters."'],
        ],
      },
      {
        name: 'Out-of-stock products',
        description: 'Out-of-stock products are hidden unless included and can never be added.',
        steps: [
          ['Look at the grid with default filters', 'Products with no pod stock are not listed'],
          ['Tick "Include out of stock"', 'Out-of-stock cards appear with an "Out of stock" chip and no add button'],
        ],
      },
      {
        name: 'Quick add from a product card',
        description: 'The add button puts one unit in the cart from the cheapest pod stocking the product.',
        steps: [
          ['Tap "Add <product> to cart" on a card', 'The button spins briefly and the header cart count increases by one'],
          ['Tap it again', 'The same cart line goes to quantity 2'],
          ['Open /cart', 'The line is grouped under the cheapest pod that stocks the product'],
        ],
      },
      {
        name: 'Shop hidden when products are switched off',
        description: 'Product routes exist only while the product visibility flag is on; with it off they send the visitor home.',
        steps: [
          ['Switch off is_product_visible and open the account menu', 'The Shop section (Pod Shop, My Product Order History, Address Book, Cart) is not shown'],
          ['Open /shop, /cart or /product/<id> directly', 'The app redirects to Home instead of Not Found'],
          ['Checkout a stale cart through the API', 'The server refuses with "Products are currently unavailable"'],
        ],
      },
      {
        name: 'Add products from a pod\'s own shop',
        description: 'The "Pod Shop" card on a pod page lists that pod\'s products; selections go to the global cart.',
        steps: [
          ['Open a pod page whose shop is open', 'The "Pod Shop" card shows an "Available" chip and rows with image, name and "Available <n>"'],
          ['Tap "Add to cart" on a row', 'The row is tinted, shows − 1 + controls and the footer reads "1 product selected" with the total'],
          ['Tap + until the quantity equals the available count', 'The + button becomes disabled'],
          ['Tap the info button on a row', 'The product detail dialog opens for that product'],
          ['Open a pod whose shop the owner closed', 'The chip reads "Closed", rows have no add controls and "The shop is currently closed." is shown'],
        ],
      },
    ],
  },
  {
    name: 'App: Product details & reviews',
    description:
      'The standalone product page (/product/:productId) in the customer app (mWeb + native app): gallery, variants, stock-aware add to cart, brand details and ratings and reviews.',
    sub_flows: [
      {
        name: 'View product details and variants',
        description: 'Variant pills swap the shown price, stock and images.',
        steps: [
          ['Open /product/:productId', 'The page shows a snap gallery, product name, price, variant pills, description with spec rows and a sticky buy bar'],
          ['Tap a gallery image ("Zoom image")', 'A zoom lightbox opens and can step through images'],
          ['Tap a different variant pill', 'The pill is selected and the price and images change to that variant'],
          ['Tap the "by <brand>" chip', 'The brand detail dialog opens'],
          ['Open /product/<unknown id>', 'An info message says "Product not found."'],
        ],
      },
      {
        name: 'Add a product to the cart from its page',
        description: 'The buy bar adds from the cheapest live pod that stocks the product, clamped to available stock.',
        steps: [
          ['Tap "Add to selection" in the buy bar', 'The bar changes to − 1 + with a "Remove" button and the cart count increases'],
          ['Tap + until the quantity equals the pod stock', 'The + button ("Increase quantity") becomes disabled'],
          ['Tap "Remove"', 'The line is removed and the bar shows "Add to selection" again'],
          ['Open a product whose stocking pod has no units left', 'The button reads "Out of stock" and is disabled'],
          ['Open a product that no live pod stocks', 'No buy bar is shown and a message says products are purchased from a pod\'s shop'],
        ],
      },
      {
        name: 'Write a product review',
        description: 'A member has one review per product; submitting again updates it.',
        steps: [
          ['Scroll to "Ratings & reviews" and tap "Submit review" without stars', 'A warning says "Please pick a star rating."'],
          ['Pick 4 stars and type in "Share your experience (optional)"', 'The stars and comment are filled'],
          ['Tap "Add photo" and choose an image', 'The button shows "Uploading…" then a thumbnail appears with a remove button'],
          ['Tap "Submit review"', 'The button shows "Submitting…", the form clears and your review appears in the list; the summary updates'],
          ['Submit a 2-star review for the same product', 'Your existing review is updated to 2 stars rather than adding a second review'],
        ],
      },
      {
        name: 'Vote on reviews and read seller replies',
        description: 'Thumbs up/down toggle per member; a seller reply is shown under the review.',
        steps: [
          ['Tap thumbs up on another member\'s review', 'The up count increases and your vote is highlighted'],
          ['Tap thumbs up again', 'Your vote is cleared'],
          ['Tap thumbs down', 'The vote moves to down'],
          ['Open a review the brand replied to', 'The seller reply and its date are shown under the review'],
        ],
      },
    ],
  },
  {
    name: 'App: Cart',
    description:
      'The cart (bottom navigation "Cart", /cart) in the customer app (mWeb + native app): lines from any pod shop grouped by pod, quantities, clearing and proceeding to one combined product checkout.',
    sub_flows: [
      {
        name: 'Review and edit the cart',
        description: 'Lines are grouped per pod; quantities are clamped to stock; the cart survives reloads.',
        steps: [
          ['Add products from two pods and tap "Cart" in the bottom navigation', 'The "Cart" page shows one card per pod with lines (thumbnail, name — variant, "<price> each") and a "Products total"'],
          ['Tap "Increase <product>"', 'The quantity increases and both totals update; at the stock limit the button is disabled'],
          ['Tap "Decrease <product>" at quantity 1', 'The line is removed'],
          ['Tap "Remove <product>"', 'The line disappears; an empty pod group disappears too'],
          ['Look at a line that meets its product free-delivery threshold', 'A "Free delivery" chip is shown'],
          ['Reload the app', 'The cart lines and quantities are unchanged'],
        ],
      },
      {
        name: 'Empty and clear the cart',
        description: 'Clearing empties every line; the empty state leads back to the shop.',
        steps: [
          ['Tap "Clear cart"', 'All lines are removed and the empty state is shown'],
          ['Read the empty state', 'It says "Your cart is empty" with "Explore Pod Shop"'],
          ['Tap "Explore Pod Shop"', '/shop opens'],
        ],
      },
      {
        name: 'Proceed to checkout',
        description: 'The whole cart pays as one product payment.',
        steps: [
          ['With items in the cart look at "Cart total"', 'It equals the sum of all lines across pods'],
          ['Tap "Proceed to checkout"', '/product-checkout opens listing every cart line'],
          ['Open /product-checkout with an empty cart', 'The page says "Nothing to checkout" with "Back to cart"'],
        ],
      },
    ],
  },
  {
    name: 'App: Product checkout & payment',
    description:
      'The combined product checkout (/product-checkout, native ProductCheckout) in the customer app (mWeb + native app): delivery address, live ShipRocket delivery quote, coupons, coins, Razorpay or dummy gateway, failures and the confirmation.',
    sub_flows: [
      {
        name: 'Pay for products with a saved address',
        description: 'Happy path: pick a saved address, get the delivery quote and pay through Razorpay.',
        steps: [
          ['Open /product-checkout with items in the cart', '"Product checkout" shows "Your order" (lines, Subtotal, Delivery, GST, "Total payable") and "Payment details"'],
          ['Choose an address in "Deliver to a saved address"', 'The billing fields fill from the address and delivery shows "Calculating…" then one row per warehouse plus "Delivery total"'],
          ['Look at the pay button', 'It reads "Pay <total>" with "Receipt and invoice will be sent after successful payment." below'],
          ['Tap "Pay <total>" and complete the Razorpay sheet', 'A blocking overlay says "Processing your payment…" / "Please don’t close this tab."'],
          ['Wait for verification', '"Payment successful" shows Payment ID, Amount paid, Paid on, Invoice, "Download invoice", "Home" and "My orders"; the cart is empty'],
          ['Tap "My orders"', '/orders lists the new order(s): ship orders read "Preparing shipment", pickup orders read "Order placed"'],
        ],
      },
      {
        name: 'Enter a delivery address manually',
        description: 'Without a saved address the delivery quote waits for a valid pincode from the billing form.',
        steps: [
          ['Open checkout without picking a saved address', 'The Delivery row reads "Enter pincode"'],
          ['Type an invalid pincode', 'Delivery still reads "Enter pincode" and the pincode field shows "Enter a valid pincode"'],
          ['Type a valid pincode', 'The delivery quote is fetched and the totals include delivery'],
          ['Tick "Save this as my main address" and pay', 'After payment the address is saved as your main address'],
        ],
      },
      {
        name: 'Estimated or free delivery',
        description: 'Groups ShipRocket could not price live are marked estimated; groups meeting the free-delivery threshold are free.',
        steps: [
          ['Checkout with a warehouse ShipRocket cannot quote', 'That row reads "<courier> (estimated)" and "Estimated delivery — final charge confirmed at checkout." is shown'],
          ['Checkout with every line of a group over its free-delivery threshold', 'That group\'s delivery row reads "Free"'],
        ],
      },
      {
        name: 'Checkout form validation',
        description: 'Zod rules on the contact, billing address and GST fields block payment with field messages.',
        steps: [
          ['Clear "Address line 1" and tap Pay', 'The field shows "Address line 1 is required" and no payment starts'],
          ['Clear "City" and "State"', '"City is required" and "State is required" are shown'],
          ['Type a billing email "abc"', 'The field shows "Enter a valid billing email"'],
          ['Tick "I have a GSTIN (for business invoice)" and type 10 characters', 'The field shows "Enter a valid 15-character GSTIN"'],
          ['Enter a name with digits', 'The field shows "Name can use letters, spaces, apostrophes and periods only"'],
        ],
      },
      {
        name: 'Apply a coupon',
        description: 'Coupons discount the product subtotal in whole rupees; delivery is added on top.',
        steps: [
          ['Tap "View <N> available coupons"', 'The "Available coupons" dialog lists codes with "<pct>% off", scope and "Min <amount>"'],
          ['Pick a coupon', 'The dialog closes and "<CODE> applied" shows with "− <amount>" and "Remove"'],
          ['Look at the order summary and pay button', 'A coupon row is listed and the pay button shows the discounted amount'],
          ['Tap "Remove"', 'The coupon is removed and the total returns'],
          ['Type an unknown code and tap "Apply"', 'A warning says "Invalid or inactive coupon code"'],
          ['Apply an expired coupon or one below its minimum order', 'A warning says "Coupon has expired" or "Minimum order of ₹<amount> required"'],
        ],
      },
      {
        name: 'Pay entirely with coins',
        description: 'When coins cover the whole bill the order completes without opening the gateway.',
        steps: [
          ['Hold more coins than the total and tap "Use coins"', 'The pay amount drops to the remainder the coins cannot cover'],
          ['Complete a checkout where coins cover the full payable', 'No Razorpay sheet opens and "Payment successful" is shown'],
          ['Open /duncit-coin', 'A redeemed row for the order reduces the balance'],
        ],
      },
      {
        name: 'Checkout blocked until the account is ready',
        description: 'The server refuses payment without a phone number and a verified email, so the page says so before paying.',
        steps: [
          ['Open checkout as a member with no phone number', '"Finish setting up your account" / "We need these before you can pay:" lists "A phone number on your profile"'],
          ['Look at the pay button', 'It is disabled'],
          ['Tap "Go to profile"', 'The profile/account page opens'],
          ['Call the checkout mutation anyway', 'The server fails with "Add a phone number to your profile before checking out."'],
        ],
      },
      {
        name: 'Stock or availability changed before paying',
        description: 'Stock, variants and paused products are re-checked at pay time.',
        steps: [
          ['Add 3 units, reduce the pod stock to 1 in admin, then pay', 'An error says "Only 1 <product> available" and no payment is taken'],
          ['Delete the chosen variant in admin, then pay', 'An error says "The selected product variant is no longer available"'],
          ['Pause the product (or its brand) in admin, then pay', 'An error says "<product> is currently unavailable"'],
        ],
      },
      {
        name: 'Payment cancelled, declined or timed out',
        description: 'The failure dialog explains what happened to the money; a timeout opens a support ticket automatically.',
        steps: [
          ['Open the Razorpay sheet and close it', 'The dialog says "Payment cancelled" / "You closed the payment before it went through. Nothing has been charged."'],
          ['Pay with a card the bank declines', 'The dialog says "Payment did not go through" and "The gateway said: <reason>"'],
          ['Simulate a gateway timeout', 'The dialog says "We did not hear back in time", "Your money is safe…" and "Opening a support ticket…" then "Your support ticket is <ticket>"'],
          ['Tap "Retry payment"', 'The dialog closes and the checkout is ready to pay again'],
        ],
      },
      {
        name: 'Payment verification delayed',
        description: 'If the verify call drops after money moved, the client polls the server instead of failing.',
        steps: [
          ['Complete Razorpay and drop the verification request', 'The overlay switches to "Confirming your payment…" and says not to pay again'],
          ['Let the server settle the payment as SUCCESS', 'The confirmation page is shown'],
          ['Let the poll time out without a settled status', 'The message says "Your payment is being confirmed — please don’t pay again…"'],
          ['Let the server settle the payment as FAILED', 'The message says the payment did not go through and nothing has been booked'],
        ],
      },
      {
        name: 'Dummy gateway checkout',
        description: 'With online payments in dummy mode the checkout can simulate success or failure; with neither gateway configured it refuses.',
        steps: [
          ['Enable dummy mode in Finance and open product checkout', 'A "Dummy" gateway chip is shown and a "Simulate" select offers "Successful Payment" or "Failed Payment"'],
          ['Set "Simulate" to "Successful Payment" and pay', '"Payment successful" is shown and orders are created'],
          ['Set "Simulate" to "Failed Payment" and pay', 'An error says "Payment failed. Please try again."'],
          ['Disable both Razorpay and dummy mode and pay', 'An error says "Online payments are not configured yet. Please try again later."'],
        ],
      },
      {
        name: 'Download the invoice after payment',
        description: 'The confirmation downloads the payment invoice PDF.',
        steps: [
          ['On "Payment successful" tap "Download invoice"', 'A PDF named invoice-<invoice no>.pdf downloads'],
          ['Make the invoice query return nothing', 'An error says "Invoice not available"'],
          ['Tap "Home"', 'Home opens'],
        ],
      },
    ],
  },
  {
    name: 'App: Orders & shipment tracking',
    description:
      'My Product Order History (/orders, menu "My Product Order History") in the customer app (mWeb + native app): every product order with fulfilment method, status, line items, tracking and timeline. There is no customer-side cancellation or return; status changes are made by ops.',
    sub_flows: [
      {
        name: 'View product orders',
        description: 'Orders across all pods, newest first, one card each.',
        steps: [
          ['Tap "My Product Order History" in the account menu', '"My Product Order History" lists order cards newest first'],
          ['Look at an order card', 'It shows the pod title, a fulfilment chip ("Ship to me" or "Pick up at venue"), a status chip, "#<order no>", line items with quantity and amount, and a timeline'],
          ['Open the page with no orders', 'The empty state says "No product orders yet"'],
        ],
      },
      {
        name: 'Track a shipped order',
        description: 'Ship orders show the AWB, courier and a Track shipment link once ShipRocket assigns one.',
        steps: [
          ['Open a ship order before a courier is assigned', 'The status reads "Preparing shipment" and "Track shipment" is disabled'],
          ['Have ops create the ShipRocket shipment', 'The card shows "AWB <awb> · <courier>" and status "Courier assigned"'],
          ['Tap "Track shipment"', 'The courier tracking page opens in a new tab'],
          ['Advance the shipment through webhooks to delivered', 'The timeline progresses through "Shipped", "Out for delivery" and "Delivered"'],
        ],
      },
      {
        name: 'Pickup order',
        description: 'Pickup orders show the pickup code instead of tracking.',
        steps: [
          ['Open an order with fulfilment "Pick up at venue"', 'The card shows "Pickup code: <code>" and the pickup location'],
          ['Have ops mark it ready and then picked up', 'The status chip moves to "Ready for pickup" and then "Picked up"'],
        ],
      },
      {
        name: 'Cancelled, returned or failed order',
        description: 'Ops-set terminal statuses are shown read-only to the buyer.',
        steps: [
          ['Have ops set an order to CANCELLED', 'The card status reads "Cancelled"'],
          ['Have the courier return a shipment (RTO)', 'The card status reads "Returned to origin"'],
          ['Have fulfilment fail', 'The card status reads "Fulfilment failed"'],
          ['Look for a cancel or return action on any order', 'None is offered to the buyer'],
        ],
      },
    ],
  },
  {
    name: 'App: Earn with Duncit',
    description:
      'The Earn page (/earn, menu tile "Earn with Duncit") in the customer app (mWeb + native app): applying to become a host, venue owner, product seller or club admin through the category → survey → onboarding-meeting gate, managing that meeting, and approved-role CTAs.',
    sub_flows: [
      {
        name: 'Open Earn with Duncit',
        description: 'Four journey cards; a card locks while its role is held or its onboarding meeting is pending.',
        steps: [
          ['Tap the "Earn with Duncit" tile in the account menu', 'The "Earn with Duncit" page lists "By hosting a pod", "By registering your venue", "By listing your product" and "By managing a club"'],
          ['Switch off the is_product_visible flag and reload', 'The "By listing your product" card is hidden'],
          ['Open /survey/ecomm with products switched off', 'The app redirects to /hosts-venues'],
        ],
      },
      {
        name: 'Apply to become a host',
        description: 'The gate walks category, the matching survey (skipped when none) and an onboarding slot, ending on a thank-you.',
        steps: [
          ['Tap "By hosting a pod"', '/survey/host opens "Become a host" with "Super Category *", "Category" and "Sub-Category" pickers (native opens the BecomeHost screen with the same gate)'],
          ['Tap "Continue" without a super category', 'A warning says "Please select a Super Category."'],
          ['Pick a super category that has categories and tap "Continue"', 'A warning says "Please select a Category."'],
          ['Pick the full category path and tap "Continue"', 'The configured survey opens as a stepper with "Back" and "Next"'],
          ['Tap "Next" with a required question empty', 'A warning says "This field is required: <question>"'],
          ['Answer the survey and submit', 'The "Book your onboarding meeting" step shows slots, your name, read-only phone "From your profile." and notes'],
          ['Pick a slot and tap "Book this slot"', 'The button reads "Booking…" then "You’re booked!" thanks you and names the slot with "Back to Home"'],
        ],
      },
      {
        name: 'Register a venue, list a product or manage a club',
        description: 'The other three journeys use the same gate with their own heading.',
        steps: [
          ['Tap "By registering your venue"', '/survey/venue opens "Register your venue"'],
          ['Tap "By listing your product"', '/survey/ecomm opens "List your product"'],
          ['Tap "By managing a club"', '/survey/club_admin opens "Be a Club Admin"'],
          ['Complete any gate', 'A meeting of that kind is requested and "You’re booked!" is shown'],
        ],
      },
      {
        name: 'Onboarding meeting booking blocked',
        description: 'Phone number, slot availability and conflicts are enforced.',
        steps: [
          ['Reach the meeting step with no phone on your profile', 'A warning "Phone number is required so our team can reach you…" shows "Go To Profile" and booking does nothing'],
          ['Tap "Book this slot" without choosing a slot', 'A warning says "Pick an available slot."'],
          ['Reach the meeting step when no slots are open', 'An info message says "No slots are open right now — please check back soon."'],
          ['Book a slot another member just took', 'A warning says "That slot is already booked — please pick another one"'],
        ],
      },
      {
        name: 'Gate progress survives going back',
        description: 'Back steps one phase and the draft restores when re-entering the gate.',
        steps: [
          ['On the meeting step tap back', 'The survey step reopens with your answers intact'],
          ['Leave the gate and open /survey/host again', 'The gate resumes at the step and answers you left'],
          ['Book the meeting and reopen /survey/host', 'The gate starts fresh at the category step'],
        ],
      },
      {
        name: 'Card locked while a meeting is pending',
        description: 'A pending meeting locks its card and offers one reschedule and a cancel.',
        steps: [
          ['Open /earn after booking a host meeting', 'The host card is disabled with a "Meeting scheduled" chip and a notice naming the booked time and request id'],
          ['Look under the card', '"Reschedule meeting" and "Cancel meeting" buttons are shown'],
          ['Tap the locked card', 'Nothing opens'],
        ],
      },
      {
        name: 'Reschedule the onboarding meeting once',
        description: 'Rescheduling requires a new slot and a reason and is allowed once.',
        steps: [
          ['Tap "Reschedule meeting"', '"Reschedule your onboarding meeting" says "Currently booked for <when>. You can reschedule once."'],
          ['Tap "Move to this slot" without picking a slot', 'An error says "Please pick an available slot."'],
          ['Pick a new slot', 'A line says "Moving from <old> to <new>."'],
          ['Submit with an empty reason', 'An error says "Please tell us a reason."'],
          ['Enter a reason and tap "Move to this slot"', 'The button reads "Moving…", the dialog closes and the card shows the new time'],
          ['Look under the card again', '"Reschedule meeting" is gone and "You have already used your one-time reschedule option." is shown'],
        ],
      },
      {
        name: 'Cancel the onboarding meeting',
        description: 'Cancelling frees the slot and unlocks the card; a reason is required.',
        steps: [
          ['Tap "Cancel meeting"', '"Cancel this meeting?" says the meeting will be cancelled and the slot freed'],
          ['Tap "Keep meeting"', 'The dialog closes and the meeting stays'],
          ['Tap "Cancel meeting" again, enter a reason under "Reason for cancelling" and confirm', 'The button reads "Cancelling…", the dialog closes and the card is enabled again'],
        ],
      },
      {
        name: 'Application under review',
        description: 'After the meeting is done, the card stays locked while approval is in progress.',
        steps: [
          ['Have onboarding mark the meeting DONE with approval pending', 'The card shows "Onboarding in process." and "Our team is reviewing your application."'],
          ['Tap the card', 'Nothing opens'],
        ],
      },
      {
        name: 'Approved role shows next-step CTA',
        description: 'A held role shows "Already enabled" with a CTA: host goes in-app, the others open the Partner Portal.',
        steps: [
          ['Open /earn as an approved host', 'The host card shows "Already enabled" and "Ready to host more experiences?"'],
          ['Tap "Ready to host more experiences?"', 'Host Studio /host/manage opens'],
          ['As an approved venue owner tap "Ready to register another venue?"', 'The browser opens partners-app.duncit.com/register-venue/new'],
          ['As a club admin tap "Manage your clubs"', 'The Partner Portal club admin dashboard opens'],
        ],
      },
      {
        name: 'Become-host and register-venue links',
        description: 'Direct /become-host and /register-venue paths differ by surface.',
        steps: [
          ['Open https://mweb.duncit.com/become-host', 'mWeb replaces the page with https://partners-app.duncit.com/become-host'],
          ['Open /register-venue on mWeb', 'mWeb replaces the page with https://partners-app.duncit.com/register-venue'],
          ['Open the become-host deep link in the native app', 'The in-app BecomeHost screen opens the onboarding gate'],
        ],
      },
      {
        name: 'Host a new category as an approved host',
        description: 'Approved hosts apply for another category from Host Studio; the meeting step is skipped.',
        steps: [
          ['Open Host Studio as an approved host', 'A card "Ready to Host More Experiences?" shows "Apply Now"'],
          ['Tap "Apply Now"', '/host/apply opens "Host a new category" with categories you already host disabled'],
          ['Pick a new category path and tap "Continue"', 'The category survey opens (or the request submits directly when none exists)'],
          ['Answer and tap "Submit"', '"Your Request Has Been Submitted" is shown with "Okay"'],
          ['Tap "Okay" and look at the Host Studio card', 'The button reads "Applied" and is disabled while the request is in process'],
          ['Make the request fail', 'A toast says "Could not submit your request — please try again."'],
        ],
      },
    ],
  },
];

# YapChat - Project TODO & Roadmap

## 🎯 Recently Completed

### Avatar Decorations & Profile Customization
- [x] **Avatar Decoration Catalog**: Structured catalog supporting both Square and Round decoration presets (`decorations.py`).
- [x] **Animated GIF & Static PNG Support**: Full alpha-channel transparency and animated frame rendering for decorative frames.
- [x] **Interactive Win98 Decoration Chooser Window**:
  - [x] Category filtering tabs (`[ All ]`, `[ ⬛ Square ]`, `[ ⚪ Round ]`) with live item counts.
  - [x] Live personalized avatar rendering inside all modal preview tiles.
  - [x] Live hover preview on the Discord Profile Card on mouseenter/mouseleave.
  - [x] Single-click equip and "None" / Remove decoration options.
- [x] **Dynamic Shape Switching**:
  - [x] Auto-switches avatar shape to **Round** when selecting a Round decoration.
  - [x] Auto-switches avatar shape to **Square** when selecting a Square decoration.
  - [x] Reverts on cancel/reset or hover leave.
- [x] **Fine-Tuned Positioning & Scaling**:
  - [x] Support for per-item `offset_x`, `offset_y`, and `scale` configurations in `decorations.py`.
  - [x] Real-time backend-to-frontend synchronization.
  - [x] Proportional scaling across Profile Card (64px), Modal Tiles (48px), and Topbar (16px).
- [x] **Status Badge**:
  - [x] Presence indicator with configurable outline (1.3px drop-shadow).
  - [x] Toggleable visibility checkbox in profile editor.
- [x] **Profile State Machine**:
  - [x] Floating Save Changes / Reset bar with real-time change tracking across text, avatar, banner, colors, shape, status, and decorations.

### Auth & Infrastructure
- [x] **Custom Vanilla JS Image Cropper**: Zero-dependency cropper with drag constraints, zooming, and auto-centering for avatars and banners.
- [x] **Email Verification Flow**: Background token dispatching powered by Celery.
- [x] **Atomic Profile Updates**: Secure password, email, and username changing with database transactions.

---

## 🚀 Active & Next Up

- [ ] **Chat-Level Avatar Decorations**:
  - [ ] Render equipped avatar decorations over user avatars in active chat messages.
  - [ ] Add decoration overlay support to partner disconnect/join cards.
- [ ] **User Profile Card Popout**:
  - [ ] Click user avatar in chat to open a mini profile preview card showing bio, pronouns, banner, and decorations.
- [ ] **Mobile & Responsive Polish**:
  - [ ] Touch gestures for the decoration chooser and image cropper on mobile screens.
  - [ ] Responsive adjustments for 2-column and 3-column decoration grid layouts.

---

## 📋 Planned / Backlog

### Real-Time Chat & Matchmaking
- [ ] **Tag-Based Matchmaking Enhancements**: Weighted matching based on overlapping comma-separated interests.
- [ ] **Ephemeral Message Auto-Cleanup**: Optional timer to wipe room message history on partner skip.
- [ ] **Sound Effects**: Windows 98 sound pack (message received, partner connected, error dings) with mute toggle.

### WebRTC Video & Audio
- [ ] **TURN Server Configuration**: Integrate Coturn or Metered TURN for fallback when peer direct P2P connection fails behind strict NATs.
- [ ] **Media Controls**: Win98 styled mute microphone, toggle camera, and screen sharing buttons.

### Administrative & Cloud
- [ ] **Admin Decoration Dashboard**: Upload new decoration presets dynamically to Cloudflare R2 / S3 without code redeployments.
- [ ] **Rate Limiting**: Protect matchmaking and auth endpoints against brute force.

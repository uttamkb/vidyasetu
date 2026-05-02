# Design System Tokens

Use these Tailwind CSS tokens to maintain consistency across the VidyaSetu platform.

## Neutrals (Foundation)

| Token | Light Mode Class | Dark Mode Class |
| :--- | :--- | :--- |
| Background | `bg-white` | `bg-slate-950` |
| Secondary Bg | `bg-slate-50` | `bg-slate-900` |
| Muted Bg | `bg-slate-100/50` | `bg-slate-800/40` |
| Text Primary | `text-slate-900` | `text-slate-50` |
| Text Secondary| `text-slate-500` | `text-slate-400` |
| Text Muted | `text-slate-400` | `text-slate-500` |

## Borders & Separators

| Token | Class | Description |
| :--- | :--- | :--- |
| Default Border | `border-border/60` | Standard component border |
| Subtle Border | `border-slate-200/50` | For nested elements |
| Active Border | `border-primary/40` | Focused or active state |

## Shadows & Depth

| Token | Class | Usage |
| :--- | :--- | :--- |
| Soft Depth | `shadow-sm` | Default cards |
| Lifted | `shadow-md` | Hover states |
| Floating | `shadow-xl shadow-black/5` | Modals & Overlays |

## Transitions

| Token | Class | Description |
| :--- | :--- | :--- |
| Fast | `transition-all duration-150` | Hover states, icon shifts |
| Smooth | `transition-all duration-300` | Modals, layout shifts |
| Springy | `transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)` | Page transitions |

## Glassmorphism

| Token | Class | Usage |
| :--- | :--- | :--- |
| Glass | `bg-background/80 backdrop-blur-md` | Sticky headers, sidebars |
| Frost | `bg-white/10 backdrop-blur-lg` | Premium overlays |

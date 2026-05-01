# Design UX/UI Skill

## Overview
This skill enables the Agent to create, evaluate, and implement user experience (UX) and user interface (UI) designs for the VidyaSetu project, ensuring intuitive, accessible, and visually appealing interfaces.

## Design Principles

### 1. User-Centered Design
- **Target Audience**: CBSE Class 9 students (ages 14-15)
- **Design Goals**: Simple, engaging, educational, and motivating
- **Accessibility**: WCAG 2.1 AA compliance for inclusive design
- **Mobile-First**: Responsive design for tablets and phones

### 2. Visual Hierarchy
- **Primary Actions**: Clear, prominent buttons for main tasks
- **Secondary Actions**: Subtle styling for less critical actions
- **Information Architecture**: Logical grouping and navigation
- **Reading Patterns**: F-pattern and Z-pattern layouts

### 3. Consistency
- **Design System**: shadcn/ui components with custom theming
- **Typography**: Inter font family with consistent scale
- **Colors**: Calm academic palette (slate/blue primary)
- **Spacing**: 8px grid system for layouts

## Color System

### Primary Palette
```css
/* Primary Colors - Calm Academic Feel */
--primary: #3b82f6;        /* Blue for primary actions */
--primary-hover: #2563eb;
--primary-light: #dbeafe;

/* Secondary Colors */
--secondary: #64748b;      /* Slate for secondary elements */
--secondary-hover: #475569;

/* Accent Colors */
--accent: #f59e0b;         /* Amber for highlights */
--accent-hover: #d97706;
```

### Semantic Colors
```css
/* Status Colors */
--success: #10b981;        /* Green for positive actions */
--warning: #f59e0b;        /* Amber for warnings */
--error: #ef4444;          /* Red for errors */
--info: #3b82f6;           /* Blue for information */

/* Background Colors */
--bg-primary: #ffffff;
--bg-secondary: #f8fafc;
--bg-tertiary: #f1f5f9;

/* Text Colors */
--text-primary: #0f172a;
--text-secondary: #475569;
--text-muted: #94a3b8;
```

### Subject-Specific Colors
```css
/* CBSE Subjects */
--math: #3b82f6;           /* Blue */
--science: #10b981;        /* Green */
--social-science: #f59e0b; /* Amber */
--english: #8b5cf6;        /* Purple */
--hindi: #ec4899;          /* Pink */
```

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale
```css
/* Headings */
h1: 2.5rem (40px) - Font weight: 700
h2: 2rem (32px) - Font weight: 600
h3: 1.5rem (24px) - Font weight: 600
h4: 1.25rem (20px) - Font weight: 600
h5: 1.125rem (18px) - Font weight: 600
h6: 1rem (16px) - Font weight: 600

/* Body Text */
large: 1.125rem (18px) - Line height: 1.6
normal: 1rem (16px) - Line height: 1.6
small: 0.875rem (14px) - Line height: 1.5
x-small: 0.75rem (12px) - Line height: 1.4
```

### Text Hierarchy
- **Page Titles**: H1, bold, primary color
- **Section Headers**: H2, semi-bold, primary color
- **Card Titles**: H3, semi-bold, dark text
- **Body Text**: Regular weight, secondary color
- **Captions**: Small, muted color

## Spacing System

### 8px Grid
```css
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-5: 1.25rem (20px)
--space-6: 1.5rem (24px)
--space-8: 2rem (32px)
--space-10: 2.5rem (40px)
--space-12: 3rem (48px)
--space-16: 4rem (64px)
```

### Component Spacing
- **Card Padding**: 6 (24px)
- **Button Padding**: 2-4 (8-16px) vertical, 4-6 (16-24px) horizontal
- **Section Margins**: 8-12 (32-48px)
- **Form Field Gaps**: 4 (16px)

## Component Design

### Buttons
```tsx
// Primary Button
<Button variant="primary" size="default">
  Submit Assignment
</Button>

// Secondary Button
<Button variant="secondary" size="sm">
  Cancel
</Button>

// Icon Button
<Button variant="ghost" size="icon">
  <Settings />
</Button>
```

### Cards
```tsx
// Assignment Card
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <CardTitle>Math Assignment</CardTitle>
    <Badge variant="math">Mathematics</Badge>
  </CardHeader>
  <CardContent>
    <p>Due: Jan 15, 2024</p>
    <Progress value={75} className="h-2" />
  </CardContent>
  <CardFooter>
    <Button>Start Assignment</Button>
  </CardFooter>
</Card>
```

### Forms
```tsx
// Form with validation
<FormField
  control={control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input placeholder="student@school.edu" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Navigation
```tsx
// Main Navigation
<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuLink href="/dashboard">
        Dashboard
      </NavigationMenuLink>
    </NavigationMenuItem>
    <NavigationMenuItem>
      <NavigationMenuLink href="/assignments">
        Assignments
      </NavigationMenuLink>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>
```

## Responsive Design

### Breakpoints
```css
/* Mobile First */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Layout Patterns
```tsx
// Mobile: Single column
// Tablet: Two columns
// Desktop: Three columns

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {assignments.map(assignment => (
    <AssignmentCard key={assignment.id} {...assignment} />
  ))}
</div>
```

## Accessibility

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements focusable and operable
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Indicators**: Visible focus states for all interactive elements

### ARIA Implementation
```tsx
// Button with icon
<Button aria-label="Settings">
  <SettingsIcon />
</Button>

// Navigation
<nav aria-label="Main navigation">
  <NavigationMenu>
    {/* navigation items */}
  </NavigationMenu>
</nav>

// Form with error
<FormItem>
  <FormLabel id="email-label">Email</FormLabel>
  <Input 
    aria-labelledby="email-label"
    aria-describedby="email-error"
    aria-invalid={hasError}
  />
  {hasError && <FormMessage id="email-error">Invalid email</FormMessage>}
</FormItem>
```

## Animation & Motion

### Micro-interactions
```css
/* Button hover */
.button {
  transition: all 0.2s ease-in-out;
}
.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Card hover */
.card {
  transition: box-shadow 0.3s ease-in-out;
}
.card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

### Loading States
```tsx
// Skeleton loader
<Skeleton className="h-4 w-[250px]" />
<Skeleton className="h-4 w-[200px]" />

// Spinner
<Loader2 className="h-6 w-6 animate-spin" />
```

### Page Transitions
```tsx
// Smooth page transitions
<AnimatePresence mode="wait">
  <motion.div
    key={route}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    <Component />
  </motion.div>
</AnimatePresence>
```

## Design Review Checklist

### Visual Design
- [ ] Colors follow the design system
- [ ] Typography is consistent and readable
- [ ] Spacing follows the 8px grid
- [ ] Components are properly aligned
- [ ] Icons are consistent in style and size

### User Experience
- [ ] Navigation is intuitive and clear
- [ ] Actions are discoverable
- [ ] Feedback is provided for user actions
- [ ] Error states are helpful and clear
- [ ] Loading states are implemented

### Accessibility
- [ ] Color contrast meets WCAG standards
- [ ] All interactive elements are focusable
- [ ] ARIA labels are present where needed
- [ ] Keyboard navigation works correctly
- [ ] Screen reader testing completed

### Responsive Design
- [ ] Layout works on mobile, tablet, and desktop
- [ ] Touch targets are appropriately sized (44px minimum)
- [ ] Text is readable on all screen sizes
- [ ] Images scale properly
- [ ] No horizontal scrolling on mobile

## Design Tools & Resources

### Design Software
- **Figma**: UI design and prototyping
- **Adobe XD**: Alternative design tool
- **Excalidraw**: Quick wireframing

### Color Tools
- **Coolors**: Color palette generation
- **WebAIM Contrast Checker**: Accessibility testing
- **Tailwind CSS Colors**: Color system reference

### Inspiration
- **Dribbble**: Design inspiration
- **Behance**: Portfolio and inspiration
- **Awwwards**: Award-winning designs

## Component Library

### shadcn/ui Components
The project uses shadcn/ui as the base component library:

```bash
# Add components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
```

### Custom Components
Create custom components in `src/components/ui/`:

```tsx
// src/components/ui/subject-badge.tsx
export function SubjectBadge({ subject }: { subject: string }) {
  const colors = {
    math: 'bg-blue-100 text-blue-800',
    science: 'bg-green-100 text-green-800',
    'social-science': 'bg-amber-100 text-amber-800',
    english: 'bg-purple-100 text-purple-800',
    hindi: 'bg-pink-100 text-pink-800',
  };

  return (
    <Badge className={colors[subject] || colors.math}>
      {subject}
    </Badge>
  );
}
```

## Design Handoff

### For Developers
- **Figma Links**: Share design files with dev mode
- **Specs**: Provide measurements and spacing
- **Assets**: Export icons and images
- **Interactions**: Document animations and transitions

### Design Tokens
Export design tokens for consistency:

```typescript
// tokens.ts
export const tokens = {
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    // ...
  },
  spacing: {
    sm: '8px',
    md: '16px',
    // ...
  },
  typography: {
    h1: { fontSize: '40px', fontWeight: '700' },
    // ...
  }
};
```

## Best Practices

### DO's
✅ Design for the target audience (Class 9 students)  
✅ Keep interfaces simple and uncluttered  
✅ Use consistent patterns throughout  
✅ Provide clear feedback for actions  
✅ Test designs on actual devices  
✅ Consider accessibility from the start  

### DON'Ts
❌ Don't use too many colors or fonts  
❌ Don't make users think too hard  
❌ Don't ignore mobile experience  
❌ Don't sacrifice usability for aesthetics  
❌ Don't forget about loading states  
❌ Don't use placeholder text as labels  

## Performance Considerations

### Image Optimization
```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Student learning"
  width={800}
  height={600}
  priority
  className="rounded-lg"
/>
```

### Lazy Loading
```tsx
// Lazy load heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false
});
```

### CSS Optimization
- Use Tailwind's utility classes to minimize CSS
- Avoid inline styles
- Use CSS variables for theming
- Minimize custom CSS
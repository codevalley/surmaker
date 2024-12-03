# SureScript Web App v2 - Technical Specifications

## 1. Technical Architecture

### 1.1 Frontend Architecture
- **Framework**: React with TypeScript
- **State Management**: React Context + Hooks
- **UI Components**: 
  - Tailwind CSS for styling
  - Shadcn/ui for core components
  - Custom components for music notation

### 1.2 Core Libraries
- **SureScript Parser**: 
  - Existing `sur-parser` library
  - Enhanced pattern generation capabilities
  - Real-time validation and error handling

- **Editor Components**:
  - CodeMirror for text editing
  - Custom renderers for notation display
  - Web Audio API for metronome

### 1.3 Progressive Web App
- Service Worker implementation
- Offline functionality
- Install prompts
- Push notifications (optional)

## 2. Data Architecture

### 2.1 Local Storage
```typescript
interface StoredSong {
  id: string;
  title: string;
  content: string;
  metadata: {
    raag?: string;
    taal?: string;
    tempo?: string;
    createdAt: number;
    modifiedAt: number;
    version: number;
  };
  history: Array<{
    content: string;
    timestamp: number;
  }>;
}

interface StoredAlankar {
  id: string;
  title: string;
  pattern: string;
  raag: string;
  repetitions: number;
  metadata: {
    createdAt: number;
    modifiedAt: number;
  };
}

interface UserPreferences {
  theme: 'light' | 'dark';
  editorSettings: {
    fontSize: number;
    lineHeight: number;
    showLineNumbers: boolean;
    autoSave: boolean;
  };
  recentFiles: string[];
}
```

### 2.2 Cloud Storage
```typescript
interface CloudDocument {
  id: string;
  type: 'song' | 'alankar';
  content: string;
  metadata: {
    owner: string;
    title: string;
    raag?: string;
    taal?: string;
    tempo?: string;
    createdAt: number;
    modifiedAt: number;
    version: number;
    isPublic: boolean;
    collaborators: string[];
  };
  history: Array<{
    content: string;
    timestamp: number;
    author: string;
  }>;
}
```

### 2.3 Raaga & Taal Data Structures
```typescript
interface Taal {
  name: string;
  beats: number;
  variants: {
    [key: string]: {
      divisions: number;
      structure: string;
      bols: string[][];
      markers: string[];
    };
  };
}

interface Raaga {
  name: string;
  time: {
    start: number;  // 24-hour format
    end: number;    // 24-hour format
  };
  scale: {
    aroha: string[];    // Ascending scale
    avaroha: string[]; // Descending scale
    vadi: string;      // Most important note
    samvadi: string;   // Second most important note
    varjit: string[];  // Prohibited notes
  };
  mood: string[];
  season?: string;
  characteristics: string[];
  commonCompositions: string[];
}

interface RaagaTaalDatabase {
  raagas: Record<string, Raaga>;
  taals: Record<string, Taal>;
}
```

## 3. API Endpoints

### 3.1 Document Management
```typescript
// Songs
POST   /api/songs                 // Create new song
GET    /api/songs/:id             // Get song by ID
PUT    /api/songs/:id             // Update song
DELETE /api/songs/:id             // Delete song
GET    /api/songs                 // List user's songs

// Alankars
POST   /api/alankars              // Create new alankar
GET    /api/alankars/:id          // Get alankar by ID
PUT    /api/alankars/:id          // Update alankar
DELETE /api/alankars/:id          // Delete alankar
GET    /api/alankars              // List user's alankars

// Sharing
POST   /api/share/:id             // Create share link
DELETE /api/share/:id             // Remove share link
PUT    /api/share/:id/access      // Update access settings
```

### 3.2 Raaga & Taal API
```typescript
// Raaga endpoints
GET    /api/raagas                // List all raagas
GET    /api/raagas/:id           // Get raaga details
GET    /api/raagas/search        // Search raagas
GET    /api/raagas/current       // Get raagas for current time

// Taal endpoints
GET    /api/taals                // List all taals
GET    /api/taals/:id           // Get taal details
GET    /api/taals/search        // Search taals
GET    /api/taals/:id/practice  // Get practice patterns

// Combined search
GET    /api/search              // Search both raagas and taals
```

## 4. Performance Requirements

### 4.1 Load Times
- Initial page load: < 2s
- Time to interactive: < 3s
- Editor response time: < 100ms
- API response time: < 200ms

### 4.2 Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### 4.3 Device Support
- Desktop (1920x1080 and above)
- Tablet (768px and above)
- Mobile (320px and above)

## 5. Security Requirements

### 5.1 Authentication
- JWT-based authentication
- Secure password requirements
- Rate limiting on login attempts
- OAuth integration (optional)

### 5.2 Data Protection
- HTTPS everywhere
- XSS protection
- CSRF protection
- Input sanitization
- Content Security Policy

### 5.3 API Security
- Rate limiting
- Request validation
- API key authentication
- CORS configuration

## 6. Testing Requirements

### 6.1 Unit Tests
- Parser functionality
- Component rendering
- State management
- Utility functions

### 6.2 Integration Tests
- API interactions
- Storage operations
- Authentication flow
- Editor operations

### 6.3 E2E Tests
- User workflows
- Cross-browser compatibility
- Mobile responsiveness
- Offline functionality

## 7. Monitoring & Analytics

### 7.1 Performance Monitoring
- Page load times
- API response times
- Error rates
- Resource usage

### 7.2 Usage Analytics
- Feature adoption
- User engagement
- Error tracking
- Performance metrics

### 7.3 Error Tracking
- Error logging
- Stack traces
- User context
- Environment information

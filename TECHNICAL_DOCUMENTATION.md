# BookMate Technical Documentation

## Architecture Overview

BookMate is built using the MVVM (Model-View-ViewModel) architecture pattern, which provides a clear separation of concerns between the user interface, business logic, and data models. The application is developed using Swift and SwiftUI for the UI framework, with SceneKit for 3D visualization.

## Core Components

### 1. Models

The data layer consists of several key models:

#### Book Model
```swift
struct Book: Identifiable, Codable, Equatable {
    @DocumentID var id: String?
    var title: String
    var author: String
    var coverURL: URL?
    var isbn: String?
    var pageCount: Int
    var currentPage: Int
    var dateAdded: Date
    var readingStatus: ReadingStatus
    // Additional properties
}
```

#### User Model
```swift
struct User: Identifiable, Codable {
    var id: String
    var name: String
    var email: String
    var profileImageURL: URL?
    var partnerId: String?
    var partnershipStatus: PartnershipStatus
    // Additional properties
}
```

#### Reading Activity Model
```swift
struct ReadingActivity: Identifiable, Codable {
    var id: String
    var userId: String
    var bookId: String
    var timestamp: Date
    var activityType: ActivityType
    var details: String?
    // Additional properties
}
```

### 2. ViewModels

ViewModels serve as the intermediary between the Views and Models, handling business logic and data transformations:

#### BookViewModel
Manages book-related operations including adding, updating, and fetching books. It communicates with Firebase and Core Data services to persist data.

#### UserViewModel
Handles user profile management, partner connections, and user preferences.

#### Library3DViewModel
Manages the 3D library visualization, including creating the SceneKit scene, organizing books by different criteria, and handling user interactions with the 3D environment.

### 3. Views

The UI layer is built with SwiftUI and organized into several key screens:

#### MainTabView
The main navigation container that hosts the primary tabs:
- HomeView
- MyLibraryView
- ReadingTimerView
- BookshelfView (3D)
- CoupleView
- ProfileView

#### Library3DView
Provides an immersive 3D visualization of the user's completed books, using SceneKit for rendering.

#### ReadingTimerView
A focused reading timer with statistics tracking.

#### BookDetailView
Detailed view for individual books, showing metadata, reading progress, and notes.

## Data Flow

1. **User Authentication**:
   - User credentials are validated through Firebase Authentication
   - User profile data is stored in Firebase Firestore
   - Authentication state is managed by AuthViewModel

2. **Book Management**:
   - Books are added manually or via ISBN scanning
   - Book metadata is fetched from Google Books API or Open Library API
   - Book data is stored locally in Core Data and synced to Firebase
   - Reading progress updates trigger activity events

3. **Partner Connection**:
   - Users can send partner requests via email
   - When accepted, users are linked in the database
   - Reading activities are shared between partners in real-time

4. **3D Library Visualization**:
   - Completed books are rendered in a 3D bookshelf using SceneKit
   - Books can be organized by different criteria (chronological, author, genre, color)
   - The library expands as more books are completed

## Database Schema

### Firebase Collections

#### users
```
{
  "id": "string",
  "name": "string",
  "email": "string",
  "profileImageURL": "string",
  "partnerId": "string",
  "partnershipStatus": "enum",
  "createdAt": "timestamp",
  "lastActive": "timestamp",
  "readingGoals": { ... }
}
```

#### books
```
{
  "id": "string",
  "userId": "string",
  "title": "string",
  "author": "string",
  "isbn": "string",
  "pageCount": "number",
  "currentPage": "number",
  "dateAdded": "timestamp",
  "dateUpdated": "timestamp",
  "readingStatus": "enum",
  "sharedWithPartner": "boolean"
}
```

#### reading_activities
```
{
  "id": "string",
  "userId": "string",
  "bookId": "string",
  "timestamp": "timestamp",
  "activityType": "enum",
  "details": "string"
}
```

#### reading_sessions
```
{
  "id": "string",
  "userId": "string",
  "bookId": "string",
  "startTime": "timestamp",
  "endTime": "timestamp",
  "duration": "number",
  "pagesRead": "number"
}
```

### Core Data Entities

- BookEntity
- UserEntity
- ReadingSessionEntity
- BookCollectionEntity
- ReadingGoalEntity

## Key Features Implementation

### 3D Library

The 3D library is implemented using SceneKit, with the following components:

1. **Library3DModel**: Represents the structure of the 3D library, including bookshelves, book positions, and organization logic.

2. **Library3DViewModel**: Manages the creation and updating of the 3D scene, handling user interactions and display preferences.

3. **Library3DView**: SwiftUI view that hosts the SceneKit scene and provides UI controls for interacting with the library.

The implementation allows for:
- Dynamic creation of bookshelves based on the number of completed books
- Multiple organization modes (chronological, by author, by genre, by color)
- Interactive rotation and zooming
- Book selection and detail viewing

### Reading Timer

The reading timer feature includes:

1. **ReadingTimerViewModel**: Manages timer state, session recording, and statistics calculation.

2. **ReadingTimerView**: Provides the UI for setting and controlling the timer, with visual feedback on reading progress.

3. **ReadingSessionEntity**: Stores completed reading sessions in the database.

Features include:
- Customizable session duration
- Reading statistics (pages per minute, time spent)
- Session history and trends
- Optional focus mode

### Partner Synchronization

Partner features are implemented through:

1. **PartnershipService**: Manages partner connections, invitations, and status updates.

2. **UserViewModel**: Handles the user relationship aspects and shared data permissions.

3. **CoupleView**: Provides the UI for partner activities, shared books, and recommendations.

The synchronization process:
- Real-time updates using Firebase listeners
- Configurable sharing permissions per book
- Activity feed of partner's reading progress
- Book recommendation system

## Security and Privacy

1. **Authentication**: Firebase Authentication with email/password and optional social login.

2. **Data Privacy**: 
   - User data is stored securely in Firebase with proper security rules
   - Reading data is only shared with explicit partner connections
   - Privacy settings allow users to control what information is shared

3. **Offline Support**:
   - Core Data provides local storage for offline access
   - Data synchronization occurs when connectivity is restored

## Performance Considerations

1. **3D Rendering Optimization**:
   - Level of Detail (LOD) implementation for complex book models
   - Texture compression and caching
   - Lazy loading of book covers and textures

2. **Data Management**:
   - Pagination for large book collections
   - Efficient querying patterns for Firebase
   - Background processing for data synchronization

3. **Battery Usage**:
   - Optimized refresh rates for UI updates
   - Efficient background processes
   - Reduced network operations when on battery

## Testing Strategy

1. **Unit Tests**:
   - Model validation and business logic
   - ViewModel state management
   - Service layer functionality

2. **UI Tests**:
   - Critical user flows
   - Accessibility compliance
   - Device compatibility

3. **Performance Tests**:
   - 3D library rendering with large collections
   - Data synchronization with poor connectivity
   - Battery usage monitoring

## Deployment Pipeline

1. **Development Environment**:
   - Local development with Xcode
   - Development Firebase instance

2. **Testing Environment**:
   - TestFlight distribution
   - Staging Firebase instance

3. **Production Environment**:
   - App Store distribution
   - Production Firebase instance with strict security rules

## Third-Party Dependencies

- **Firebase**: Authentication, Firestore, Storage, Analytics
- **SDWebImage**: Efficient image loading and caching
- **CodeScanner**: ISBN barcode scanning functionality
- **Charts**: Data visualization for reading statistics
- **Lottie**: Animation effects for achievements and milestones

## Future Technical Considerations

1. **Scalability**:
   - Sharding strategy for large user base
   - Caching layers for frequently accessed data
   - Optimized query patterns for growing datasets

2. **Feature Extensions**:
   - Machine learning for reading recommendations
   - AR integration for enhanced 3D experience
   - Social features beyond partner connections

3. **Platform Expansion**:
   - watchOS companion app
   - macOS version for desktop reading
   - Widget support for iOS home screen

---

*This technical documentation is maintained by the BookMate development team and should be updated as the application evolves.* 
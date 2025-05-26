# 📚 BookMate - Reading App for Couples

BookMate is a modern React Native application designed to enhance the reading experience for couples. It allows users to track their reading progress, share their journey, and motivate each other to read more.

## 📱 Features

### 📖 Library Management
- **Personal Library**: User-based book collection
- **Reading Status Tracking**: Track books as To Read, Reading, or Completed
- **Progress Tracking**: Page-based reading progress
- **3D Library View**: Visual bookshelf experience

### ⏱️ Reading Timer
- **Session Tracking**: Track daily reading sessions
- **Comprehensive Statistics**: Daily, weekly, and monthly reading times
- **Persistent Storage**: Save reading sessions with AsyncStorage
- **Book-specific Timing**: Separate timers for each book

### 🔍 Book Discovery
- **Google Books API Integration**: Search for real books
- **Wishlist**: Keep track of books you want to read
- **Cover Images**: High-quality book covers
- **Automatic Information Retrieval**: Author, publication year, page count

### 👥 Multi-User Ready
- **User-Aware Storage**: User-based data management
- **Guest Mode**: Use without an account
- **Migration System**: Data transfer system
- **Session Management**: User session management

## 🛠️ Technical Stack

### Frontend
- **React Native** with TypeScript
- **Expo SDK 49+**
- **React Navigation 6**
- **Redux Toolkit** for state management
- **React Native Paper** for UI components
- **Vector Icons** (MaterialCommunityIcons)

### Data Management
- **AsyncStorage**: Local data storage
- **Redux Store**: Global state management
- **User-Based Storage**: User isolation
- **Migration System**: Data versioning

### External APIs
- **Google Books API**: Book search
- **Expo Barcode Scanner**: QR/Barcode scanning

## 📲 Main Screens

- **Library**: Manage your book collection
- **Wishlist**: Plan your reading
- **Statistics**: View reading analytics
- **Reading Timer**: Track reading sessions
- **Book Details**: View and update book information
- **Profile**: User settings and preferences

## 🚀 Getting Started

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/bookmate-react.git
   cd bookmate-react
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Run on your preferred platform:
   ```
   npm run android
   # or
   npm run ios
   ```

## 📂 Project Structure

```
bookmate-react/
├── src/
│   ├── components/    # Reusable UI components
│   ├── contexts/      # React contexts
│   ├── data/          # Data management
│   ├── models/        # TypeScript interfaces
│   ├── navigation/    # Navigation configuration
│   ├── screens/       # App screens
│   ├── services/      # API services
│   ├── store/         # Redux store
│   ├── theme/         # UI theme and styling
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── assets/            # Static assets
└── ...
```

## 🔮 Future Updates

- Firebase Authentication integration
- Real-time data synchronization
- Partner reading system
- Reading challenges
- Advanced analytics

## 📧 Contact

For questions or feedback, please contact:
- Email: abdulsamedkara7@gmail.com

---

**BookMate** - A modern experience for reading enthusiasts 📚✨ 
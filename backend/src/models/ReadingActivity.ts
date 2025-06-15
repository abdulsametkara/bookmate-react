import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import User from './User';
import Book from './Book';
import SharedReading from './SharedReading';

export enum ActivityType {
  READING_START = 'READING_START',     // Okumaya başladı
  READING_END = 'READING_END',         // Okumayı bitirdi
  PAGE_UPDATE = 'PAGE_UPDATE',         // Sayfa güncelledi
  NOTE_ADDED = 'NOTE_ADDED',           // Not ekledi
  BOOK_COMPLETED = 'BOOK_COMPLETED',   // Kitabı bitirdi
  MILESTONE_REACHED = 'MILESTONE_REACHED' // Kilometre taşına ulaştı
}

@Table({
  tableName: 'reading_activities',
  timestamps: true
})
export default class ReadingActivity extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  userId!: string;

  @ForeignKey(() => Book)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  bookId!: string;

  @ForeignKey(() => SharedReading)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  sharedReadingId?: string;

  @Column({
    type: DataType.ENUM,
    values: Object.values(ActivityType),
    allowNull: false
  })
  type!: ActivityType;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  currentPage?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  readingDuration?: number; // Dakika cinsinden

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  note?: string;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  metadata!: {
    location?: string;
    mood?: string;
    rating?: number;
    tags?: string[];
  };

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isVisible!: boolean; // Partner'a görünür mü?

  @BelongsTo(() => User, 'userId')
  user!: User;

  @BelongsTo(() => Book, 'bookId')
  book!: Book;

  @BelongsTo(() => SharedReading, 'sharedReadingId')
  sharedReading?: SharedReading;
} 
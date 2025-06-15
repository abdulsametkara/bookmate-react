import { Table, Column, Model, DataType, BelongsTo, ForeignKey, HasMany } from 'sequelize-typescript';
import User from './User';
import Book from './Book';

export enum SharedReadingMode {
  SAME_BOOK = 'SAME_BOOK',       // 📖 Aynı kitap okuma
  DIFFERENT_BOOKS = 'DIFFERENT_BOOKS', // 📚 Farklı kitaplar okuma
  READING_CLUB = 'READING_CLUB'  // 👥 Okuma kulübü
}

export enum SharedReadingStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

@Table({
  tableName: 'shared_readings',
  timestamps: true
})
export default class SharedReading extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  title!: string; // "Ahmet & Ayşe'nin Ortak Okuma Serüveni"

  @Column({
    type: DataType.ENUM,
    values: Object.values(SharedReadingMode),
    allowNull: false
  })
  mode!: SharedReadingMode;

  @Column({
    type: DataType.ENUM,
    values: Object.values(SharedReadingStatus),
    defaultValue: SharedReadingStatus.ACTIVE
  })
  status!: SharedReadingStatus;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  createdBy!: string;

  @Column({
    type: DataType.JSON,
    allowNull: false,
    defaultValue: []
  })
  participants!: string[]; // User ID'leri array

  @ForeignKey(() => Book)
  @Column({
    type: DataType.UUID,
    allowNull: true // Farklı kitap modunda null olabilir
  })
  bookId?: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  targetPages?: number; // Hedef sayfa sayısı

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  targetDate?: Date; // Hedef bitiş tarihi

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  settings!: {
    allowNotifications: boolean;
    showProgress: boolean;
    allowComments: boolean;
    competitionMode: boolean;
  };

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @BelongsTo(() => User, 'createdBy')
  creator!: User;

  @BelongsTo(() => Book, 'bookId')
  book?: Book;
} 
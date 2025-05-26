import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import User from './User';
import Book from './Book';

@Table({
  tableName: 'reading_sessions',
  timestamps: true
})
export default class ReadingSession extends Model {
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

  @BelongsTo(() => User)
  user!: User;

  @ForeignKey(() => Book)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  bookId!: string;

  @BelongsTo(() => Book)
  book!: Book;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  startTime!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  endTime?: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0
  })
  duration?: number; // Saniye cinsinden süre

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0
  })
  pagesRead?: number;
} 
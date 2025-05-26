import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import User from './User';
import Note from './Note';

export enum ReadingStatus {
  READING = 'READING',
  COMPLETED = 'COMPLETED',
  TO_READ = 'TO_READ'
}

@Table({
  tableName: 'books',
  timestamps: true
})
export default class Book extends Model {
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

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  title!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  author!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  genre?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  publishYear?: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  publisher?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  isbn?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  coverURL?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  pageCount!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  currentPage!: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0
  })
  progress!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  rating?: number;

  @Column({
    type: DataType.ENUM,
    values: Object.values(ReadingStatus),
    defaultValue: ReadingStatus.TO_READ
  })
  status!: ReadingStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isSharedWithPartner!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  lastReadingDate?: Date;

  @HasMany(() => Note)
  notes!: Note[];
} 
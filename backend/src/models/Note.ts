import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import Book from './Book';

@Table({
  tableName: 'notes',
  timestamps: true
})
export default class Note extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  id!: string;

  @ForeignKey(() => Book)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  bookId!: string;

  @BelongsTo(() => Book)
  book!: Book;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  content!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  page?: number;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW
  })
  createdAt!: Date;
} 
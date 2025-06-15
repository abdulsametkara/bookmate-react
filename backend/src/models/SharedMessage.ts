import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import User from './User';
import SharedReading from './SharedReading';

export enum MessageType {
  TEXT = 'TEXT',                    // Metin mesajı
  PAGE_COMMENT = 'PAGE_COMMENT',    // Sayfa yorumu
  QUICK_REACTION = 'QUICK_REACTION', // Hızlı emoji
  QUOTE_SHARE = 'QUOTE_SHARE',      // Alıntı paylaşımı
  CHALLENGE = 'CHALLENGE',          // Meydan okuma
  ACHIEVEMENT = 'ACHIEVEMENT'       // Başarı paylaşımı
}

export enum ReactionType {
  HEART = 'HEART',         // ❤️
  APPLAUSE = 'APPLAUSE',   // 👏
  SURPRISE = 'SURPRISE',   // 😮
  LAUGH = 'LAUGH',         // 😂
  BOOK = 'BOOK',           // 📚
  FIRE = 'FIRE'            // 🔥
}

@Table({
  tableName: 'shared_messages',
  timestamps: true
})
export default class SharedMessage extends Model {
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
  senderId!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  receiverId!: string;

  @ForeignKey(() => SharedReading)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  sharedReadingId?: string;

  @Column({
    type: DataType.ENUM,
    values: Object.values(MessageType),
    allowNull: false
  })
  type!: MessageType;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  content?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  pageNumber?: number; // Sayfa yorumu için

  @Column({
    type: DataType.ENUM,
    values: Object.values(ReactionType),
    allowNull: true
  })
  reaction?: ReactionType;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  metadata!: {
    quote?: string;
    quoteAuthor?: string;
    challengeType?: string;
    achievementType?: string;
    bookTitle?: string;
  };

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isRead!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  readAt?: Date;

  @BelongsTo(() => User, 'senderId')
  sender!: User;

  @BelongsTo(() => User, 'receiverId')
  receiver!: User;

  @BelongsTo(() => SharedReading, 'sharedReadingId')
  sharedReading?: SharedReading;
} 
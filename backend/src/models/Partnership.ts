import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import User from './User';

export enum PartnershipType {
  LOVER = 'LOVER',           // 💕 Sevgili/Eş
  BEST_FRIEND = 'BEST_FRIEND', // 👫 En Yakın Arkadaş
  READING_BUDDY = 'READING_BUDDY', // 📚 Okuma Arkadaşı
  FAMILY = 'FAMILY',         // 👨‍👩‍👧‍👦 Aile Üyesi
  CLASSMATE = 'CLASSMATE'    // 🎓 Okul/Üniversite Arkadaşı
}

export enum PartnershipStatus {
  PENDING = 'PENDING',       // Davet bekliyor
  ACCEPTED = 'ACCEPTED',     // Kabul edildi
  REJECTED = 'REJECTED',     // Reddedildi
  BLOCKED = 'BLOCKED'        // Engellenmiş
}

@Table({
  tableName: 'partnerships',
  timestamps: true
})
export default class Partnership extends Model {
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
  requesterId!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  receiverId!: string;

  @Column({
    type: DataType.ENUM,
    values: Object.values(PartnershipType),
    allowNull: false
  })
  type!: PartnershipType;

  @Column({
    type: DataType.ENUM,
    values: Object.values(PartnershipStatus),
    defaultValue: PartnershipStatus.PENDING
  })
  status!: PartnershipStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  message?: string; // Davet mesajı

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  acceptedAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  rejectedAt?: Date;

  @BelongsTo(() => User, 'requesterId')
  requester!: User;

  @BelongsTo(() => User, 'receiverId')
  receiver!: User;
} 
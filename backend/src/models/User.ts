import { Table, Column, Model, DataType, HasMany, BeforeSave } from 'sequelize-typescript';
import bcrypt from 'bcrypt';
import Book from './Book';

export enum PartnershipStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED'
}

@Table({
  tableName: 'users',
  timestamps: true
})
export default class User extends Model {
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
  displayName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  photoURL?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  partnerId?: string;

  @Column({
    type: DataType.ENUM,
    values: Object.values(PartnershipStatus),
    defaultValue: PartnershipStatus.NONE
  })
  partnershipStatus!: PartnershipStatus;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW
  })
  createdAt!: Date;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW
  })
  lastActive!: Date;

  @HasMany(() => Book)
  books!: Book[];

  // Password şifreleme
  @BeforeSave
  static async hashPassword(instance: User) {
    if (instance.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      instance.password = await bcrypt.hash(instance.password, salt);
    }
  }

  // Password doğrulama
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
} 
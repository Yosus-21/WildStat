import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'Investigadora WildStat' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'nueva@faunalens.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'FaunaLens123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.VIEWER })
  @IsEnum(UserRole)
  role: UserRole;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'investigador@faunalens.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'FaunaLens123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

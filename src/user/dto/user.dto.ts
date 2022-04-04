import { IsNotEmpty, IsString, Length } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @Length(8, 24)
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 24)
  old_password: string;
}

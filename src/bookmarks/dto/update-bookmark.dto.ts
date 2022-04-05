import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateBookmarkDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @IsUrl()
  url?: string;
}

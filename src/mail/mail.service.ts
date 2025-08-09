import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(to: string, link: string) {
    // TODO: integrate with SMTP/API provider. For now, log link.
    this.logger.log(`Verification email to ${to}: ${link}`);
    return true;
  }

  async sendPasswordResetEmail(to: string, link: string) {
    // TODO: integrate with SMTP/API provider. For now, log link.
    this.logger.log(`Password reset email to ${to}: ${link}`);
    return true;
  }
}

